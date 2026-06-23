"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { upload as blobUpload } from "@vercel/blob/client";
import { decodeAndChunkAudio, type AudioChunk } from "@/components/intake/audio-chunker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText,
  FileUp,
  Mic,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trash2,
  FileIcon,
  Image as ImageIcon,
  Volume2,
  ArrowRight,
  Plus,
  Pencil,
} from "lucide-react";
import { txt } from "@/lib/utils/locale-text";
import { cn, formatDateDDMMYYYY } from "@/lib/utils";
import { mockUsers, mockWbsNodes, mockTasks, type MockTaskAttachment } from "@/lib/db/mock-data";
import { pickResponsible } from "@/lib/ai/role-hierarchy";
import { AddTaskDialog, type AddTaskInitialValues } from "@/components/landing/add-task-dialog";
import { LinkGuideDialog } from "@/components/intake/link-guide-dialog";

interface ExtractedTask {
  title: string;
  description?: string;
  assigneeHint?: string;
  dueDate?: string;
  estimateHours?: number;
  workTypeLabel?: string;
  confidence: number;
}

interface IntakeMeta {
  bytes?: number;
  filename?: string;
  mime?: string;
  estimatedPages?: number;
  estimatedDurationSec?: number;
}

interface IntakeResponse {
  kind: "text" | "docx" | "pptx" | "pdf" | "image" | "audio";
  sourceText: string;
  tasks: ExtractedTask[];
  count: number;
  /** Date detected in the document header (ISO YYYY-MM-DD) — used as the
   *  default plannedStart for every extracted task. */
  documentDate?: string;
  /** Title detected in the document — used as the source label. */
  documentTitle?: string;
  meta: IntakeMeta;
}

type Mode = "file" | "text" | "audio" | "url";

function fmtBytes(n: number | undefined): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDuration(s: number | undefined): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function kindIcon(kind: IntakeResponse["kind"]) {
  switch (kind) {
    case "pdf": case "docx": case "pptx": return FileIcon;
    case "image": return ImageIcon;
    case "audio": return Volume2;
    default: return FileText;
  }
}

/**
 * Read /api/intake's response robustly.
 *
 * The previous code did `await res.json()` blindly — but a large upload
 * never reaches our handler. The hosting platform (Vercel) and Next.js's
 * dev server both reject oversized request bodies at the proxy layer
 * with a plain-text response like `"Request Entity Too Large"`. JSON.parse
 * on that text throws `"Unexpected token 'R', \"Request En\"... is not
 * valid JSON"`, which is what the user was seeing. This helper:
 *
 *   1. Reads the body as text first (always succeeds).
 *   2. Tries JSON.parse; on success returns the typed object.
 *   3. On JSON-parse failure, returns the raw text snippet so the user
 *      sees the actual server/proxy message.
 *   4. Maps HTTP 413 to a localized "file too big for the server"
 *      message — useful even if the response did happen to be JSON.
 */
async function readIntakeResponse(
  res: Response,
  locale: string
): Promise<{ ok: true; data: IntakeResponse } | { ok: false; message: string }> {
  const raw = await res.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // not JSON — leave parsed null, raw still holds the text body
  }

  if (res.ok && parsed && typeof parsed === "object") {
    return { ok: true, data: parsed as IntakeResponse };
  }

  // Build a user-facing error message that is actually informative.
  if (res.status === 413) {
    return {
      ok: false,
      message: txt(locale, {
        he: "הקובץ גדול מהתקרה של Vercel (~4.5MB). הדרך הקלה: העלה את הקובץ ל-Google Drive / Dropbox, שתף עם 'כל מי שיש לו את הקישור', ובחר במצב 'קישור' והדבק. השרת מושך את הקובץ ישירות, ללא תקרת העלאה.",
        en: "File exceeds Vercel's ~4.5MB cap. Easiest fix: upload to Google Drive or Dropbox, set 'Anyone with the link', then use the 'Link' mode and paste the URL. The server fetches it directly — no upload limit.",
      }) as string,
    };
  }

  if (parsed && typeof parsed === "object" && typeof parsed.error === "string") {
    return { ok: false, message: parsed.error };
  }

  // Non-JSON error body (typical for platform-level rejections). Surface
  // a short snippet of what the server actually said so the user can
  // recognize "Request Entity Too Large" / "Bad Gateway" / "Timeout" etc.
  const snippet = (raw || "").trim().slice(0, 200) || `HTTP ${res.status}`;
  return {
    ok: false,
    message: `HTTP ${res.status} — ${snippet}`,
  };
}

function isAudioOrVideo(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t.startsWith("audio/") || t.startsWith("video/")) return true;
  // Some browsers don't set type for files dragged from finder — fall back
  // to extension.
  const ext = file.name.toLowerCase().split(".").pop() || "";
  return ["mp3", "wav", "m4a", "webm", "ogg", "flac", "aac", "mp4", "mov", "mkv"].includes(ext);
}

/**
 * Transcribe an audio/video file by decoding + chunking in the BROWSER,
 * then transcribing each ~3.8 MB WAV chunk through plain multipart
 * (which fits under Vercel's 4.5 MB inbound body cap).
 *
 * Returns the concatenated transcript text — caller is responsible
 * for then running task extraction on it.
 */
async function transcribeAudioInChunks(
  file: File,
  locale: string,
  onProgress?: (done: number, total: number, label: string) => void
): Promise<{ transcript: string; meta: { bytes: number; estimatedDurationSec?: number } }> {
  // Decode + chunk locally. The browser does all the heavy resampling.
  onProgress?.(0, 1, "decoding");
  const chunks = await decodeAndChunkAudio(file);
  if (chunks.length === 0) throw new Error("No audio chunks produced");

  // Transcribe each chunk via the existing /api/intake multipart path.
  // Each chunk is a complete WAV file < 4 MB so multipart works.
  const transcripts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i, chunks.length, "transcribing");
    const chunk = chunks[i];
    const fd = new FormData();
    fd.append("file", chunk.blob, `chunk-${i + 1}.wav`);
    fd.append("locale", locale);
    const res = await fetch("/api/intake", { method: "POST", body: fd });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Chunk ${i + 1}/${chunks.length} failed: HTTP ${res.status} ${errText.slice(0, 120)}`);
    }
    const data = await res.json();
    const text = typeof data?.sourceText === "string" ? data.sourceText.trim() : "";
    if (text) transcripts.push(text);
  }
  onProgress?.(chunks.length, chunks.length, "done");

  const totalDurationSec = chunks.length ? chunks[chunks.length - 1].endSec : 0;
  return {
    transcript: transcripts.join("\n\n"),
    meta: { bytes: file.size, estimatedDurationSec: Math.round(totalDurationSec) },
  };
}

/**
 * Legacy: upload audio file to Gemini Files API via chunked resumable upload.
 * Kept around but unused — Gemini's 8 MB chunk-granularity requirement
 * exceeds Vercel's 4.5 MB body cap, so this never worked in production.
 * See transcribeAudioInChunks above for the actual working path.
 *
 * Why chunked-via-server: Google's `generativelanguage.googleapis.com`
 * upload endpoint does NOT respond with CORS headers, so the browser
 * cannot PUT the file directly to it. We instead split the file into
 * 3.5 MB chunks (under Vercel's ~4.5 MB inbound cap) and POST each to
 * /api/intake/gemini-chunk, which proxies the bytes onward to Google
 * over an outbound fetch (no CORS, no Vercel cap on outbound).
 *
 * Flow:
 *   1. POST {filename, mime, size} → /api/intake/gemini-upload-url
 *      Returns a resumable-session URL.
 *   2. Slice the file into ~3.5 MB chunks. For each:
 *        - POST chunk + uploadUrl + offset + isFinal → /api/intake/gemini-chunk
 *        - Wait for ack before sending the next (Gemini's resumable
 *          protocol expects sequential offsets).
 *   3. The final chunk response includes {fileUri}.
 *   4. Return that URI to the caller.
 */
async function uploadAudioToGemini(
  file: File,
  onProgress?: (uploaded: number, total: number) => void
): Promise<string> {
  // Step 1: init session
  const initRes = await fetch("/api/intake/gemini-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mime: file.type || "audio/mpeg",
      size: file.size,
    }),
  });
  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => "");
    throw new Error(`gemini-upload-url ${initRes.status}: ${errText.slice(0, 200)}`);
  }
  const { uploadUrl } = (await initRes.json()) as { uploadUrl: string };
  if (!uploadUrl) throw new Error("No upload URL from server");

  // Step 2: send the file in 3.5 MB chunks. We could parallelize but
  // Google's resumable protocol is happier with sequential offsets, and
  // the simpler code is easier to reason about.
  const CHUNK_SIZE = 3_500_000; // 3.5 MB — safely under Vercel's 4.5 MB inbound cap
  let offset = 0;
  let fileUri: string | null = null;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, end);
    const isFinal = end >= file.size;

    const fd = new FormData();
    fd.append("chunk", chunk, "chunk.bin");
    fd.append("uploadUrl", uploadUrl);
    fd.append("offset", String(offset));
    fd.append("isFinal", isFinal ? "1" : "0");

    const chunkRes = await fetch("/api/intake/gemini-chunk", {
      method: "POST",
      body: fd,
    });
    if (!chunkRes.ok) {
      const errText = await chunkRes.text().catch(() => "");
      throw new Error(
        `gemini-chunk ${chunkRes.status} at offset ${offset}: ${errText.slice(0, 200)}`
      );
    }
    const body = (await chunkRes.json()) as { ok?: boolean; fileUri?: string };
    if (isFinal) {
      if (!body.fileUri) throw new Error("Final chunk uploaded but no file URI returned");
      fileUri = body.fileUri;
    }
    offset = end;
    onProgress?.(offset, file.size);
  }

  if (!fileUri) throw new Error("Chunked upload completed without a file URI");
  return fileUri;
}

/**
 * Translate a raw error into something the user can act on. The most
 * common failure mode the operator was hitting was Gemini's free-tier
 * quota — and the previous version surfaced the raw JSON
 * ("Gemini gemini-2.0-flash 429: {...}") which neither said WHAT the
 * problem was nor WHAT the operator can do about it. This function
 * detects 429 / quota / RESOURCE_EXHAUSTED markers and replaces them
 * with a localized, actionable message.
 */
function formatIntakeError(err: unknown, locale: string): string {
  const raw = err instanceof Error ? err.message : String(err || "");
  const isQuota = /\b429\b|quota|RESOURCE_EXHAUSTED|exceeded.*quota/i.test(raw);
  if (isQuota) {
    return locale === "en"
      ? "⚠️ Gemini daily free-tier quota exhausted. The PDF extractor will retry with the local text parser when possible; for image-only PDFs or other AI features, either wait until tomorrow (Pacific midnight) or set a new GEMINI_API_KEY in Vercel Environment Variables."
      : "⚠️ מכסת ה-Free Tier היומית של Gemini התמלאה. עבור PDF דיגיטלי המערכת תנסה לחלץ מקומית; עבור PDF סרוק או שירותי AI אחרים — חכה לאיפוס המכסה (חצות לפי שעון פסיפי) או הגדר GEMINI_API_KEY חדש ב-Vercel Environment Variables.";
  }
  // Generic error — keep the original message so debugging is still possible.
  const prefix = locale === "en" ? "Processing failed" : "כשל בעיבוד";
  return `${prefix}: ${raw || "unknown error"}`;
}

export function IntakeWorkflow() {
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("file");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Keep the original uploaded File so we can pre-attach it to every task
  // created from this source. Cleared whenever the user resets.
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  // Live upload progress for the chunked-Gemini path. Null when no upload
  // is in flight. The chunked path can take 30-180s for a long recording —
  // showing progress turns "is it stuck?" anxiety into "I see it moving".
  const [uploadProgress, setUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);

  // Persistent error banner — toast messages disappear after a few seconds
  // and the user is left wondering what happened. We mirror the toast into
  // an in-page banner so the user can read the actual server error any time.
  const [persistentError, setPersistentError] = useState<string | null>(null);
  const showError = (msg: string) => {
    setPersistentError(msg);
    toast.error(msg);
  };

  // Pre-flight capability probe: ask the server which upload paths are
  // wired up BEFORE the user picks a file. Lets us show realistic guidance
  // instead of letting an upload fail.
  const [capabilities, setCapabilities] = useState<{
    audioUploadWorks: boolean;
    largeFileWorks: boolean;
    smallFileWorks: boolean;
    geminiAvailable: boolean;
    blobAvailable: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/intake/capabilities");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCapabilities({
          audioUploadWorks: !!data?.summary?.audioUploadWorks,
          largeFileWorks: !!data?.summary?.largeFileWorks,
          smallFileWorks: !!data?.summary?.smallFileWorks,
          geminiAvailable: !!data?.paths?.geminiDirectUpload?.available,
          blobAvailable: !!data?.paths?.vercelBlob?.available,
        });
      } catch {
        // ignore — capabilities panel just won't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Upload a file via Vercel Blob direct-upload, then POST the blob URL
   * to /api/intake for processing. Falls back to direct multipart upload
   * if Vercel Blob isn't configured (e.g. local dev without a token,
   * or a deployment without a Blob store attached).
   *
   * Why two paths:
   *  • Vercel serverless functions cap request bodies at ~4.5 MB. A 200 MB
   *    audio file via multipart will 413 at the platform layer before our
   *    handler runs. Direct blob upload bypasses that cap entirely — the
   *    client uploads straight to blob storage; our function only sees a
   *    small JSON ref.
   *  • In local dev there's no 4.5 MB cap and Blob may not be set up, so
   *    we keep the multipart path as a fallback.
   */
  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 300 * 1024 * 1024) {
      showError(txt(locale, { he: "קובץ גדול מ-300MB", en: "File over 300 MB" }) as string);
      return;
    }
    setLoading(true);
    setResult(null);
    setPersistentError(null);
    setSourceFile(file);
    try {
      // Three-tier upload strategy:
      //   1. Audio/video > 3 MB → upload DIRECTLY to Gemini Files API.
      //      Bytes never touch Vercel. Bypasses the 4.5 MB inbound cap
      //      completely and needs zero extra config (just GEMINI_API_KEY,
      //      which is already required for transcription anyway).
      //   2. Non-audio files > 3 MB → try Vercel Blob direct upload.
      //      Same bypass, but requires BLOB_READ_WRITE_TOKEN on the project.
      //   3. Everything else → plain multipart. Works for files < 4.5 MB
      //      on Vercel and any size in local dev.
      const SIZE_THRESHOLD = 3 * 1024 * 1024;
      const isMedia = isAudioOrVideo(file);

      let parsed:
        | { ok: true; data: IntakeResponse }
        | { ok: false; message: string }
        | null = null;

      // ── Path A: audio/video → client-side decode + chunk + transcribe ────
      // The browser does the heavy lifting: decodes the audio, resamples
      // to 16 kHz mono, slices into ~2-minute WAV chunks (~3.8 MB each),
      // and uploads each through plain multipart (fits under Vercel's
      // 4.5 MB cap). Each chunk is transcribed independently; we then
      // glue the transcripts together and run task extraction on the
      // combined text. No external storage, no Vercel config needed.
      if (isMedia && file.size > SIZE_THRESHOLD) {
        try {
          setUploadProgress({ uploaded: 0, total: file.size });
          const { transcript, meta: audioMeta } = await transcribeAudioInChunks(
            file,
            locale,
            (done, total) => setUploadProgress({ uploaded: done, total })
          );
          setUploadProgress(null);
          // Run task extraction on the joined transcript via text mode
          const res = await fetch("/api/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: transcript, locale }),
          });
          parsed = await readIntakeResponse(res, locale);
          // Patch the meta so the UI shows the original audio file info,
          // not the text-extraction info, in the source preview card.
          if (parsed.ok) {
            parsed.data = {
              ...parsed.data,
              kind: "audio",
              sourceText: transcript,
              meta: {
                ...(parsed.data.meta || {}),
                bytes: audioMeta.bytes,
                filename: file.name,
                mime: file.type || "audio/mpeg",
                estimatedDurationSec: audioMeta.estimatedDurationSec,
              },
            };
          }
        } catch (audioErr) {
          setUploadProgress(null);
          console.warn("[intake] client-side audio chunked transcription failed, trying next path:", audioErr);
        }
      }

      // ── Path B: Vercel Blob direct upload (any large file) ─────────
      if (!parsed && file.size > SIZE_THRESHOLD) {
        try {
          const ts = Date.now();
          const blob = await blobUpload(`intake/${ts}-${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/intake/upload-token",
            clientPayload: locale,
          });
          const res = await fetch("/api/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: blob.url,
              blobMime: file.type,
              blobFilename: file.name,
              locale,
            }),
          });
          parsed = await readIntakeResponse(res, locale);
        } catch (blobErr) {
          console.warn("[intake] blob upload failed, falling back to multipart:", blobErr);
        }
      }

      // ── Path C: plain multipart (small files / local dev) ──────────
      if (!parsed) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("locale", locale);
        const res = await fetch("/api/intake", { method: "POST", body: fd });
        parsed = await readIntakeResponse(res, locale);
      }

      if (!parsed.ok) throw new Error(parsed.message);
      setResult(parsed.data);
      setSelected(new Set(parsed.data.tasks.map((_, i) => i)));
      toast.success(
        txt(locale, {
          he: `זוהו ${parsed.data.count} משימות מתוך ${file.name}`,
          en: `Found ${parsed.data.count} tasks in ${file.name}`,
        })
      );
    } catch (err) {
      showError(formatIntakeError(err, locale));
    } finally {
      setLoading(false);
      // Reset the file input value so the user can pick the SAME file
      // again (the browser fires onChange only when the value changes;
      // without this, after a 429 the user clicks "choose file", picks
      // the same PDF, and nothing happens — appears broken).
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  const handleText = async () => {
    if (!textInput.trim()) {
      showError(txt(locale, { he: "הדבק טקסט תחילה", en: "Paste text first" }) as string);
      return;
    }
    setLoading(true);
    setResult(null);
    setPersistentError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput, locale }),
      });
      const parsed = await readIntakeResponse(res, locale);
      if (!parsed.ok) throw new Error(parsed.message);
      setResult(parsed.data);
      setSelected(new Set(parsed.data.tasks.map((_, i) => i)));
      toast.success(
        txt(locale, {
          he: `זוהו ${parsed.data.count} משימות`,
          en: `Found ${parsed.data.count} tasks`,
        })
      );
    } catch (err) {
      showError(formatIntakeError(err, locale));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Public URL path — user pastes a Google Drive / Dropbox / SharePoint
   * link, the server fetches the file directly. This bypasses Vercel's
   * 4.5MB serverless body cap entirely, with ZERO config required.
   */
  const handleUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      showError(txt(locale, { he: "הדבק קישור תחילה", en: "Paste a URL first" }) as string);
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      showError(txt(locale, { he: "הקישור חייב להתחיל ב-http:// או https://", en: "URL must start with http:// or https://" }) as string);
      return;
    }
    setLoading(true);
    setResult(null);
    setPersistentError(null);
    setSourceFile(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: trimmed, locale }),
      });
      const parsed = await readIntakeResponse(res, locale);
      if (!parsed.ok) throw new Error(parsed.message);
      setResult(parsed.data);
      setSelected(new Set(parsed.data.tasks.map((_, i) => i)));
      toast.success(
        txt(locale, {
          he: `זוהו ${parsed.data.count} משימות מהקישור`,
          en: `Found ${parsed.data.count} tasks from the URL`,
        })
      );
    } catch (err) {
      showError(formatIntakeError(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const removeTask = (i: number) => {
    if (!result) return;
    const tasks = result.tasks.filter((_, idx) => idx !== i);
    setResult({ ...result, tasks, count: tasks.length });
    setSelected(new Set(tasks.map((_, idx) => idx)));
  };

  const handleCreateSelected = () => {
    if (!result) return;
    if (selected.size === 0) {
      toast.error(txt(locale, { he: "בחר משימה אחת לפחות", en: "Select at least one task" }));
      return;
    }

    // Build the source-attachment record once. Every task created in this
    // batch gets the SAME attachment metadata so we can always trace the
    // task back to the original document/audio/text. The blobUrl is set
    // only if we have an in-memory File (which we wrap into an
    // object URL just for download links).
    let sharedAttachment: MockTaskAttachment | null = null;
    if (sourceFile) {
      // URL.createObjectURL gives us a same-origin URL the user can click
      // to download the original file later in the session.
      let blobUrl: string | undefined;
      try {
        blobUrl = URL.createObjectURL(sourceFile);
      } catch {
        // SSR or sandboxed iframes may not have URL.createObjectURL — fine
      }
      sharedAttachment = {
        name: sourceFile.name,
        size: sourceFile.size,
        type: sourceFile.type || "application/octet-stream",
        blobUrl,
        // Source = filename · dd/mm/yyyy. We deliberately don't use
        // documentTitle here because for audio transcripts it's the
        // first sentence of speech, not a meaningful provenance string.
        source: result.documentDate
          ? `${sourceFile.name} · ${formatDateDDMMYYYY(result.documentDate)}`
          : sourceFile.name,
      };
    } else if (result.kind === "text" && result.documentTitle) {
      // For pasted-text intake there's no file, but we still record the
      // document title + date as the provenance string.
      sharedAttachment = {
        name: result.documentTitle.slice(0, 80),
        size: result.sourceText.length,
        type: "text/plain",
        source: result.documentDate
          ? `${result.documentTitle} · ${formatDateDDMMYYYY(result.documentDate)}`
          : result.documentTitle,
      };
    }

    // Mutate mockTasks so the new tasks show up on /tasks. In production
    // this is where we'd POST to /api/tasks; here we keep parity with how
    // the rest of the demo handles task creation.
    const autoFallback = pickResponsible(mockUsers, { excludeCEO: true });
    const wbsLeaf = mockWbsNodes.find((n) => n.level === "task")?.id
      ?? mockWbsNodes[0]?.id
      ?? "root";
    const startStamp = Date.now();

    let createdCount = 0;
    Array.from(selected)
      .sort((a, b) => a - b)
      .forEach((idx, i) => {
        const t = result.tasks[idx];
        if (!t) return;
        const resolved = resolveAssignee(t.assigneeHint) || autoFallback?.user;
        mockTasks.push({
          id: `intake-${startStamp}-${i}`,
          wbsNodeId: wbsLeaf,
          parentTaskId: null,
          title: t.title,
          description: t.description,
          status: "not_started",
          priority: "medium",
          assigneeId: resolved?.id ?? null,
          plannedStart: result.documentDate || new Date().toISOString().slice(0, 10),
          plannedEnd: t.dueDate || result.documentDate || new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
          actualStart: null,
          actualEnd: null,
          estimateHours: t.estimateHours ?? 4,
          actualHours: 0,
          progressPercent: 0,
          tags: t.workTypeLabel ? [t.workTypeLabel] : [],
          dependencies: [],
          attachments: sharedAttachment ? [sharedAttachment] : undefined,
        });
        createdCount++;
      });

    toast.success(
      txt(locale, {
        he: `נוצרו ${createdCount} משימות`,
        en: `${createdCount} tasks created`,
      }),
      {
        description: sharedAttachment
          ? (txt(locale, {
              he: `הקובץ "${sharedAttachment.name}" מצורף לכל אחת מהמשימות.`,
              en: `Source file "${sharedAttachment.name}" attached to each task.`,
            }) as string)
          : (txt(locale, {
              he: "במצב הדגמה — נשמר ב-mockTasks בלבד עד חיבור DB.",
              en: "Demo mode — saved to mockTasks only until DB is wired.",
            }) as string),
      }
    );
    setResult(null);
    setSelected(new Set());
    setTextInput("");
    setSourceFile(null);
  };

  const reset = () => {
    setResult(null);
    setSelected(new Set());
    setTextInput("");
    setSourceFile(null);
    setPersistentError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Capability badge — shows BEFORE the user picks a file so the
       *  guidance matches what's actually available on this deployment. */}
      {capabilities && !result && <CapabilityStatusBadge caps={capabilities} locale={locale} />}

      {/* Persistent error banner — toast disappears in seconds; this stays
       *  until the next attempt so the user can actually read what went wrong. */}
      {persistentError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-300 bg-red-50/60 dark:bg-red-950/20 text-sm">
          <span className="text-red-600 text-xl leading-none">⚠</span>
          <div className="flex-1">
            <div className="font-medium text-red-900 dark:text-red-100">
              {txt(locale, { he: "כשל בעיבוד הקלט", en: "Intake error" })}
            </div>
            <div className="text-red-800/90 dark:text-red-200/90 mt-1 break-words" dir="auto">
              {persistentError}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPersistentError(null)}
            className="text-red-700 hover:text-red-900 text-xs underline shrink-0"
          >
            {txt(locale, { he: "סגור", en: "Dismiss" })}
          </button>
        </div>
      )}

      {/* Mode selector */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-violet-600" />
              {txt(locale, { he: "בחר מקור לייבוא", en: "Choose source to import" })}
            </CardTitle>
            <CardDescription>
              {txt(locale, {
                he: "ה-AI יחלץ את כל המשימות מהמקור, יעריך מאמץ, וימצא את האחראי לפי בכירות (חוץ מהמנכ\"ל).",
                en: "AI extracts every task, estimates effort, and suggests the most senior responsible (excluding the CEO).",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setMode("file")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "file"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <FileUp className="size-8 text-violet-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "קובץ (PDF / Word / PowerPoint / תמונה)", en: "Document (PDF / Word / PowerPoint / Image)" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, { he: "סיכום פגישה, מסמך אפיון, מצגת — עד 300MB", en: "Meeting summary, spec, slide deck — up to 300 MB" })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("text")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "text"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <FileText className="size-8 text-blue-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "הדבק טקסט", en: "Paste text" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, { he: "סיכום חופשי, מייל, פרוטוקול — עד 50,000 תווים", en: "Free text, email, minutes — up to 50,000 chars" })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("audio")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "audio"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <Mic className="size-8 text-emerald-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "הקלטת שמע", en: "Audio recording" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, { he: "Zoom / Meet — MP3/WAV/M4A/MP4 · עד 300MB", en: "Zoom / Meet — MP3/WAV/M4A/MP4 · up to 300 MB" })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("url")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "url"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <FileIcon className="size-8 text-amber-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "קישור (Drive / Dropbox)", en: "Link (Drive / Dropbox)" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, {
                    he: "הדבק קישור ציבורי. השרת מושך את הקובץ — לא חסום ע\"י תקרת ההעלאה.",
                    en: "Paste a public link. Server fetches it — no upload-size cap.",
                  })}
                </span>
              </button>
            </div>

            <div className="mt-5">
              {mode === "file" && (
                <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-muted/20">
                  <FileUp className="size-12 text-muted-foreground" />
                  <p className="text-sm text-center text-muted-foreground">
                    {txt(locale, {
                      he: "גרור קובץ לכאן או לחץ לבחירה",
                      en: "Drop a file here or click to select",
                    })}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    {loading ? (<><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מעבד...", en: "Processing..." })}</>) : (<><FileUp className="size-4" />{txt(locale, { he: "בחר קובץ", en: "Choose file" })}</>)}
                  </Button>
                </div>
              )}

              {mode === "text" && (
                <div className="space-y-2">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={txt(locale, {
                      he: "לדוגמה: בסיכום הפגישה הוחלט שאלעד יכין מצגת לדירקטוריון עד יום חמישי. ניר יכתוב מסמך אפיון. אסתר תסכם את הישיבה ותשלח עד מחר...",
                      en: "Example: Meeting summary — Elad to prepare a board deck by Thursday. Nir to write the spec. Esther to summarize the meeting and send by tomorrow...",
                    })}
                    className="w-full min-h-[180px] bg-muted/30 border rounded-lg p-3 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ fontSize: "16px" }}
                    disabled={loading}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{textInput.length.toLocaleString()} / 50,000</span>
                    <Button onClick={handleText} disabled={loading || !textInput.trim()}>
                      {loading ? (<><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מעבד...", en: "Processing..." })}</>) : (<><Sparkles className="size-4" />{txt(locale, { he: "חלץ משימות", en: "Extract tasks" })}</>)}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "audio" && (
                <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-muted/20">
                  <Mic className="size-12 text-emerald-600" />
                  <p className="text-sm text-center text-muted-foreground">
                    {txt(locale, {
                      he: "העלה קובץ שמע — Gemini יתמלל וייצא משימות",
                      en: "Upload audio — Gemini will transcribe and extract tasks",
                    })}
                  </p>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac,.mp4,.mov"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                  <Button onClick={() => audioInputRef.current?.click()} disabled={loading}>
                    {loading ? (<><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מתמלל ומחלץ...", en: "Transcribing..." })}</>) : (<><Mic className="size-4" />{txt(locale, { he: "בחר קובץ שמע", en: "Choose audio file" })}</>)}
                  </Button>
                </div>
              )}

              {mode === "url" && (
                <div className="space-y-3 p-5 border-2 border-dashed rounded-xl bg-amber-50/40 dark:bg-amber-950/10">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className="text-sm text-foreground flex-1 min-w-[200px]">
                      {txt(locale, {
                        he: "📎 הדבק קישור ציבורי לקובץ — השרת ימשוך אותו ישירות. עוקף את תקרת ההעלאה של Vercel.",
                        en: "📎 Paste a public link to a file — the server downloads it directly. Bypasses Vercel's upload cap.",
                      })}
                    </p>
                    <LinkGuideDialog locale={locale} />
                  </div>
                  <Input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... · https://www.dropbox.com/scl/..."
                    dir="ltr"
                    className="min-h-[44px]"
                    style={{ fontSize: "16px" }}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading && urlInput.trim()) void handleUrl();
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>
                      <strong>{txt(locale, { he: "Google Drive:", en: "Google Drive:" })}</strong>{" "}
                      {txt(locale, {
                        he: "שתף → 'כל מי שיש לו את הקישור'. הדבק את הקישור.",
                        en: 'Share → "Anyone with the link". Paste the link.',
                      })}
                    </p>
                    <p>
                      <strong>{txt(locale, { he: "Dropbox:", en: "Dropbox:" })}</strong>{" "}
                      {txt(locale, {
                        he: "Share → Create link → הדבק. השרת ימיר ל-dl=1 אוטומטית.",
                        en: "Share → Create link → paste. Server auto-flips dl=1.",
                      })}
                    </p>
                  </div>
                  <Button onClick={handleUrl} disabled={loading || !urlInput.trim()} className="min-h-[44px]">
                    {loading ? (
                      <><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מוריד ומעבד...", en: "Downloading & processing..." })}</>
                    ) : (
                      <><Sparkles className="size-4" />{txt(locale, { he: "חלץ משימות מהקישור", en: "Extract tasks from URL" })}</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          <SourceMetadataCard result={result} onReset={reset} />
          <ExtractedTasksTable
            result={result}
            sourceFile={sourceFile}
            selected={selected}
            toggleSelect={toggleSelect}
            removeTask={removeTask}
            onCreate={handleCreateSelected}
          />
        </>
      )}
    </div>
  );
}

/**
 * Pre-flight status badge. Shows BEFORE the user picks a file so they can
 * see at a glance which upload paths are available on this deployment and
 * which routes they should prefer if they have a big file.
 */
function CapabilityStatusBadge({
  caps,
  locale,
}: {
  caps: {
    audioUploadWorks: boolean;
    largeFileWorks: boolean;
    geminiAvailable: boolean;
    blobAvailable: boolean;
  };
  locale: string;
}) {
  const ok = caps.audioUploadWorks && caps.largeFileWorks;
  // Build a list of route statuses
  const rows: Array<{ label: string; status: "ok" | "warn" | "off"; note: string }> = [
    {
      label: txt(locale, { he: "📄 מסמך < 4MB (Word, PDF, PPT)", en: "📄 Documents < 4 MB (Word, PDF, PPT)" }) as string,
      status: "ok",
      note: txt(locale, { he: "תמיד פועל", en: "always works" }) as string,
    },
    {
      label: txt(locale, { he: "🎙️ הקלטות שמע/וידאו (כל גודל עד 300MB)", en: "🎙️ Audio/Video recordings (up to 300 MB)" }) as string,
      status: caps.geminiAvailable ? "ok" : "off",
      note: caps.geminiAvailable
        ? (txt(locale, { he: "Gemini Files API מחובר — עוקף תקרת Vercel", en: "Gemini Files API connected — bypasses Vercel cap" }) as string)
        : (txt(locale, { he: "אין GEMINI_API_KEY — לא יעבוד", en: "GEMINI_API_KEY missing — won't work" }) as string),
    },
    {
      label: txt(locale, { he: "📑 מסמך > 4MB (Word/PDF גדול)", en: "📑 Documents > 4 MB (large Word/PDF)" }) as string,
      status: caps.blobAvailable ? "ok" : "warn",
      note: caps.blobAvailable
        ? (txt(locale, { he: "Vercel Blob מחובר", en: "Vercel Blob connected" }) as string)
        : (txt(locale, { he: "השתמש במצב \"קישור\" עם Drive/Dropbox", en: 'Use the "Link" mode with Drive/Dropbox' }) as string),
    },
    {
      label: txt(locale, { he: "🔗 קישור ציבורי (Drive/Dropbox)", en: "🔗 Public URL (Drive/Dropbox)" }) as string,
      status: "ok",
      note: txt(locale, { he: "תמיד פועל — בלי הגבלת גודל", en: "always works — no size limit" }) as string,
    },
  ];

  return (
    <div
      className={
        ok
          ? "border rounded-xl p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900"
          : "border rounded-xl p-4 bg-amber-50/40 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900"
      }
    >
      <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
        {ok ? "✅" : "⚠️"}{" "}
        {ok
          ? txt(locale, { he: "כל מסלולי ההעלאה פעילים", en: "All upload paths are ready" })
          : txt(locale, {
              he: "חלק ממסלולי ההעלאה לא מוגדרים — ראה למטה",
              en: "Some upload paths aren't configured — see below",
            })}
      </div>
      <ul className="space-y-1.5 text-xs">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <span
                className={
                  r.status === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : r.status === "warn"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {r.status === "ok" ? "●" : r.status === "warn" ? "▲" : "✕"}
              </span>
              <span className="font-medium text-foreground">{r.label}</span>
            </span>
            <span className="text-muted-foreground">{r.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceMetadataCard({ result, onReset }: { result: IntakeResponse; onReset: () => void }) {
  const locale = useLocale();
  const Icon = kindIcon(result.kind);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Icon className="size-6 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                {result.meta.filename || txt(locale, { he: "טקסט חופשי", en: "Free text" })}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {result.meta.mime || result.kind} · {fmtBytes(result.meta.bytes)}
                {result.meta.estimatedPages != null && (
                  <> · {result.meta.estimatedPages} {txt(locale, { he: "עמודים (משוער)", en: "pages (est.)" })}</>
                )}
                {result.meta.estimatedDurationSec != null && (
                  <> · {fmtDuration(result.meta.estimatedDurationSec)} {txt(locale, { he: "דקות (משוער)", en: "duration (est.)" })}</>
                )}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            {txt(locale, { he: "מקור חדש", en: "New source" })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label={txt(locale, { he: "משימות שזוהו", en: "Tasks found" })} value={String(result.count)} color="primary" />
          <Stat label={txt(locale, { he: "אורך המקור", en: "Source length" })} value={`${result.sourceText.length.toLocaleString()} ${txt(locale, { he: "תווים", en: "chars" })}`} color="indigo" />
          <Stat label={txt(locale, { he: "סוג מקור", en: "Source kind" })} value={result.kind.toUpperCase()} color="purple" />
        </div>
        <details>
          <summary className="text-xs font-semibold cursor-pointer hover:underline">
            {txt(locale, { he: "📄 טקסט מקור (הצג/הסתר)", en: "📄 Source text (show/hide)" })}
          </summary>
          <div className="mt-2 max-h-[220px] overflow-y-auto p-3 rounded-md bg-muted/40 text-xs whitespace-pre-wrap leading-relaxed">
            {result.sourceText}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }: { label: React.ReactNode; value: string; color: "primary" | "indigo" | "purple" }) {
  const colorMap = {
    primary: "from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 text-blue-900 dark:text-blue-100",
    indigo:  "from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/40 text-indigo-900 dark:text-indigo-100",
    purple:  "from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40 text-purple-900 dark:text-purple-100",
  };
  return (
    <div className={cn("rounded-lg bg-gradient-to-br p-3", colorMap[color])}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

/** Tries to resolve an assignee-hint string to one of the mock users. */
function resolveAssignee(hint?: string) {
  if (!hint) return null;
  const h = hint.toLowerCase().trim();
  const direct = mockUsers.find((u) =>
    u.name.toLowerCase().includes(h) || h.includes(u.name.toLowerCase().split(" ")[0])
  );
  if (direct) return direct;
  return null;
}

function ExtractedTasksTable({
  result,
  sourceFile,
  selected,
  toggleSelect,
  removeTask,
  onCreate,
}: {
  result: IntakeResponse;
  sourceFile: File | null;
  selected: Set<number>;
  toggleSelect: (i: number) => void;
  removeTask: (i: number) => void;
  onCreate: () => void;
}) {
  const locale = useLocale();
  // Compute the org-wide auto-pick: most senior non-CEO from mockUsers, as fallback
  const autoFallback = pickResponsible(mockUsers, { excludeCEO: true });

  // Controlled-open dialog that gets pre-filled when the user clicks a row.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInit, setEditorInit] = useState<AddTaskInitialValues | null>(null);
  // Remember which row opened the editor so we can remove it from the
  // "to-create" list right after the dialog actually creates the task.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Build the "source" label as "filename · dd/mm/yyyy". The label has
  // to be SHORT — it lands inside a single-line input. Rules:
  //   • filename always wins (the user picked the file name; meaningful)
  //   • for pasted text there's no filename → use a generic localized
  //     label "טקסט חופשי" rather than the document's first sentence
  //     (which for audio transcripts is the conversational opening and
  //     is useless as a provenance string).
  //   • cap whatever we ended up with at ~80 chars defensively.
  const docDateForLabel = result.documentDate || "";
  const genericTextLabel = txt(locale, { he: "טקסט חופשי", en: "Pasted text" }) as string;
  const rawFilename = result.meta.filename || (result.kind === "text" ? genericTextLabel : (result.documentTitle || ""));
  const trimmedFilename = rawFilename && rawFilename.length > 80
    ? rawFilename.slice(0, 77) + "…"
    : rawFilename;
  const sourceLabel = trimmedFilename && docDateForLabel
    ? `${trimmedFilename} · ${formatDateDDMMYYYY(docDateForLabel)}`
    : trimmedFilename || formatDateDDMMYYYY(docDateForLabel) || undefined;

  // Pre-fill sensible defaults so "Edit & submit" doesn't force the user
  // to fill 4+ required fields per task. EXCEPT for the project picker —
  // user explicitly asked that the project ("שיוך") select always start at
  // "בחר", because tasks from different sources legitimately belong to
  // different projects and we shouldn't silently land them on whichever
  // project happens to be first in the catalog.
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const openEditor = (task: ExtractedTask, index: number) => {
    const resolved = resolveAssignee(task.assigneeHint) || autoFallback?.user;
    setEditorInit({
      title: task.title,
      description: task.description,
      workTypeLabel: task.workTypeLabel,
      assigneeHint: task.assigneeHint,
      assigneeUserId: resolved?.id,
      // plannedStart defaults to the document's date — that's when the
      // decision to do the task was made. plannedEnd uses the task's own
      // due date, or one week out as a sane default.
      plannedStart: result.documentDate || today,
      plannedEnd: task.dueDate || result.documentDate || defaultEnd,
      estimateHours: task.estimateHours,
      sourceLabel,
      sourceFile: sourceFile || undefined,
      // Intake-only pre-fills. NOT pre-filling defaultParentId so the
      // "שיוך" dropdown starts at "-- בחר --" (user choice required).
      defaultPriority: "medium",
      defaultMethodology: "waterfall",
    });
    setEditingIndex(index);
    setEditorOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {txt(locale, { he: "משימות שזוהו וניתן ליצור", en: "Detected tasks ready to create" })}
            </CardTitle>
            <CardDescription>
              {txt(locale, {
                he: `${selected.size} מתוך ${result.tasks.length} משימות נבחרו. לחץ על כל משימה כדי לערוך טופס מלא, או על "ערוך ושלח" — וצור משימות בודדות. לחילופין, "צור ${selected.size} משימות" יוצר את כל הנבחרות בבת אחת.`,
                en: `${selected.size} of ${result.tasks.length} tasks selected. Click any task to edit a full form, or use "Edit & submit" per task. Alternatively, "Create ${selected.size} tasks" creates all selected at once.`,
              })}
            </CardDescription>
          </div>
          <Button onClick={onCreate} disabled={selected.size === 0}>
            <Plus className="size-4" />
            {txt(locale, { he: `צור ${selected.size} משימות`, en: `Create ${selected.size} tasks` })}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.tasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {txt(locale, {
              he: "לא זוהו משימות במקור הזה.",
              en: "No tasks were detected in this source.",
            })}
          </div>
        ) : (
          result.tasks.map((task, i) => {
            const isSel = selected.has(i);
            const resolved = resolveAssignee(task.assigneeHint);
            const chosenAssignee = resolved || autoFallback?.user;
            return (
              <div
                key={i}
                className={cn(
                  "border rounded-lg p-3 transition-all cursor-pointer hover:border-violet-300",
                  isSel
                    ? "border-violet-400 bg-violet-50/40 dark:bg-violet-950/20"
                    : "border-border bg-muted/10"
                )}
                onClick={() => openEditor(task, i)}
                title={txt(locale, { he: "לחץ לפתיחת טופס משימה עם הפרטים מהמקור", en: "Click to open the task form prefilled from source" }) as string}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSelect(i)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="font-medium text-sm flex-1 min-w-0">{task.title}</h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {txt(locale, { he: "ביטחון", en: "Conf." })}: {Math.round(task.confidence * 100)}%
                      </span>
                    </div>
                    {task.description && task.description !== task.title && (
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {task.workTypeLabel && (
                        <Badge variant="secondary" className="text-[10px]">
                          <FileText className="size-3 me-1" />
                          {task.workTypeLabel}
                        </Badge>
                      )}
                      {task.estimateHours != null && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                          ⏱ {task.estimateHours} {txt(locale, { he: "שעות", en: "hrs" })}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                          📅 {formatDateDDMMYYYY(task.dueDate)}
                        </Badge>
                      )}
                      {task.assigneeHint && (
                        <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">
                          👤 {txt(locale, { he: "ציון במקור", en: "From source" })}: {task.assigneeHint}
                        </Badge>
                      )}
                      {chosenAssignee && (
                        <Badge variant="outline" className="text-[10px] text-violet-700 border-violet-300">
                          <ArrowRight className="size-3 me-1" />
                          {txt(locale, { he: "אחראי מוצע", en: "Auto-assigned" })}: {chosenAssignee.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(task, i);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors shadow-sm"
                      title={txt(locale, { he: "פתח טופס מלא לעריכה ויצירה", en: "Open full form to edit and create" }) as string}
                    >
                      <Pencil className="size-3" />
                      {txt(locale, { he: "ערוך ושלח", en: "Edit & submit" })}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTask(i);
                      }}
                      className="flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded-md"
                      title={txt(locale, { he: "הסר משימה זו מהרשימה", en: "Remove this task" }) as string}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Hidden controlled-open AddTaskDialog used for "click row → pre-filled form".
          It has no children (no trigger button) — opens/closes purely via state.
          onCreated removes the source row from the to-create list once the
          user has converted it into a real task via the dialog. */}
      <AddTaskDialog
        projects={mockWbsNodes}
        users={mockUsers}
        locale={locale}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialValues={editorInit ?? undefined}
        onCreated={() => {
          if (editingIndex != null) {
            removeTask(editingIndex);
          }
          setEditingIndex(null);
        }}
      />
    </Card>
  );
}
