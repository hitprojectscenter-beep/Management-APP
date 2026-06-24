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
