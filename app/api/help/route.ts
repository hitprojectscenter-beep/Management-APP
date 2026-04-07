import { NextResponse } from "next/server";
import { findHelpByKeywords, formatKnowledgeBaseForAI, HELP_ENTRIES } from "@/lib/help/help-content";
import { chat } from "@/lib/ai/claude";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query, locale } = (await req.json()) as { query: string; locale: "he" | "en" };

    // 1. Try keyword match first - fast and free
    const matched = findHelpByKeywords(query, locale);
    if (matched.length > 0) {
      return NextResponse.json({
        answer: matched[0].answer[locale],
        matchedEntries: matched,
        source: "knowledge-base",
      });
    }

    // 2. Fallback to Claude with knowledge base context (if API key set)
    if (process.env.ANTHROPIC_API_KEY) {
      const systemPrompt =
        locale === "he"
          ? `אתה בוט העזרה של Work OS - פלטפורמת ניהול פרויקטים פנים-ארגונית.
ענה רק על שאלות הקשורות לשימוש במערכת. אם השאלה לא קשורה למערכת - הסבר באדיבות שאתה רק עוזר עם השימוש ב-Work OS.
ענה תמיד בעברית, באופן ידידותי וקצר (עד 4-5 משפטים).
השתמש בידע הבא כמקור עיקרי:

${formatKnowledgeBaseForAI(locale)}`
          : `You are the Work OS help bot - an internal project management platform.
Answer ONLY questions about using the system. If the question is unrelated - politely explain you only help with Work OS.
Answer concisely (4-5 sentences max). Use the following knowledge as your primary source:

${formatKnowledgeBaseForAI(locale)}`;

      const reply = await chat([{ role: "user", content: query }], systemPrompt);

      return NextResponse.json({
        answer: reply,
        source: "ai",
      });
    }

    // 3. No keyword match and no AI - return helpful fallback
    const fallback =
      locale === "he"
        ? `לא מצאתי תשובה ישירה לשאלה הזו. נסה לנסח אחרת, או דפדף בנושאים הנפוצים:\n\n${HELP_ENTRIES.slice(0, 5)
            .map((e) => `• ${e.question.he}`)
            .join("\n")}`
        : `I couldn't find a direct answer. Try rephrasing, or browse common topics:\n\n${HELP_ENTRIES.slice(0, 5)
            .map((e) => `• ${e.question.en}`)
            .join("\n")}`;

    return NextResponse.json({
      answer: fallback,
      matchedEntries: HELP_ENTRIES.slice(0, 5),
      source: "fallback",
    });
  } catch (error) {
    console.error("Help bot error:", error);
    return NextResponse.json(
      { answer: "Error processing your question. Please try again." },
      { status: 500 }
    );
  }
}
