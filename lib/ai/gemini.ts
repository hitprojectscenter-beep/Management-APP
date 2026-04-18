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
 * Supports 5 languages: he, en, ru, fr, es.
 */

const GEMINI_LANG_CONFIG: Record<string, { directive: string; instruction: string; prefix: string }> = {
  he: {
    directive: "חובה לענות בעברית בלבד. אסור להשתמש באנגלית.",
    instruction: `אתה העוזר האישי של פלטפורמת PMO++ - מערכת ניהול פרויקטים של המרכז למיפוי ישראל.
כללי תשובה: ענה בעברית בלבד, בצורה ידידותית ומדויקת (3-6 משפטים). השתמש ב-emoji.`,
    prefix: "[הוראה: ענה בעברית בלבד]\n\nשאלה:",
  },
  en: {
    directive: "Respond in English only.",
    instruction: `You are the Personal Assistant for PMO++ - the Israel Mapping Center's project management platform.
Rules: Respond in English only, friendly and concise (3-6 sentences). Use emojis.`,
    prefix: "[Instruction: Respond in English only]\n\nQuestion:",
  },
  ru: {
    directive: "Отвечай только на русском языке. Не используй другие языки.",
    instruction: `Ты персональный помощник платформы PMO++ - системы управления проектами Центра картографии Израиля.
Правила: Отвечай только на русском языке, дружелюбно и кратко (3-6 предложений). Используй эмодзи.`,
    prefix: "[Инструкция: Отвечай только на русском]\n\nВопрос:",
  },
  fr: {
    directive: "Répondez uniquement en français. N'utilisez pas d'autres langues.",
    instruction: `Vous êtes l'assistant personnel de PMO++ - la plateforme de gestion de projets du Centre de Cartographie d'Israël.
Règles : Répondez uniquement en français, de manière amicale et concise (3-6 phrases). Utilisez des emojis.`,
    prefix: "[Instruction : Répondez en français uniquement]\n\nQuestion :",
  },
  es: {
    directive: "Responde únicamente en español. No uses otros idiomas.",
    instruction: `Eres el asistente personal de PMO++ - la plataforma de gestión de proyectos del Centro de Cartografía de Israel.
Reglas: Responde solo en español, de forma amable y concisa (3-6 oraciones). Usa emojis.`,
    prefix: "[Instrucción: Responde solo en español]\n\nPregunta:",
  },
};

export async function askGemini(question: string, context: string, lang: string): Promise<string> {
  const cfg = GEMINI_LANG_CONFIG[lang] || GEMINI_LANG_CONFIG.he;

  const systemInstruction = `${cfg.instruction}

${cfg.directive}

PMO++ system info:
${context}`;

  const userMessage = `${cfg.prefix} ${question}`;

  return chatWithGemini(
    [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction
  );
}

export function isGeminiAvailable(): boolean {
  return !!getApiKey();
}
