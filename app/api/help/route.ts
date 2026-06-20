import { NextResponse } from "next/server";
import { findHelpByKeywords, formatKnowledgeBaseForAI, HELP_ENTRIES } from "@/lib/help/help-content";
import { chat } from "@/lib/ai/claude";
import { askGemini, isGeminiAvailable } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { query?: string; q?: string; locale?: string };
    // Accept either "query" or "q" as the input field
    const query = (body.query || body.q || "").trim();
    const rawLocale = body.locale;
    if (!query) {
      return NextResponse.json({ answer: "", error: "Empty query" }, { status: 400 });
    }
    // Normalize locale — help content only has "he" and "en" keys for KB lookup
    const locale = rawLocale === "he" ? "he" : "en";
    // Detect the actual response language from text, fallback to locale
    const hasHebrewChars = /[֐-׿]/.test(query);
    const hasCyrillicChars = /[Ѐ-ӿ]/.test(query);
    const responseLang = hasHebrewChars ? "he" : hasCyrillicChars ? "ru" : (rawLocale && ["en", "fr", "es"].includes(rawLocale) ? rawLocale : "he");

    // 1. Try keyword match first - fast and free
    const matched = findHelpByKeywords(query, locale);
    if (matched.length > 0) {
      return NextResponse.json({
        answer: matched[0].answer[locale],
        matchedEntries: matched,
        source: "knowledge-base",
      });
    }

    // 2a. Fallback to Gemini (preferred — supports 5 languages, grounded with full app facts)
    if (isGeminiAvailable()) {
      try {
        const kbContext = formatKnowledgeBaseForAI(locale);
        const answer = await askGemini(query, kbContext, responseLang);
        return NextResponse.json({
          answer,
          source: "ai-gemini",
        });
      } catch (err) {
        console.warn("[help] Gemini failed, trying Claude:", err);
      }
    }

    // 2b. Fallback to Claude with knowledge base context (if API key set)
    if (process.env.ANTHROPIC_API_KEY) {
      const systemPrompt =
        locale === "he"
          ? `אתה בוט העזרה של PMO++ - פלטפורמת ניהול פרויקטים פנים-ארגונית.
ענה רק על שאלות הקשורות לשימוש במערכת. אם השאלה לא קשורה למערכת - הסבר באדיבות שאתה רק עוזר עם השימוש ב-PMO++.
ענה תמיד בעברית, באופן ידידותי וקצר (עד 4-5 משפטים).
השתמש בידע הבא כמקור עיקרי:

${formatKnowledgeBaseForAI(locale)}`
          : `You are the PMO++ help bot - an internal project management platform.
Answer ONLY questions about using the system. If the question is unrelated - politely explain you only help with PMO++.
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
