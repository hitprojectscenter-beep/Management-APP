import { NextResponse } from "next/server";
import { del as deleteBlob } from "@vercel/blob";
import { ingest, ingestAudioByUri } from "@/lib/ai/source-ingest";
import { extractTasksFromText } from "@/lib/ai/meeting-extractor";

export const runtime = "nodejs";
// Allow uploads up to 300 MB (meeting recordings can be long — Zoom/Meet
// recordings of an hour-plus regularly land in the 100-250 MB range).
// maxDuration is bumped to 300 s — the max for Vercel Pro serverless —
// because base64-encoding + Gemini transcription of a long recording can
// take several minutes.
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 300 * 1024 * 1024; // 300 MB

interface BodyTextOnly {
  text?: string;
  locale?: string;
}

/**
 * JSON variant used when the file is already in Vercel Blob storage
 * (bypassing the 4.5 MB serverless function body cap).
 */
interface BodyBlobRef {
  blobUrl: string;
  blobMime?: string;
  blobFilename?: string;
  locale?: string;
}

/**
 * JSON variant: user pasted a public URL pointing at a Drive/Dropbox/
 * SharePoint/Anything file. The server fetches it directly — which is
 * NOT bounded by the serverless function's inbound body cap — and runs
 * the normal ingest() pipeline on the downloaded buffer.
 *
 * Works for any public link without ANY Vercel setup.
 */
interface BodyUrlRef {
  sourceUrl: string;
  locale?: string;
}

/**
 * JSON variant: the browser uploaded an audio file directly to Gemini's
 * Files API via the resumable-upload endpoint, and now just hands us
 * the resulting file URI. We never see the bytes — bypasses Vercel's
 * 4.5 MB inbound cap entirely, no Blob store needed.
 */
interface BodyGeminiRef {
  geminiFileUri: string;
  geminiMime?: string;
  geminiFilename?: string;
  geminiSize?: number;
  locale?: string;
}

/**
 * Rewrite well-known cloud-storage "view" URLs to direct-download URLs.
 *   • Google Drive    `…/file/d/<ID>/view…`  →  `https://drive.google.com/uc?export=download&id=<ID>`
 *   • Dropbox         `…?dl=0`              →  `…?dl=1`
 * Anything else is returned unchanged.
 */
function normalizeSourceUrl(raw: string): string {
  const u = raw.trim();
  // Google Drive — "file/d/<id>" form
  const driveMatch = u.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  // Dropbox — flip dl=0 to dl=1 so we get the binary, not the HTML viewer
  if (/^https?:\/\/(?:www\.)?dropbox\.com\//i.test(u)) {
    if (u.includes("dl=0")) return u.replace(/dl=0/g, "dl=1");
    if (!u.includes("dl=")) return u + (u.includes("?") ? "&" : "?") + "dl=1";
  }
  return u;
}

/**
 * Returns true if the response body looks like a Google sign-in page
 * (i.e. the file isn't shared with "Anyone with the link"), so the
 * caller can return a clear error instead of trying to parse the HTML
 * as a document.
 */
function isGoogleSignInPage(buf: Buffer, mime: string): boolean {
  if (!mime.includes("text/html")) return false;
  // Look at first 2 KB — Google's sign-in page has very recognizable markers
  const head = buf.slice(0, 2048).toString("utf8");
  return (
    head.includes("accounts.google.com/v3/signin") ||
    head.includes("Sign in") && head.includes("Google Account") ||
    head.includes("/v3/signin/") ||
    head.includes("ServiceLogin")
  );
}

/**
 * Drive's "virus scan warning" interstitial for files >100 MB.
 * The response is an HTML page with a form whose action contains a
 * `&confirm=<token>` URL we need to GET to actually receive the file.
 * Returns the confirmation URL if detected, null otherwise.
 */
function findDriveConfirmUrl(buf: Buffer, mime: string): string | null {
  if (!mime.includes("text/html")) return null;
  const html = buf.slice(0, 64 * 1024).toString("utf8");
  // Modern Drive form: action="https://drive.usercontent.google.com/download" with hidden id, confirm, uuid
  const formMatch = html.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]*)"/);
  if (!formMatch) return null;
  const action = formMatch[1].replace(/&amp;/g, "&");
  const idMatch = html.match(/name="id"\s+value="([^"]+)"/);
  const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/);
  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
  if (!idMatch || !confirmMatch) return null;
  const params = new URLSearchParams();
  params.set("id", idMatch[1]);
  params.set("export", "download");
  params.set("confirm", confirmMatch[1]);
  if (uuidMatch) params.set("uuid", uuidMatch[1]);
  return `${action.split("?")[0]}?${params.toString()}`;
}

/** Best-effort filename guess from a URL — last path segment, no query string. */
function guessFilenameFromUrl(url: string, contentDisposition?: string | null): string {
  if (contentDisposition) {
    const m = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    if (m) return decodeURIComponent(m[1] || m[2] || "");
  }
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || "download";
    return decodeURIComponent(last);
  } catch {
    return "download";
  }
}

/**
 * POST /api/intake
 *
 * Accepts either:
 *  - multipart/form-data with `file` field (and optional `locale`)
 *  - application/json with { text, locale }
 *
 * Returns:
 *  {
 *    kind: "text" | "docx" | "pdf" | "image" | "audio",
 *    sourceText: string,            // extracted text from the artifact
 *    tasks: ExtractedTask[],        // structured tasks ready to review
 *    meta: { bytes, filename, mime, estimatedPages?, estimatedDurationSec? }
 *  }
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let sourceText = "";
    let kind: string = "text";
    let meta: Record<string, unknown> = {};
    let locale = "he";

    // Hold onto the blob URL so we can delete the file after processing.
    // Storage costs money — there's no reason to keep the artifact once
    // we've extracted its text + tasks.
    let blobToDelete: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const localeField = form.get("locale");
      if (typeof localeField === "string") locale = localeField;
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      if (file.size === 0) {
        return NextResponse.json({ error: "Empty file" }, { status: 400 });
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "File too large (max 300 MB)" }, { status: 413 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await ingest(buf, file.type, file.name);
      kind = result.kind;
      sourceText = result.text;
      meta = result.meta;
    } else {
      const body = (await req.json().catch(() => ({}))) as BodyTextOnly & BodyBlobRef & BodyUrlRef & BodyGeminiRef;
      if (body.locale) locale = body.locale;

      if (body.geminiFileUri) {
        // Audio uploaded directly to Gemini Files API by the browser. No
        // bytes pass through this function — we just reference the URI.
        const result = await ingestAudioByUri(
          body.geminiFileUri,
          body.geminiMime || "audio/mpeg",
          body.geminiFilename || "recording",
          body.geminiSize || 0
        );
        kind = result.kind;
        sourceText = result.text;
        meta = result.meta;
      } else if (body.sourceUrl) {
        // Public-URL path: server fetches the file directly. Outbound
        // fetches from a serverless function are NOT bounded by Vercel's
        // ~4.5MB inbound body cap — this is the no-config workaround for
        // when Vercel Blob isn't enabled on the project.
        //
        // Two gotchas this code handles:
        //   1. If the user shared the Drive link but NOT with "Anyone with
        //      the link can view", Drive returns its sign-in HTML page
        //      instead of the file. We detect that page and return a clear
        //      Hebrew error instead of treating it as a real document.
        //   2. For files >100 MB Drive returns a "virus scan warning"
        //      interstitial with a confirmation form. We parse it and
        //      re-fetch with the confirm token.
        const url = normalizeSourceUrl(body.sourceUrl);
        const isDrive = /drive\.google\.com|drive\.usercontent\.google\.com/i.test(url);

        // Cookie jar that survives the virus-scan re-fetch.
        let cookieJar = "";
        const fetchWithCookies = async (target: string): Promise<Response> => {
          const headers: Record<string, string> = { "User-Agent": "PMOPlus-Intake/1.0" };
          if (cookieJar) headers.cookie = cookieJar;
          const res = await fetch(target, { redirect: "follow", headers });
          const setCookie = res.headers.get("set-cookie");
          if (setCookie) {
            // Browsers split on multiple Set-Cookie headers; Next bundles them.
            cookieJar = setCookie
              .split(/,(?=[^;]+=)/g)
              .map((c) => c.split(";")[0].trim())
              .filter(Boolean)
              .join("; ");
          }
          return res;
        };

        let fetchRes: Response;
        try {
          fetchRes = await fetchWithCookies(url);
        } catch (err) {
          return NextResponse.json(
            { error: `Failed to fetch URL: ${err instanceof Error ? err.message : "unknown"}` },
            { status: 502 }
          );
        }
        if (!fetchRes.ok) {
          return NextResponse.json(
            {
              error:
                'הקישור החזיר שגיאה ' +
                fetchRes.status +
                '. ודאו ששיתפתם את הקובץ במצב "כל מי שיש לו את הקישור" — לא "מוגבל".',
            },
            { status: 502 }
          );
        }
        let buf = Buffer.from(await fetchRes.arrayBuffer());
        let mime =
          fetchRes.headers.get("content-type")?.split(";")[0].trim() ||
          "application/octet-stream";

        // ── Drive virus-scan interstitial (large files) ────────────────
        if (isDrive) {
          const confirmUrl = findDriveConfirmUrl(buf, mime);
          if (confirmUrl) {
            try {
              const confirmed = await fetchWithCookies(confirmUrl);
              if (confirmed.ok) {
                buf = Buffer.from(await confirmed.arrayBuffer());
                mime =
                  confirmed.headers.get("content-type")?.split(";")[0].trim() ||
                  "application/octet-stream";
              }
            } catch (err) {
              console.warn("[intake] Drive confirm fetch failed:", err);
            }
          }
        }

        // ── Sign-in page detection (file not shared publicly) ──────────
        if (isGoogleSignInPage(buf, mime)) {
          return NextResponse.json(
            {
              error:
                'הקובץ ב-Google Drive אינו ציבורי. גוגל החזירה דף התחברות במקום הקובץ. ' +
                'פתחו את הקובץ ב-Drive, לחצו "שתף" וודאו שמצב הגישה הוא "כל מי שיש לו את הקישור" (ולא "מוגבל"). ' +
                "לאחר מכן נסו שוב.",
            },
            { status: 403 }
          );
        }

        // ── HTML response from a non-Drive source (probably a webpage) ─
        if (mime.includes("text/html") && !isDrive) {
          return NextResponse.json(
            {
              error:
                "הקישור הוביל לדף אינטרנט (HTML) ולא לקובץ ישיר. הדביקו קישור הורדה ישיר — לא קישור לתצוגה.",
            },
            { status: 415 }
          );
        }

        if (buf.length === 0) {
          return NextResponse.json({ error: "Fetched file is empty" }, { status: 400 });
        }
        if (buf.length > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: "Fetched file too large (max 300 MB)" }, { status: 413 });
        }
        const filename = guessFilenameFromUrl(
          url,
          fetchRes.headers.get("content-disposition")
        );
        const result = await ingest(buf, mime, filename);
        kind = result.kind;
        sourceText = result.text;
        meta = result.meta;
      } else if (body.blobUrl) {
        // Fetch the file from Vercel Blob storage and feed it to the same
        // ingest() pipeline as a direct upload.
        let blobRes: Response;
        try {
          blobRes = await fetch(body.blobUrl);
        } catch (err) {
          return NextResponse.json(
            { error: `Failed to fetch blob: ${err instanceof Error ? err.message : "unknown"}` },
            { status: 502 }
          );
        }
        if (!blobRes.ok) {
          return NextResponse.json(
            { error: `Blob fetch returned ${blobRes.status}` },
            { status: 502 }
          );
        }
        const buf = Buffer.from(await blobRes.arrayBuffer());
        if (buf.length === 0) {
          return NextResponse.json({ error: "Blob is empty" }, { status: 400 });
        }
        if (buf.length > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: "Blob too large (max 300 MB)" }, { status: 413 });
        }
        const blobMime = body.blobMime || blobRes.headers.get("content-type") || "application/octet-stream";
        const blobFilename = body.blobFilename || body.blobUrl.split("/").pop() || "upload";
        const result = await ingest(buf, blobMime, blobFilename);
        kind = result.kind;
        sourceText = result.text;
        meta = result.meta;
        blobToDelete = body.blobUrl;
      } else {
        sourceText = (body.text || "").trim();
        if (!sourceText) {
          return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }
        if (sourceText.length > 200_000) {
          return NextResponse.json({ error: "Text too long (max 200,000 chars)" }, { status: 413 });
        }
        kind = "text";
        meta = { bytes: sourceText.length, mime: "text/plain" };
      }
    }

    if (!sourceText) {
      return NextResponse.json(
        { error: "Could not extract any text from the source" },
        { status: 422 }
      );
    }

    // Hand the extracted text to the existing task extractor — same code path
    // as the paste-text dialog, so behavior is consistent across sources.
    const result = await extractTasksFromText(sourceText, locale);

    // Clean up the blob once we've extracted everything we need from it.
    // Failure to delete shouldn't fail the request — it'll get gc'd eventually.
    if (blobToDelete) {
      try {
        await deleteBlob(blobToDelete);
      } catch (delErr) {
        console.warn("[/api/intake] Blob cleanup failed:", delErr);
      }
    }

    return NextResponse.json({
      kind,
      sourceText,
      tasks: result.tasks,
      count: result.tasks.length,
      documentDate: result.documentDate,
      documentTitle: result.documentTitle,
      meta,
    });
  } catch (err) {
    console.error("[/api/intake] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
