/**
 * Claude AI integration for PMO++.
 * משמש לסיכום, זיהוי סיכונים, ועוזר AI אינטראקטיבי.
 */
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic | null {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  _client = new Anthropic({ apiKey });
  return _client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-5";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(
  messages: ClaudeMessage[],
  systemPrompt?: string
): Promise<string> {
  const client = getClaudeClient();
  if (!client) {
    return "[AI לא זמין - הגדר ANTHROPIC_API_KEY ב-.env.local]";
  }

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export async function summarizeText(text: string, locale: string = "he"): Promise<string> {
  const systemPrompt =
    locale === "he"
      ? "אתה עוזר ב-PMO++, פלטפורמת ניהול פרויקטים. סכם בעברית באופן תמציתי וענייני, עד 3 שורות. התמקד בעובדות, פעולות ותאריכים."
      : "You are a PMO++ assistant. Summarize concisely in 3 lines or less. Focus on facts, actions, and dates.";
  return chat([{ role: "user", content: text }], systemPrompt);
}
