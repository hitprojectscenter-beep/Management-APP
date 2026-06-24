/**
 * Source ingestion — turn any user-uploaded artifact into plain text
 * suitable for the task extractor.
 *
 * Supported inputs:
 *   • plain text   → returned as-is
 *   • DOCX        → mammoth.extractRawText
 *   • PDF, images → Gemini 2.5 Flash (multimodal — accepts inline_data)
 *   • audio       → Gemini transcription (mp3/wav/m4a/webm/ogg/flac)
 *
 * All Gemini paths share one HTTP helper to keep auth + model-fallback
 * logic in a single place.
 */

import mammoth from "mammoth";
import JSZip from "jszip";
import { getGeminiApiKeys, getGeminiApiKey, isQuotaError, geminiCall, geminiExtractText, geminiGenerateText, probeKeyAvailable } from "./gemini-keys";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

/** First configured key — for one-shot calls (file upload, status polls). */
function getApiKey(): string | null {
  return getGeminiApiKey();
}

/** Categorize a mime type into one of the source-handling buckets. */
export type SourceKind = "text" | "docx" | "pptx" | "pdf" | "image" | "audio" | "unknown";

export function classifyMime(mime: string, filename = ""): SourceKind {
  const m = (mime || "").toLowerCase();
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (m.startsWith("text/") || m === "application/json" || ext === "txt" || ext === "md") return "text";
  if (m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || ext === "docx") return "docx";
  if (m === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || ext === "pptx") return "pptx";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (
    m.startsWith("audio/") ||
    m.startsWith("video/") || // Zoom + Google Meet recordings are video MIMEs even when meant for audio
    ["mp3", "wav", "m4a", "webm", "ogg", "flac", "aac", "mp4", "mov"].includes(ext)
  ) return "audio";
  return "unknown";
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/** POST a generateContent call with optional inline_data parts. Retries
 *  transient 503s and tries every (key × model) combination — a
 *  quota-exhausted model/key rotates to the next before giving up. */
async function geminiGenerate(parts: GeminiPart[], instruction?: string): Promise<string> {
  const body: any = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 4096 },
  };
  if (instruction) body.systemInstruction = { parts: [{ text: instruction }] };
  return geminiGenerateText(body, "source-ingest");
}

export interface IngestResult {
  kind: SourceKind;
  /** Extracted plain text — fed to the task extractor */
  text: string;
  /** Optional source metadata for the UI (page count, duration, etc.) */
  meta: {
    bytes?: number;
    estimatedPages?: number;
    estimatedDurationSec?: number;
    detectedLanguage?: string;
    filename?: string;
    mime?: string;
  };
}

/** Read a DOCX buffer → Markdown (preserves headings, lists, paragraphs). */
export async function ingestDocx(buf: Buffer, filename = ""): Promise<IngestResult> {
  // convertToMarkdown keeps Word's structural cues (headings, bullets,
  // numbered lists, links) so the source-preview reads like the original.
  let text = "";
  try {
    const result = await (mammoth as any).convertToMarkdown({ buffer: buf });
    text = (result.value as string).trim();
  } catch {
    // Fallback to plain text if convertToMarkdown isn't available on this
    // mammoth build.
    const { value } = await mammoth.extractRawText({ buffer: buf });
    text = value.trim();
  }
  return {
    kind: "docx",
    text,
    meta: { bytes: buf.length, filename, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  };
}

/**
 * Read a PPTX buffer → plain text by walking the ZIP, finding every
 * `ppt/slides/slideN.xml`, and pulling text inside `<a:t>` tags.
 * Slides are separated by `\n--- Slide N ---\n`.
 */
export async function ingestPptx(buf: Buffer, filename = ""): Promise<IngestResult> {
  const zip = await JSZip.loadAsync(buf);
  // Sort slide files numerically (slide1.xml, slide2.xml, ... slide10.xml)
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const ai = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
      const bi = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
      return ai - bi;
    });
  const slideTexts: string[] = [];
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'");
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.files[slidePaths[i]].async("string");
    // Pull all <a:p>…</a:p> paragraphs, then within each one the <a:t> runs.
    // Treating each paragraph as a separate line keeps the slide's bullet
    // structure readable.
    const paragraphs = xml.match(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g) || [];
    const lines: string[] = [];
    for (const p of paragraphs) {
      const runs = p.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
      const joined = runs
        .map((m) => decode(m.replace(/<a:t[^>]*>/, "").replace(/<\/a:t>/, "")))
        .join("")
        .trim();
      if (joined) lines.push(joined);
    }
    if (lines.length === 0) continue;
    // First paragraph is conventionally the slide title — promote to ##
    // heading; the rest become bullets so the structure mirrors the deck.
    const [title, ...body] = lines;
    const block = [`## Slide ${i + 1} — ${title}`, ...body.map((l) => `- ${l}`)].join("\n");
    slideTexts.push(block);
  }
  return {
    kind: "pptx",
    text: slideTexts.join("\n\n").trim(),
    meta: {
      bytes: buf.length,
      filename,
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      estimatedPages: slidePaths.length,
    },
  };
}

/** Read PDF / image via Gemini's vision capabilities. */
/**
 * Try to pull text directly from a PDF buffer with pdf-parse. Works for
 * PDFs with selectable text (most modern ones generated by Word/Google
 * Docs/LibreOffice). Returns null for scanned/image-only PDFs and any
 * library error — caller falls back to Gemini OCR in that case.
 *
 * Why this exists: Google's free-tier Gemini quota is ~1500 requests/day
 * shared across the project. A single PDF chunked into several Gemini
 * calls can exhaust it in one user action, after which every subsequent
 * PDF in the day fails with 429. pdf-parse runs in-process with no
 * external quota — solves the common case (text PDFs) entirely.
 */
async function tryPdfParseText(buf: Buffer): Promise<string | null> {
  let parser: { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> } | null = null;
  try {
    // Dynamic import — pdf-parse v2 ships as a class-based API and pulls
    // a heavy pdfjs runtime. Loading only when actually parsing a PDF
    // keeps the cold-start cost off every other intake request.
    const mod: any = await import("pdf-parse");
    const PDFParse = mod.PDFParse;
    if (!PDFParse) return null;
    parser = new PDFParse({ data: buf });
    const result = await parser!.getText();
    const text = (result?.text || "").trim();
    if (text.length < 30) return null; // probably image-only
    return text;
  } catch (err) {
    console.warn("[source-ingest] pdf-parse failed, falling back to Gemini:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
}

export async function ingestVisual(buf: Buffer, mime: string, filename = ""): Promise<IngestResult> {
  const kind = mime === "application/pdf" ? "pdf" : "image";

  // Path A (PDF only): try the Node-side text extractor first. Free,
  // fast, no quota. Skips the Gemini call entirely for digital PDFs.
  if (kind === "pdf") {
    const directText = await tryPdfParseText(buf);
    if (directText) {
      const estimatedPages = Math.max(1, Math.round(buf.length / 50_000));
      return {
        kind: "pdf",
        text: directText,
        meta: { bytes: buf.length, filename, mime, estimatedPages },
      };
    }
  }

  // Path B: Gemini OCR — required for images and scanned/image-only PDFs.
  const base64 = buf.toString("base64");
  const instruction =
    "Extract ALL text from this document or image and return it as faithful Markdown. " +
    "Rules: " +
    "- Use # / ## / ### headings exactly as in the source. " +
    "- Preserve bullet lists (use '- ') and numbered lists (use '1. ', '2. '). " +
    "- Keep paragraph breaks as blank lines. " +
    "- Preserve tables as Markdown tables when present. " +
    "- Do NOT add commentary, summary, or extra prose — only the text from the source. " +
    "- Preserve the original language (Hebrew, English, mixed, etc).";
  const text = await geminiGenerate(
    [
      { text: kind === "pdf" ? "Document:" : "Image:" },
      { inline_data: { mime_type: mime, data: base64 } },
    ],
    instruction
  );
  const estimatedPages = kind === "pdf" ? Math.max(1, Math.round(buf.length / 50_000)) : undefined;
  return {
    kind,
    text,
    meta: { bytes: buf.length, filename, mime, estimatedPages },
  };
}

/** Transcribe an audio buffer with Gemini. */
export async function ingestAudio(buf: Buffer, mime: string, filename = ""): Promise<IngestResult> {
  const base64 = buf.toString("base64");
  const instruction =
    "Transcribe this audio recording word-for-word. Preserve the spoken language (Hebrew/English/Russian/etc). " +
    "Return only the transcript — no timestamps, no speaker labels, no commentary.";
  const text = await geminiGenerate(
    [
      { text: "Audio recording:" },
      { inline_data: { mime_type: mime, data: base64 } },
    ],
    instruction
  );
  // Rough duration estimate from MP3-like byte rates (~16 kB/s for 128 kbps)
  const estimatedDurationSec = Math.round(buf.length / 16_000);
  return {
    kind: "audio",
    text,
    meta: { bytes: buf.length, filename, mime, estimatedDurationSec },
  };
}

/**
 * Transcribe audio that the browser uploaded directly to Gemini Files API
 * via the resumable-upload endpoint. We reference the file by URI instead
 * of streaming the bytes through our serverless function — bypasses the
 * Vercel 4.5 MB inbound body cap.
 */
export async function ingestAudioByUri(
  fileUri: string,
  mime: string,
  filename = "",
  fileSizeBytes = 0,
  /** The key the file was uploaded with. Files API files are scoped to
   *  the uploading key, so transcription MUST use the same one (we don't
   *  rotate keys here — the dispatcher re-uploads with the next key on a
   *  quota error). */
  uploadKey?: string,
): Promise<IngestResult> {
  const apiKey = uploadKey || getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  // The file is in PROCESSING state right after upload — wait for ACTIVE
  // before asking Gemini to transcribe. Large videos can take >30 s to
  // process server-side; the logs showed a 400 "not in ACTIVE state"
  // when we gave up too early, so allow up to 90 s.
  await waitForFileActive(fileUri, apiKey, 90_000);

  const instruction =
    "Transcribe this audio recording word-for-word. Preserve the spoken language (Hebrew/English/Russian/etc). " +
    "Return only the transcript — no timestamps, no speaker labels, no commentary.";

  // file_data parts use a different schema from inline_data, so we hand-roll
  // the model-fallback loop here instead of reusing geminiGenerate().
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Audio recording:" },
          { file_data: { mime_type: mime, file_uri: fileUri } },
        ],
      },
    ],
    systemInstruction: { parts: [{ text: instruction }] },
    generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 8192 },
  };

  // The file is scoped to `apiKey`, so we DON'T rotate keys here (the
  // dispatcher re-uploads with the next key on quota). But we still try
  // all models and retry transient 503s via geminiCall.
  let lastErr: Error | null = null;
  for (const model of GEMINI_MODELS) {
    const r = await geminiCall(model, apiKey, body);
    if (r.ok) {
      const text = geminiExtractText(r.data);
      if (!text) { lastErr = new Error(`Gemini ${model} returned no transcript text`); continue; }
      void deleteGeminiFile(fileUri, apiKey).catch(() => {}); // auto-expires in 48h anyway
      const estimatedDurationSec = fileSizeBytes ? Math.round(fileSizeBytes / 16_000) : undefined;
      return { kind: "audio", text, meta: { bytes: fileSizeBytes, filename, mime, estimatedDurationSec } };
    }
    lastErr = new Error(`Gemini ${model} ${r.status}: ${(r.errText || "").slice(0, 200)}`);
    console.warn(`[ingestAudioByUri] ${model} failed (${r.status}):`, (r.errText || "").slice(0, 120));
    // If THIS model is quota-exhausted, the others under the same key
    // likely are too, but they're cheap 429s — keep trying. The caller
    // rotates keys if all models fail.
  }
  throw lastErr ?? new Error("All Gemini models failed transcription");
}

/**
 * Upload a buffer to Gemini's Files API using the resumable upload
 * protocol. Returns the file URI you can then reference in a
 * generateContent call via `file_data: { file_uri, mime_type }`.
 *
 * Why this exists: ingestAudio's inline_data path serializes the file
 * as base64 inside a JSON body. For a 200 MB recording that means a
 * ~270 MB JSON request, which kills Vercel's memory and Gemini's
 * inline-payload cap (~20 MB). Files API has a 2 GB per-file limit and
 * uses raw binary upload, so it scales properly to real meeting
 * recordings.
 */
export async function uploadBufferToGeminiFiles(
  buf: Buffer,
  mime: string,
  filename: string,
  apiKey: string
): Promise<string> {
  // 1. Start resumable upload session — Google replies with X-Goog-Upload-URL.
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(buf.length),
        "X-Goog-Upload-Header-Content-Type": mime,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: filename || "upload" } }),
    }
  );
  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => "");
    throw new Error(`Gemini Files API start ${startRes.status}: ${errText.slice(0, 200)}`);
  }
  const uploadUrl = startRes.headers.get("x-goog-upload-url") || startRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) throw new Error("Gemini Files API didn't return X-Goog-Upload-URL");

  // 2. PUT the raw bytes in a single request. Resumable mode requires
  //    non-final chunks to be multiples of 8 MB, but the FINAL chunk
  //    can be any size — we send the whole file as one final chunk.
  // Node's undici fetch accepts Buffer as a body at runtime, but TS's
  // strict ArrayBufferLike vs ArrayBuffer narrowing rejects it. Wrap in
  // a Blob over a fresh ArrayBuffer copy — TS-clean and works identically
  // on the wire (Blob ctor accepts the slice, then fetch reads it back).
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(buf.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Blob([ab], { type: mime || "application/octet-stream" }),
  });
  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => "");
    throw new Error(`Gemini Files API upload ${putRes.status}: ${errText.slice(0, 200)}`);
  }
  const data = await putRes.json().catch(() => ({}));
  const fileUri = data?.file?.uri;
  if (!fileUri) throw new Error("Gemini Files API upload didn't return file.uri");
  return fileUri;
}

async function waitForFileActive(fileUri: string, apiKey: string, timeoutMs: number): Promise<void> {
  const metaUrl = `${fileUri}?key=${apiKey}`;
  const start = Date.now();
  let backoff = 500;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(metaUrl);
      if (res.ok) {
        const meta = await res.json().catch(() => ({}));
        const state = meta?.state || "UNKNOWN";
        if (state === "ACTIVE") return;
        if (state === "FAILED") throw new Error(`Gemini file processing failed: ${meta.error?.message || "unknown"}`);
      }
    } catch {
      // transient
    }
    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(backoff * 1.5, 3000);
  }
  // Don't throw on timeout — generateContent will surface the real error
}

async function deleteGeminiFile(fileUri: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${fileUri}?key=${apiKey}`, { method: "DELETE" });
  } catch {
    // ignore — file auto-expires anyway
  }
}

/**
 * Inline_data has a practical ceiling around ~20 MB (Gemini doc cap +
 * JSON ballooning). Anything bigger goes via Files API so the
 * payload doesn't kill the function.
 */
const INLINE_AUDIO_MAX_BYTES = 15 * 1024 * 1024;

/** Dispatcher: pick the right ingest path by mime type. */
export async function ingest(buf: Buffer, mime: string, filename = ""): Promise<IngestResult> {
  const kind = classifyMime(mime, filename);
  switch (kind) {
    case "text":
      return {
        kind,
        text: buf.toString("utf-8"),
        meta: { bytes: buf.length, filename, mime },
      };
    case "docx":
      return ingestDocx(buf, filename);
    case "pptx":
      return ingestPptx(buf, filename);
    case "pdf":
    case "image":
      return ingestVisual(buf, mime, filename);
    case "audio": {
      // Small clips can ride inline_data — one HTTP call, simplest path.
      // geminiGenerate already rotates across keys.
      if (buf.length <= INLINE_AUDIO_MAX_BYTES) {
        return ingestAudio(buf, mime, filename);
      }
      // Larger recordings: upload to Files API and reference by URI. This
      // is the ONLY way a 200 MB Zoom recording can reach Gemini without
      // blowing through Vercel's memory and Gemini's inline cap.
      //
      // Files API files are scoped to the uploading key, so to use a
      // BACKUP key we must re-upload. We rotate keys here: try upload +
      // transcribe with key #1; on a quota error, re-upload with key #2,
      // etc. This is what lets a second free key rescue a video import
      // when the first key's daily quota is spent.
      const keys = getGeminiApiKeys();
      if (keys.length === 0) throw new Error("GEMINI_API_KEY not set");
      let lastErr: Error | null = null;
      for (let k = 0; k < keys.length; k++) {
        // Cheap probe FIRST — don't waste a 200 MB upload on a key whose
        // quota is already spent. (Bug from the logs: we were re-uploading
        // the whole video to every exhausted key, ~2 min of dead work.)
        const available = await probeKeyAvailable(keys[k]);
        if (!available) {
          lastErr = new Error(`Gemini key#${k + 1} quota exhausted`);
          console.warn(`[ingest] key#${k + 1} probe: quota exhausted — skipping video upload`);
          continue;
        }
        try {
          const fileUri = await uploadBufferToGeminiFiles(buf, mime, filename, keys[k]);
          return await ingestAudioByUri(fileUri, mime, filename, buf.length, keys[k]);
        } catch (err) {
          lastErr = err as Error;
          const msg = lastErr.message || "";
          if (isQuotaError(/\b429\b/.test(msg) ? 429 : 0, msg) && k < keys.length - 1) {
            console.warn(`[ingest] key#${k + 1} quota-exhausted on video; retrying with key#${k + 2}`);
            continue;
          }
          throw lastErr;
        }
      }
      throw lastErr ?? new Error("All Gemini keys failed video transcription");
    }
    default:
      throw new Error(`Unsupported source type: ${mime} (${filename})`);
  }
}
