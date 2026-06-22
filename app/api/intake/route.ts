import { NextResponse } from "next/server";
import { del as deleteBlob } from "@vercel/blob";
import { ingest } from "@/lib/ai/source-ingest";
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
      const body = (await req.json().catch(() => ({}))) as BodyTextOnly & BodyBlobRef;
      if (body.locale) locale = body.locale;

      if (body.blobUrl) {
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
