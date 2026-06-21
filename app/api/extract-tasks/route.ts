import { NextResponse } from "next/server";
import { extractTasksFromText } from "@/lib/ai/meeting-extractor";

export const runtime = "nodejs";

interface RequestBody {
  text: string;
  locale?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const text = (body.text || "").trim();
    const locale = body.locale || "he";

    if (!text) {
      return NextResponse.json({ error: "Empty text" }, { status: 400 });
    }
    if (text.length > 20000) {
      return NextResponse.json({ error: "Text too long (max 20,000 chars)" }, { status: 413 });
    }

    const result = await extractTasksFromText(text, locale);
    return NextResponse.json({
      tasks: result.tasks,
      count: result.tasks.length,
      documentDate: result.documentDate,
      documentTitle: result.documentTitle,
    });
  } catch (err) {
    console.error("[/api/extract-tasks] Fatal:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
