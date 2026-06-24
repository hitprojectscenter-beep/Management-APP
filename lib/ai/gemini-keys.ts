/**
 * Gemini API key management with rotation.
 *
 * The recurring pain point: a single free-tier Gemini key has a hard
 * daily quota, and video/audio transcription burns it fast. When the
 * key 429s, the whole intake fails.
 *
 * Fix: support MULTIPLE keys. The system tries them in order and rotates
 * to the next one on a quota (429 / RESOURCE_EXHAUSTED) error — so two or
 * three free keys (from different Google projects) effectively multiply
 * the daily quota, with zero paid tier.
 *
 * Keys are read from (in order, deduped):
 *   • GEMINI_API_KEY            — may itself be a comma-separated list
 *   • GEMINI_API_KEY_2 / _3 / _4
 *   • GOOGLE_API_KEY            — legacy fallback
 */

export function getGeminiApiKeys(): string[] {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env["GEMINI_API_KEY "], // tolerate a trailing space in the var name
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GOOGLE_API_KEY,
  ]
    .filter((v): v is string => !!v)
    // Any single var may hold several comma/whitespace-separated keys.
    .flatMap((v) => v.split(/[,\s]+/))
    .map((k) => k.trim())
    .filter(Boolean);
  // Dedupe, preserve order.
  return [...new Set(candidates)];
}

/** First configured key (or null) — for callers that only need one. */
export function getGeminiApiKey(): string | null {
  return getGeminiApiKeys()[0] ?? null;
}

/** Is this a quota / rate-limit error we should rotate keys on? */
export function isQuotaError(status: number, bodyText = ""): boolean {
  return status === 429 || /RESOURCE_EXHAUSTED|exceeded.*quota|quota.*exceeded/i.test(bodyText);
}

/** Parse Gemini's suggested retry delay (e.g. "retryDelay":"27s") → ms. */
export function parseRetryDelayMs(bodyText: string): number | null {
  const m = bodyText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : null;
}

/** Transient "model is busy" error (503 / overloaded / UNAVAILABLE). Unlike
 *  429 quota, this is Google's capacity problem and a short retry usually
 *  succeeds — so we must NOT treat it like an exhausted key. */
export function isOverloadedError(status: number, bodyText = ""): boolean {
  return status === 503 || /high demand|overloaded|UNAVAILABLE|try again/i.test(bodyText);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

export interface GeminiCallResult {
  ok: boolean;
  data?: any;
  status?: number;
  errText?: string;
  quota?: boolean;
  overloaded?: boolean;
}

/** Concatenate all text parts of a Gemini response. Works for every call
 *  shape we use (single-part chat, multi-part transcription/OCR). */
export function geminiExtractText(data: any): string {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * One generateContent call to a specific (model, key), with RETRY on
 * transient 503/overload (Google capacity) — 3 attempts, 2s then 4s
 * backoff. Quota (429) is returned immediately (no point retrying the
 * same model). Callers loop models × keys around this.
 */
export async function geminiCall(model: string, apiKey: string, body: unknown): Promise<GeminiCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt < 2) { await sleep(1500 * (attempt + 1)); continue; }
      return { ok: false, status: 0, errText: String(e) };
    }
    if (res.ok) return { ok: true, data: await res.json() };
    const errText = await res.text().catch(() => "");
    const overloaded = isOverloadedError(res.status, errText);
    // Retry the SAME model on transient overload (the model's quota may be
    // fine — Google is just busy). Don't retry on quota.
    if (overloaded && attempt < 2) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    return { ok: false, status: res.status, errText, quota: isQuotaError(res.status, errText), overloaded };
  }
  return { ok: false, status: 503, errText: "overloaded — retries exhausted", overloaded: true };
}

/**
 * Run a generateContent body across every (key × model) combination with
 * 503-retry, returning the first successful text. This is the single
 * resilient entry point — used for extraction, OCR, and inline audio.
 *
 * Crucially it tries ALL models for each key (no early break on 429),
 * because free-tier quota is PER-MODEL: gemini-2.0-flash can still have
 * quota when gemini-2.0-flash-lite is exhausted.
 */
export async function geminiGenerateText(body: unknown, label = "gemini"): Promise<string> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY not set");
  let lastErr: Error | null = null;
  for (let k = 0; k < keys.length; k++) {
    for (const model of GEMINI_MODELS) {
      const r = await geminiCall(model, keys[k], body);
      if (r.ok) {
        const text = geminiExtractText(r.data);
        if (text) return text;
        lastErr = new Error(`${label} ${model} returned no text`);
        continue;
      }
      lastErr = new Error(`${label} ${model} ${r.status}: ${(r.errText || "").slice(0, 200)}`);
      console.warn(`[${label}] key#${k + 1} ${model} failed (${r.status}):`, (r.errText || "").slice(0, 90));
      // Always continue to the next model/key — never give up on one error.
    }
  }
  throw lastErr ?? new Error(`${label}: all keys/models failed`);
}
