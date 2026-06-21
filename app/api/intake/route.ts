import { NextResponse } from "next/server";
import { ingest } from "@/lib/ai/source-ingest";
import { extractTasksFromText } from "@/lib/ai/meeting-extractor";

export const runtime = "nodejs";
// Allow uploads up to 20 MB
export const maxDuration = 60;

interface BodyTextOnly {
  text?: string;
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
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await ingest(buf, file.type, file.name);
      kind = result.kind;
      sourceText = result.text;
      meta = result.meta;
    } else {
      const body = (await req.json().catch(() => ({}))) as BodyTextOnly;
      sourceText = (body.text || "").trim();
      if (body.locale) locale = body.locale;
      if (!sourceText) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
      if (sourceText.length > 50_000) {
        return NextResponse.json({ error: "Text too long (max 50,000 chars)" }, { status: 413 });
      }
      kind = "text";
      meta = { bytes: sourceText.length, mime: "text/plain" };
    }

    if (!sourceText) {
      return NextResponse.json(
        { error: "Could not extract any text from the source" },
        { status: 422 }
      );
    }

    // Hand the extracted text to the existing task extractor — same code path
    // as the paste-text dialog, so behavior is consistent across sources.
    const tasks = await extractTasksFromText(sourceText, locale);

    return NextResponse.json({
      kind,
      sourceText,
      tasks,
      count: tasks.length,
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
