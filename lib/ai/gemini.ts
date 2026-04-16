/**
 * Google Gemini API client for AI-powered assistant answers.
 * Used as a fallback when the knowledge base doesn't have an exact match.
 */

const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function chatWithGemini(
  messages: GeminiMessage[],
  systemInstruction?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY not set");
  }

  const body: any = {
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no text");
  }
  return text.trim();
}

/** Simple wrapper: ask Gemini a question with optional context */
export async function askGemini(question: string, context: string, isHebrew: boolean): Promise<string> {
  const systemInstruction = isHebrew
    ? `אתה עוזר AI של פלטפורמת Work OS - מערכת ניהול פרויקטים של המרכז למיפוי ישראל.
ענה בעברית בלבד, בצורה ידידותית וקצרה (3-5 משפטים).
השתמש במידע מהמערכת כדי לתת תשובות מדויקות.
אם אתה לא יודע את התשובה, אמור זאת ישירות.

מידע על המערכת:
${context}`
    : `You are the AI assistant for Work OS - the Israel Mapping Center's project management platform.
Respond in English, friendly and concise (3-5 sentences).
Use the system information to give accurate answers.
If you don't know, say so directly.

System info:
${context}`;

  return chatWithGemini(
    [{ role: "user", parts: [{ text: question }] }],
    systemInstruction
  );
}

export function isGeminiAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}
