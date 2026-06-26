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
  // IMPORTANT: read each var with an EXPLICIT static `process.env.X`. Next.js
  // only reliably exposes statically-referenced env vars to serverless
  // functions — enumerating `Object.keys(process.env)` returned EMPTY on
  // Vercel, which silently disabled Gemini (everything fell to the
  // heuristic with no error). PAID keys (_P / _PAID) are listed FIRST so
  // they're tried before the (exhausted) free keys — no wasted 429s.
  const candidates = [
    process.env.GEMINI_API_KEY_P, // paid → first
    process.env.GEMINI_API_KEY_PAID,
    process.env.GEMINI_API_KEY, // original primary
    process.env["GEMINI_API_KEY "], // tolerate a trailing space in the var name
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GOOGLE_API_KEY,
  ]
    .filter((v): v is string => !!v)
    // Any single var may itself hold several comma/whitespace-separated keys.
    .flatMap((v) => v.split(/[,\s]+/))
    .map((k) => k.trim())
    .filter(Boolean);
  return [...new Set(candidates)]; // dedupe, preserve order
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

// Model fallback chain — ONLY models verified live against the API (HTTP 200):
//   • gemini-2.5-flash         — best quality, GA, stable. Primary.
//   • gemini-flash-latest      — alias Google keeps pointed at the latest flash.
//   • gemini-flash-lite-latest — alias to the latest lite (cheapest, most
//     available) — the last-resort "just get a response".
// REMOVED (return 404 "no longer available" on our keys): gemini-2.0-flash AND
// gemini-2.0-flash-lite. The *-latest ALIASES future-proof us — Google keeps
// them pointed at a live model, so they can't 404 for being retired.
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

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
  const MAX_ATTEMPTS = 4; // 1 try + 3 retries on transient overload
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt < MAX_ATTEMPTS - 1) { await sleep(1500 * (attempt + 1)); continue; }
      return { ok: false, status: 0, errText: String(e) };
    }
    if (res.ok) return { ok: true, data: await res.json() };
    const errText = await res.text().catch(() => "");
    const overloaded = isOverloadedError(res.status, errText);
    // Retry the SAME model on transient overload (the model's quota may be
    // fine — Google is just busy). Backoff 1.5s, 3s, 6s. Don't retry on quota.
    if (overloaded && attempt < MAX_ATTEMPTS - 1) {
      await sleep(1500 * Math.pow(2, attempt));
      continue;
    }
    return { ok: false, status: res.status, errText, quota: isQuotaError(res.status, errText), overloaded };
  }
  return { ok: false, status: 503, errText: "overloaded — retries exhausted", overloaded: true };
}

/**
 * Cheap quota probe: is this key usable on ANY model right now? Sends a
 * 1-token request per model (no 503-retry, so it's fast). Returns false
 * only when EVERY model 429s (key fully quota-exhausted). On 503/other
 * it returns true — "maybe busy, let the real call try". Used by the
 * video path to avoid re-uploading a 200 MB file to a dead key.
 */
export async function probeKeyAvailable(apiKey: string): Promise<boolean> {
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: "hi" }] }],
    generationConfig: { maxOutputTokens: 1 },
  });
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
      );
      if (res.ok) return true;
      const t = await res.text().catch(() => "");
      if (!isQuotaError(res.status, t)) return true; // 503/other — let the real call try
    } catch {
      return true; // network blip — don't write off the key
    }
  }
  return false; // every model returned 429 — this key is exhausted
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
  let lastRealErr: Error | null = null; // non-404 — preferred for the user-facing message
  for (let k = 0; k < keys.length; k++) {
    for (const model of GEMINI_MODELS) {
      const r = await geminiCall(model, keys[k], body);
      if (r.ok) {
        const text = geminiExtractText(r.data);
        if (text) return text;
        lastErr = new Error(`${label} ${model} returned no text`);
        lastRealErr = lastErr;
        continue;
      }
      lastErr = new Error(`${label} ${model} ${r.status}: ${(r.errText || "").slice(0, 200)}`);
      // A 404 means the model was retired (code issue, not the user's quota) —
      // don't let it mask a real quota/overload error in the surfaced message.
      if (r.status !== 404) lastRealErr = lastErr;
      console.warn(`[${label}] key#${k + 1} ${model} failed (${r.status}):`, (r.errText || "").slice(0, 90));
      // Always continue to the next model/key — never give up on one error.
    }
  }
  throw lastRealErr ?? lastErr ?? new Error(`${label}: all keys/models failed`);
}
