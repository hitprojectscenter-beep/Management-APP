/**
 * Pre-flight capability check for the intake upload paths.
 *
 * The client calls this on mount to know which upload routes are wired
 * up so we can show the user the right guidance BEFORE they pick a file
 * — instead of letting the upload fail and surprising them with an error
 * (the user's literal request: "יש לבצע בדיקת תאימות מלפני שהמערכת
 * מתחילה לרוץ").
 *
 * Returns which env vars are present (without exposing their values),
 * and the inferred capability for each upload mode.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function hasEnv(...names: string[]): boolean {
  return names.some((n) => {
    const v = process.env[n];
    return typeof v === "string" && v.trim().length > 0;
  });
}

export async function GET() {
  const hasGemini = hasEnv("GEMINI_API_KEY", "GEMINI_API_KEY ", "GOOGLE_API_KEY");
  const hasBlob = hasEnv("BLOB_READ_WRITE_TOKEN");

  return NextResponse.json({
    paths: {
      // Audio/video upload directly to Gemini Files API
      geminiDirectUpload: {
        available: hasGemini,
        // 2 GB is the documented Gemini Files API hard cap; our intake
        // pipeline self-imposes 300 MB.
        maxBytes: hasGemini ? 300 * 1024 * 1024 : 0,
        reason: hasGemini ? "ok" : "GEMINI_API_KEY missing",
      },
      // Any file via Vercel Blob direct upload
      vercelBlob: {
        available: hasBlob,
        maxBytes: hasBlob ? 300 * 1024 * 1024 : 0,
        reason: hasBlob ? "ok" : "BLOB_READ_WRITE_TOKEN missing — enable Vercel Blob in dashboard",
      },
      // Plain multipart upload — limited by Vercel's serverless body cap
      multipart: {
        available: true,
        // Best-effort estimate: Vercel serverless functions cap inbound
        // bodies at ~4.5 MB. Local dev has no cap, but we can't tell from
        // the server which environment the client is on, so report the
        // production worst-case.
        maxBytes: 4 * 1024 * 1024,
        reason: "ok (~4.5 MB platform cap on Vercel)",
      },
      // Public URL paste — outbound fetch, no inbound cap
      publicUrl: {
        available: true,
        maxBytes: 300 * 1024 * 1024,
        reason: "ok (server fetches the file, no inbound cap)",
      },
    },
    // A summary suitable for showing to the user as a single status badge
    summary: {
      // If Gemini is available, audio/video uploads are essentially unconstrained
      audioUploadWorks: hasGemini,
      // For any file kind > 4.5 MB
      largeFileWorks: hasGemini || hasBlob,
      // Always works
      smallFileWorks: true,
    },
  });
}
