"use client";
import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Speech recognition hook - MOBILE FIRST design.
 *
 * Problem on mobile:
 *   - Android Chrome: SpeechRecognition exists but requires DIRECT user gesture
 *   - iOS Safari: No SpeechRecognition at all, only MediaRecorder
 *   - Both: getUserMedia needs HTTPS + user interaction
 *
 * Solution:
 *   Mode 1: Web Speech API (Chrome Android, Edge, Chrome Desktop)
 *     - Works with he-IL, real-time transcription
 *     - MUST be called from direct click handler (not async)
 *
 *   Mode 2: MediaRecorder (iOS Safari, Firefox)
 *     - Records audio, transcribes to "[recording]" placeholder
 *     - In production: send blob to Whisper API for real STT
 *
 *   Mode 3: Text-only fallback (no mic access)
 */

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  onFinalResult?: (transcript: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  supported: boolean;
  listening: boolean;
  interim: string;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
  mode: "speech-api" | "media-recorder" | "none";
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { lang = "he-IL", continuous = false, onFinalResult, onInterim, onError } = options;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [mode, setMode] = useState<"speech-api" | "media-recorder" | "none">("none");

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ============================================
  // Detect support on mount
  // ============================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check HTTPS (required for mic on mobile)
    const isSecure = location.protocol === "https:" || location.hostname === "localhost";

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionCtor && isSecure) {
      setMode("speech-api");
      setSupported(true);
    } else if (isSecure && navigator.mediaDevices && typeof MediaRecorder !== "undefined") {
      setMode("media-recorder");
      setSupported(true);
    } else if (!isSecure) {
      setMode("none");
      setSupported(false);
      setError("נדרש HTTPS להקלטה. בלוקלהוסט זה עובד.");
    } else {
      setMode("none");
      setSupported(false);
    }
  }, []);

  // ============================================
  // Web Speech API (Chrome Android + Desktop)
  // CRITICAL: recognition.start() MUST be called synchronously
  // from the click handler, NOT in a setTimeout or async function.
  // ============================================
  const startSpeechApi = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Speech API לא זמין");
      return;
    }

    // Cleanup previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = continuous;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
        setInterim("");
      };

      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }
        if (interimText) {
          setInterim(interimText);
          if (onInterim) onInterim(interimText);
        }
        if (finalText) {
          setTranscript((prev) => (prev ? prev + " " : "") + finalText);
          setInterim("");
          if (onFinalResult) onFinalResult(finalText);
        }
      };

      recognition.onerror = (event: any) => {
        const msg = event.error || "unknown";
        console.warn("[SpeechRecognition error]", msg);

        if (msg === "no-speech" || msg === "aborted") {
          // Not real errors - just timeout or user stopped
          setListening(false);
          return;
        }

        let heMsg = msg;
        if (msg === "not-allowed") {
          heMsg = "🔒 נדרשת הרשאת מיקרופון.\n\nב-Android: לחץ על 🔒 ליד שורת הכתובת → הרשאות → מיקרופון → אפשר.\n\nב-iPhone: הגדרות → Safari → מיקרופון → אפשר.";
        } else if (msg === "network") {
          heMsg = "🌐 בעיית רשת. ודא שיש חיבור אינטרנט.";
        } else if (msg === "service-not-allowed") {
          heMsg = "שירות הזיהוי הקולי לא זמין. נסה מאוחר יותר.";
        }

        setError(heMsg);
        setListening(false);
        if (onError) onError(msg);
      };

      recognition.onend = () => {
        setListening(false);
        setInterim("");
      };

      recognitionRef.current = recognition;
      // CRITICAL: start() must be SYNCHRONOUS from the user gesture
      recognition.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start speech recognition";
      console.error("[SpeechRecognition start error]", e);
      setError(msg);
      setListening(false);
    }
  }, [lang, continuous, onFinalResult, onInterim, onError]);

  // ============================================
  // MediaRecorder fallback (iOS Safari, Firefox)
  // ============================================
  const startMediaRecorder = useCallback(async () => {
    try {
      setError(null);
      setInterim("🎤 מקליט...");
      setListening(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Find supported MIME
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"]
        .find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setListening(false);
        setInterim("");
        // Release mic
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          const sizeKB = Math.round(blob.size / 1024);
          // Placeholder - in production this blob would go to Whisper API
          const msg = `[הקלטה ${sizeKB}KB שמורה - לתמלול אוטומטי נדרש Whisper API]`;
          setTranscript(msg);
          if (onFinalResult) onFinalResult(msg);
        }
      };

      recorder.onerror = () => {
        setError("שגיאה בהקלטה");
        setListening(false);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
    } catch (err) {
      setListening(false);
      setInterim("");
      const msg = err instanceof Error ? err.message : "Mic access denied";

      if (msg.includes("NotAllowed") || msg.includes("Permission") || msg.includes("denied")) {
        setError("🔒 נדרשת הרשאת מיקרופון.\n\nב-Android: לחץ על 🔒 ליד שורת הכתובת → הרשאות → מיקרופון.\n\nב-iPhone: הגדרות → Safari → מיקרופון → אפשר.");
      } else if (msg.includes("NotFound")) {
        setError("🎤 לא נמצא מיקרופון במכשיר.");
      } else {
        setError(`שגיאה: ${msg}`);
      }
      if (onError) onError(msg);
    }
  }, [onFinalResult, onError]);

  // ============================================
  // Unified start/stop - MUST be called from direct click handler
  // ============================================
  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    setError(null);

    if (mode === "speech-api") {
      // SYNCHRONOUS call - critical for mobile user gesture requirement
      startSpeechApi();
    } else if (mode === "media-recorder") {
      startMediaRecorder();
    } else {
      setError("🎤 הקלטה לא נתמכת בדפדפן זה. נסה Chrome או Safari.");
    }
  }, [mode, startSpeechApi, startMediaRecorder]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setListening(false);
    setInterim("");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { supported, listening, interim, transcript, start, stop, reset, error, mode };
}

/**
 * Clean text for TTS — AGGRESSIVE cleaning for smooth voice output.
 * Removes: all emojis, all punctuation/symbols that TTS reads aloud,
 * markdown, bullets, code markers. Keeps only letters, numbers, and
 * sentence-ending punctuation. Also strips words in OTHER scripts than
 * the target language to prevent TTS from switching voices mid-sentence.
 *
 * @param text — raw assistant response
 * @param targetLang — "he" | "en" | "ru" | "fr" | "es" | "both"
 */
type CleanLang = "he" | "en" | "ru" | "fr" | "es" | "both";

function cleanTextForSpeech(text: string, targetLang: CleanLang = "both"): string {
  let t = text;

  // 1) Remove ALL emoji — broad catch-all with Unicode property escapes
  t = t.replace(/\p{Extended_Pictographic}/gu, " ");
  // Also zero-width joiners + variation selectors
  t = t.replace(/[\u{200D}\u{FE00}-\u{FE0F}]/gu, "");

  // 2) Remove code/markdown/structural symbols that TTS reads aloud
  //    (keep periods, commas, question marks, exclamation for sentence flow)
  const noisyChars = /[`~!@#$%^&*_=+|\\<>{}[\]()"'•●▪◦→←↑↓⇒⇐★☆♦♥♠♣§¶†‡«»‹›"""''‚„•·…]/g;
  t = t.replace(noisyChars, " ");

  // 3) Slashes between words → localized "or" word for natural speech
  const orWord: Record<CleanLang, string> = {
    he: "או", en: "or", ru: "или", fr: "ou", es: "o", both: "or",
  };
  t = t.replace(/(\S)\s*\/\s*(\S)/g, `$1 ${orWord[targetLang]} $2`);

  // Remove remaining slashes and dashes around words
  t = t.replace(/[-–—−]/g, " ");
  t = t.replace(/\//g, " ");

  // 4) Strip out-of-script runs to keep TTS voice consistent.
  //    Hebrew (he): keep \u0590-\u05FF + digits; strip Latin & Cyrillic words
  //    English (en): keep Latin + digits; strip Hebrew & Cyrillic words
  //    Russian (ru): keep Cyrillic + digits; strip Hebrew & Latin words
  //    French/Spanish (fr, es): keep Latin (incl. accents) + digits; strip Hebrew & Cyrillic
  if (targetLang === "he") {
    t = t.replace(/[A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]{2,})*/g, "");
    t = t.replace(/[\u0400-\u04FF]+(?:\s+[\u0400-\u04FF]+)*/g, "");
  } else if (targetLang === "en") {
    t = t.replace(/[\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)*/g, "");
    t = t.replace(/[\u0400-\u04FF]+(?:\s+[\u0400-\u04FF]+)*/g, "");
  } else if (targetLang === "ru") {
    t = t.replace(/[\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)*/g, "");
    // Strip Latin runs of 2+ letters (keep acronyms / single letters mixed in)
    t = t.replace(/[A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]{2,})*/g, "");
  } else if (targetLang === "fr" || targetLang === "es") {
    t = t.replace(/[\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)*/g, "");
    t = t.replace(/[\u0400-\u04FF]+(?:\s+[\u0400-\u04FF]+)*/g, "");
  }

  // 5) Clean up colons and semicolons that TTS reads awkwardly
  t = t.replace(/[:;]/g, ". ");

  // 6) Normalize whitespace and newlines
  t = t.replace(/\n{2,}/g, ". ");   // paragraph breaks → pause
  t = t.replace(/\n/g, ", ");        // line breaks → short pause
  t = t.replace(/\s{2,}/g, " ");     // collapse multiple spaces
  t = t.replace(/\s*([,.!?])\s*/g, "$1 "); // normalize punctuation spacing
  t = t.replace(/([,.!?])\1+/g, "$1"); // "..." → "."
  t = t.replace(/\s+/g, " ").trim();

  // 7) Remove leading/trailing punctuation
  t = t.replace(/^[,.!?\s]+/, "").replace(/[,\s]+$/, "");

  // 8) Cap length for TTS — speak first 500 chars max (avoid Chrome 15s cutoff)
  //    Try to break at sentence boundary
  if (t.length > 500) {
    const cut = t.slice(0, 500);
    const lastPeriod = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    t = lastPeriod > 250 ? cut.slice(0, lastPeriod + 1) : cut + "...";
  }

  return t;
}

/**
 * Load voices asynchronously — voices may not be ready on first call.
 * Chrome loads voices asynchronously and fires "voiceschanged" event.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    // Wait for voices to load
    const timeout = setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

/**
 * Pick the best voice for the given language code with quality scoring.
 * Preference order:
 *   1) Exact lang match + high-quality provider (Google, Microsoft Neural/Online, Apple premium)
 *   2) Exact lang match + any voice
 *   3) Prefix match + high-quality provider
 *   4) Prefix match + any voice
 *   5) Hebrew alternative codes (iw-IL)
 *   6) null
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  // Premium/neural voices score highest
  if (name.includes("google")) score += 100;
  if (name.includes("neural") || name.includes("premium") || name.includes("enhanced")) score += 90;
  if (name.includes("microsoft") && name.includes("online")) score += 80;
  if (name.includes("microsoft")) score += 50;
  if (name.includes("apple") || name.includes("siri")) score += 70;
  // Local voices work offline — slight preference
  if (v.localService) score += 5;
  // Default voices often work best on that platform
  if (v.default) score += 10;
  return score;
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const prefix = lang.split("-")[0].toLowerCase();

  // Collect candidates: exact lang, prefix match, Hebrew alt (iw), Russian alt handled by prefix
  const exactMatches = voices.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
  const prefixMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  const hebrewAlt = prefix === "he"
    ? voices.filter((v) => v.lang.toLowerCase().startsWith("iw"))
    : [];

  // Best from exact → prefix → hebrew-alt (all ranked by quality score)
  const pickBest = (list: SpeechSynthesisVoice[]) =>
    list.length ? list.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] : null;

  return pickBest(exactMatches) || pickBest(prefixMatches) || pickBest(hebrewAlt) || null;
}

// Per-language TTS tuning — rate/pitch adjusted for natural pace per language
const LANG_TUNING: Record<string, { rate: number; pitch: number }> = {
  he: { rate: 0.95, pitch: 1.0 },
  en: { rate: 0.98, pitch: 1.0 },
  ru: { rate: 0.95, pitch: 1.0 },
  fr: { rate: 0.95, pitch: 1.0 },
  es: { rate: 1.0, pitch: 1.0 },
};

export interface SpeakOptions {
  /** Called when TTS finishes speaking naturally (not on cancel). */
  onEnd?: () => void;
  /** Called if TTS errors. */
  onError?: (error: string) => void;
  /** Called when TTS actually begins speaking. */
  onStart?: () => void;
}

/** Check whether a voice is available for the given language. */
export async function hasVoiceFor(lang: string): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const voices = await loadVoices();
  return !!pickVoice(voices, lang);
}

/** Cancel any ongoing TTS speech. */
export function cancelSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

/**
 * Text-to-speech helper — cleans text, picks the best voice for the language,
 * and strips OTHER-script words to keep the voice consistent.
 *
 * Supports all 5 app languages: he-IL, en-US, ru-RU, fr-FR, es-ES.
 *
 * @param text — raw assistant response
 * @param lang — BCP-47 language code (e.g. "he-IL", "ru-RU")
 * @param options — optional callbacks for conversation flow
 */
export async function speak(
  text: string,
  lang: string = "he-IL",
  options: SpeakOptions = {}
): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("[speak] SpeechSynthesis not supported");
    options.onError?.("not-supported");
    return;
  }
  try {
    // Cancel any ongoing speech so we don't overlap
    window.speechSynthesis.cancel();
    // Some browsers need a brief pause after cancel before starting again
    await new Promise((r) => setTimeout(r, 80));

    // Determine target language for text cleaning
    const langCode = lang.split("-")[0].toLowerCase() as CleanLang;
    const validLangs: CleanLang[] = ["he", "en", "ru", "fr", "es"];
    const targetLang: CleanLang = validLangs.includes(langCode) ? langCode : "both";

    const clean = cleanTextForSpeech(text, targetLang);
    if (!clean || clean.length < 2) {
      console.warn("[speak] Text became empty after cleaning, skipping");
      options.onEnd?.();
      return;
    }

    // Load voices (async in Chrome) and pick best match for language
    const voices = await loadVoices();
    const voice = pickVoice(voices, lang);

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    const tuning = LANG_TUNING[langCode] || { rate: 0.95, pitch: 1.0 };
    utterance.rate = tuning.rate;
    utterance.pitch = tuning.pitch;
    utterance.volume = 1.0;
    if (voice) {
      utterance.voice = voice;
      console.log(
        `[speak] lang=${lang} voice="${voice.name}" (${voice.lang}) rate=${tuning.rate}`
      );
    } else {
      console.warn(
        `[speak] No matching voice for ${lang} — using browser default (may sound incorrect)`
      );
    }

    utterance.onstart = () => {
      console.log("[speak] started");
      options.onStart?.();
    };
    utterance.onend = () => {
      console.log("[speak] ended naturally");
      options.onEnd?.();
    };
    utterance.onerror = (e) => {
      const err = (e as any).error || "unknown";
      // "interrupted" / "canceled" are normal when user starts a new message
      if (err !== "interrupted" && err !== "canceled") {
        console.warn("[speak] TTS error:", err);
        options.onError?.(err);
      }
    };

    window.speechSynthesis.speak(utterance);

    // Chrome bug: speechSynthesis stops after ~15 seconds — ping to keep it alive
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAlive);
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  } catch (err) {
    console.error("[speak] Exception:", err);
    options.onError?.(err instanceof Error ? err.message : "unknown");
  }
}
