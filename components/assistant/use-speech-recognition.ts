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
 * Text-to-speech helper
 */
export function speak(text: string, lang: string = "he-IL"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch {}
}
