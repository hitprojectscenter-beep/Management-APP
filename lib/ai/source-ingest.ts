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

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

function getApiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY ||
    process.env["GEMINI_API_KEY "] ||
    process.env.GOOGLE_API_KEY ||
    null;
  return k?.trim() || null;
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

/** POST a generateContent call with optional inline_data parts. */
async function geminiGenerate(parts: GeminiPart[], instruction?: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const body: any = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 4096 },
  };
  if (instruction) body.systemInstruction = { parts: [{ text: instruction }] };

  let lastErr: Error | null = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = new Error(`Gemini ${model} ${res.status}: ${text.slice(0, 200)}`);
        console.warn(`[source-ingest] ${model} failed:`, text.slice(0, 100));
        continue;
      }
      const data = await res.json();
      const out = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n");
      if (!out) {
        lastErr = new Error(`Gemini ${model} returned no text`);
        continue;
      }
      return out.trim();
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr ?? new Error("All Gemini models failed");
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

/** Read a DOCX buffer → plain text (paragraphs separated by newlines). */
export async function ingestDocx(buf: Buffer, filename = ""): Promise<IngestResult> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return {
    kind: "docx",
    text: value.trim(),
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
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.files[slidePaths[i]].async("string");
    // Pull every <a:t>…</a:t> text run (handles attributes and self-closing namespaces)
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
    const cleaned = matches
      .map((m) =>
        m
          .replace(/<a:t[^>]*>/, "")
          .replace(/<\/a:t>/, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, "\"")
          .replace(/&apos;/g, "'")
      )
      .filter((s) => s.trim().length > 0)
      .join(" ");
    if (cleaned.trim()) {
      slideTexts.push(`--- Slide ${i + 1} ---\n${cleaned}`);
    }
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
export async function ingestVisual(buf: Buffer, mime: string, filename = ""): Promise<IngestResult> {
  const kind = mime === "application/pdf" ? "pdf" : "image";
  const base64 = buf.toString("base64");
  const instruction =
    "Extract ALL text content from this document/image, preserving line breaks and structure. " +
    "Return only the raw text — no commentary, no markdown formatting. Preserve original language (Hebrew/English/etc).";
  const text = await geminiGenerate(
    [
      { text: kind === "pdf" ? "Document:" : "Image:" },
      { inline_data: { mime_type: mime, data: base64 } },
    ],
    instruction
  );
  // Rough page estimate for PDF based on file size (works for typical text PDFs)
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
    case "audio":
      return ingestAudio(buf, mime, filename);
    default:
      throw new Error(`Unsupported source type: ${mime} (${filename})`);
  }
}
