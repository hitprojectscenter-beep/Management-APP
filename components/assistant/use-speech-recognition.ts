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
 * sentence-ending punctuation. Also strips English words from Hebrew
 * text (and vice versa) to prevent TTS from switching voices mid-sentence.
 *
 * @param text — raw assistant response
 * @param targetLang — "he" keeps Hebrew only, "en" keeps English only, "both" keeps both
 */
function cleanTextForSpeech(text: string, targetLang: "he" | "en" | "both" = "both"): string {
  let t = text;

  // 1) Remove ALL emoji — broad catch-all with Unicode property escapes
  t = t.replace(/\p{Extended_Pictographic}/gu, " ");
  // Also zero-width joiners + variation selectors
  t = t.replace(/[\u{200D}\u{FE00}-\u{FE0F}]/gu, "");

  // 2) Remove code/markdown/structural symbols that TTS reads aloud
  //    (keep periods, commas, question marks, exclamation for sentence flow)
  const noisyChars = /[`~!@#$%^&*_=+|\\<>{}[\]()"'•●▪◦→←↑↓⇒⇐★☆♦♥♠♣§¶†‡«»‹›"""''‚„•·…]/g;
  t = t.replace(noisyChars, " ");

  // 3) Slashes between words → "או" (Hebrew) or "or" (English)
  if (targetLang === "he") {
    t = t.replace(/(\S)\s*\/\s*(\S)/g, "$1 או $2");
  } else {
    t = t.replace(/(\S)\s*\/\s*(\S)/g, "$1 or $2");
  }
  // Remove remaining slashes and dashes between/around Hebrew words
  t = t.replace(/[-–—−]/g, " ");
  t = t.replace(/\//g, " ");

  // 4) Strip the "other" language's Latin/Hebrew words to keep TTS consistent
  //    (prevents voice switching mid-sentence which is the main "sounds broken" issue)
  if (targetLang === "he") {
    // Hebrew mode: remove Latin alphabetic runs of 2+ letters (keep single letters, abbreviations)
    // but keep numbers and basic Hebrew-mixed words
    t = t.replace(/[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})*/g, "");
  } else if (targetLang === "en") {
    // English mode: remove Hebrew character runs
    t = t.replace(/[\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)*/g, "");
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

  // 8) Cap length for TTS — speak first 400 chars max (avoid Chrome 15s cutoff)
  //    Try to break at sentence boundary
  if (t.length > 400) {
    const cut = t.slice(0, 400);
    const lastPeriod = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    t = lastPeriod > 200 ? cut.slice(0, lastPeriod + 1) : cut + "...";
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
 * Pick the best voice for the given language code.
 * Falls back: exact match → prefix match → any voice.
 */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const prefix = lang.split("-")[0];
  const byPrefix = voices.find((v) => v.lang.startsWith(prefix));
  if (byPrefix) return byPrefix;
  // For Hebrew, also check common alternative codes
  if (prefix === "he") {
    const iw = voices.find((v) => v.lang.startsWith("iw")); // older Hebrew code
    if (iw) return iw;
  }
  return null;
}

/**
 * Text-to-speech helper — cleans text, waits for voices, picks best voice.
 * Targets the specified language and strips the OTHER language from the text
 * so TTS doesn't switch voices mid-sentence.
 */
export async function speak(text: string, lang: string = "he-IL"): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("[speak] SpeechSynthesis not supported");
    return;
  }
  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    // Some browsers need a brief pause after cancel
    await new Promise((r) => setTimeout(r, 50));

    // Clean text — target the specified language, strip the other
    const langCode = lang.split("-")[0] as "he" | "en" | "ru" | "fr" | "es";
    const targetLang: "he" | "en" | "both" = langCode === "he" ? "he" : langCode === "en" ? "en" : "both";
    const clean = cleanTextForSpeech(text, targetLang);
    if (!clean || clean.length < 2) {
      console.warn("[speak] Text became empty after cleaning, skipping");
      return;
    }

    // Load voices (async in Chrome)
    const voices = await loadVoices();
    const voice = pickVoice(voices, lang);

    // If targeting Hebrew but no Hebrew voice — warn and skip to avoid English-accented Hebrew
    if (lang === "he-IL" && !voice) {
      console.warn("[speak] No Hebrew voice installed — skipping TTS to avoid bad pronunciation. Install Hebrew TTS voice in OS settings.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (voice) {
      utterance.voice = voice;
      console.log(`[speak] Using voice: ${voice.name} (${voice.lang}) for lang=${lang}`);
    } else {
      console.warn(`[speak] No voice found for ${lang}. Using browser default.`);
    }

    // Handle errors silently but log them
    utterance.onerror = (e) => {
      console.warn("[speak] TTS error:", (e as any).error || e);
    };
    utterance.onstart = () => console.log("[speak] TTS started");
    utterance.onend = () => console.log("[speak] TTS ended");

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
  }
}
