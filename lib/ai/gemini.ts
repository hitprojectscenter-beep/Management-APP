/**
 * Google Gemini API client for AI-powered assistant answers.
 * Used as a fallback when the knowledge base doesn't have an exact match.
 */

// Prefer 2.5 Flash (stable, wide availability), fallback to 2.0 if quota hit
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

function getApiKey(): string | null {
  // Normalize — some .env files have trailing whitespace in the key name
  const key =
    process.env.GEMINI_API_KEY ||
    process.env["GEMINI_API_KEY "] ||
    process.env.GOOGLE_API_KEY ||
    null;
  return key?.trim() || null;
}

export async function chatWithGemini(
  messages: GeminiMessage[],
  systemInstruction?: string
): Promise<string> {
  const apiKey = getApiKey();
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

  // Try each model in order until one works
  let lastError: Error | null = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        lastError = new Error(`Gemini ${model} error ${res.status}: ${errText.slice(0, 200)}`);
        console.warn(`[gemini] ${model} failed:`, errText.slice(0, 100));
        continue; // Try next model
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`Gemini ${model} returned no text`);
        continue;
      }
      console.log(`[gemini] ${model} responded successfully`);
      return text.trim();
    } catch (err) {
      lastError = err as Error;
      continue;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

/**
 * Ask Gemini a question with knowledge base context.
 * Strongly enforces the output language.
 */
export async function askGemini(question: string, context: string, isHebrew: boolean): Promise<string> {
  // STRONG language instruction — at both system level AND user message level
  const langDirective = isHebrew
    ? `חובה לענות בעברית בלבד. אסור להשתמש באנגלית בכלל.`
    : `Respond in English only.`;

  const systemInstruction = isHebrew
    ? `אתה העוזר האישי של פלטפורמת Work OS - מערכת ניהול פרויקטים של המרכז למיפוי ישראל.

${langDirective}

כללי תשובה:
- ענה בעברית בלבד, תמיד. לא משנה באיזו שפה נשאלת השאלה.
- ענה בצורה ידידותית, מדויקת, וקצרה (3-6 משפטים).
- השתמש במידע מהמערכת למטה כדי לתת תשובות מדויקות.
- אם השאלה לא קשורה למערכת — ענה בכל זאת בעברית והסבר בקצרה מה אתה יכול לעזור.
- השתמש ב-emoji רלוונטיים להדגשה.

מידע על המערכת Work OS:
${context}`
    : `You are the Personal Assistant for Work OS - the Israel Mapping Center's project management platform.

${langDirective}

Response rules:
- Always respond in English only.
- Be friendly, accurate, and concise (3-6 sentences).
- Use the system info below to give accurate answers.
- Use relevant emojis for emphasis.

Work OS system info:
${context}`;

  // Double-reinforce the language directive in the user message
  const userMessage = isHebrew
    ? `[הוראה: ענה בעברית בלבד]\n\nשאלה: ${question}`
    : `[Instruction: Respond in English only]\n\nQuestion: ${question}`;

  return chatWithGemini(
    [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction
  );
}

export function isGeminiAvailable(): boolean {
  return !!getApiKey();
}
