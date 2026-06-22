/**
 * Gemini Files API — initiate a resumable upload session.
 *
 * Why this exists: Vercel's serverless function inbound body cap is
 * ~4.5 MB. Audio recordings are routinely 10-300 MB. Vercel Blob would
 * fix it but requires extra dashboard config the user rejected.
 *
 * Google's Gemini Files API natively supports resumable uploads — the
 * server starts a session with the API key, gets back a SIGNED upload
 * URL that includes its own short-lived auth token (NOT the API key),
 * and hands that URL to the browser. The browser uploads the file
 * directly to Google. Vercel only sees a small JSON metadata request,
 * never the file bytes. No 4.5 MB cap. No Blob needed.
 *
 * Flow:
 *   1. Client POSTs metadata (filename, mime, size) to this route.
 *   2. We POST to Google with our GEMINI_API_KEY:
 *        POST /upload/v1beta/files?key=… (Content-Type: application/json)
 *        Headers: X-Goog-Upload-Protocol: resumable
 *                 X-Goog-Upload-Command: start
 *                 X-Goog-Upload-Header-Content-Length: <size>
 *                 X-Goog-Upload-Header-Content-Type: <mime>
 *        Body: { file: { display_name: <filename> } }
 *   3. Google returns the upload URL in `X-Goog-Upload-URL` header.
 *      That URL contains its own session token — safe to hand to the
 *      browser without exposing our API key.
 *   4. We pass that URL back to the client.
 *   5. Client PUTs the file bytes directly to Google.
 *
 * Reference: https://ai.google.dev/gemini-api/docs/document-processing#large-pdfs
 *            (same resumable-upload mechanism for any file type).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 300 * 1024 * 1024; // 300 MB hard cap to match the rest of the pipeline

interface Body {
  filename: string;
  mime: string;
  size: number;
}

function getApiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY ||
    process.env["GEMINI_API_KEY "] ||
    process.env.GOOGLE_API_KEY ||
    null;
  return k?.trim() || null;
}

export async function POST(req: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini API key missing. Add GEMINI_API_KEY to Vercel env vars and redeploy.",
        code: "GEMINI_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const filename = (body.filename || "upload").slice(0, 200);
  const mime = body.mime || "application/octet-stream";
  const size = Number(body.size) || 0;

  if (!size || size <= 0) {
    return NextResponse.json({ error: "size required" }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${size} bytes, max ${MAX_BYTES})` },
      { status: 413 }
    );
  }

  // Initiate the resumable upload session with Google.
  try {
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(size),
          "X-Goog-Upload-Header-Content-Type": mime,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ file: { display_name: filename } }),
      }
    );
    if (!initRes.ok) {
      const text = await initRes.text().catch(() => "");
      console.error("[gemini-upload-url] init failed", initRes.status, text.slice(0, 300));
      return NextResponse.json(
        {
          error: `Gemini upload init failed (${initRes.status}): ${text.slice(0, 200)}`,
          code: "GEMINI_INIT_FAILED",
        },
        { status: 502 }
      );
    }
    // The signed upload URL comes back in this header. It contains its
    // own session token — no API key embedded — so it's safe to send to
    // the browser.
    const uploadUrl = initRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Gemini didn't return an upload URL" },
        { status: 502 }
      );
    }
    return NextResponse.json({
      uploadUrl,
      // Useful for the client to know up front
      maxBytes: MAX_BYTES,
    });
  } catch (err) {
    console.error("[gemini-upload-url] Fatal", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
