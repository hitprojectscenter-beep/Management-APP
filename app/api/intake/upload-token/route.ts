/**
 * Vercel Blob direct-upload token endpoint.
 *
 * Why: Vercel serverless functions cap request bodies at ~4.5 MB. A 200 MB
 * Zoom recording reliably 413's before it ever reaches our /api/intake
 * handler. The recommended pattern is:
 *   1. Client asks this route to sign a short-lived upload token.
 *   2. Client uploads the file DIRECTLY to Vercel Blob storage (no proxy
 *      through our function — no 4.5 MB cap).
 *   3. Client POSTs the resulting blob URL to /api/intake, which fetches
 *      and processes it like any other source.
 *
 * Setup required on Vercel:
 *   • Add a Blob store to the project (Vercel Dashboard → Storage → Blob).
 *   • Set BLOB_READ_WRITE_TOKEN env var (Vercel auto-populates it when
 *     a Blob store is attached). When unset, this route returns 503 with
 *     a clear setup message so the client knows to fall back.
 */
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BLOB_BYTES = 300 * 1024 * 1024; // mirrors /api/intake's MAX_UPLOAD_BYTES

const ALLOWED_CONTENT_TYPES = [
  "text/plain",
  "application/json",
  // Office docs
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/pdf",
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // Audio + video (Zoom / Meet exports)
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(req: Request) {
  // Guard: if no token is configured, the @vercel/blob client throws an opaque
  // error. Return a clear 503 instead so the UI can show a helpful message.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob is not configured. Add a Blob store to this Vercel project (Storage → Blob) and redeploy. Locally, set BLOB_READ_WRITE_TOKEN in .env.local.",
        code: "BLOB_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // pathname is supplied by the client — we don't need to validate it
        // beyond what Vercel Blob already does. clientPayload carries the
        // user's locale so we can use it server-side later if needed.
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          allowOverwrite: true,
          // 300 MB ceiling — anything bigger is almost certainly a mistake
          maximumSizeInBytes: MAX_BLOB_BYTES,
          tokenPayload: JSON.stringify({
            locale: typeof clientPayload === "string" ? clientPayload : "he",
            uploadedAt: new Date().toISOString(),
          }),
          // Tokens are valid for 30 min — enough for a slow mobile upload of
          // a 300 MB recording, short enough that a leaked token is useless.
          validUntil: Date.now() + 30 * 60 * 1000,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client immediately POSTs the blob URL to /api/intake,
        // which does the actual processing. Vercel calls this hook from a
        // serverless function so we keep it cheap.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("[/api/intake/upload-token] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload-token error" },
      { status: 400 }
    );
  }
}
