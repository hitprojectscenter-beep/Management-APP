"use client";
import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Speech recognition hook with dual-mode support:
 *
 * Mode 1: Web Speech API (Chrome desktop/Android, Edge)
 *   - Real-time streaming transcription
 *   - Interim results while speaking
 *
 * Mode 2: MediaRecorder fallback (iOS Safari, Firefox, any browser without
 *   Web Speech API)
 *   - Records audio as WAV/WebM
 *   - onFinalResult called with "[audio recorded]" placeholder
 *   - In production, the audio blob would be sent to Whisper/Google STT
 *
 * Both modes require HTTPS (available on Vercel).
 */

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  onFinalResult?: (transcript: string) => void;
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
  const { lang = "he-IL", continuous = false, onFinalResult, onError } = options;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [mode, setMode] = useState<"speech-api" | "media-recorder" | "none">("none");

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Detect support on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      setMode("speech-api");
      setSupported(true);
    } else if (navigator.mediaDevices && typeof MediaRecorder !== "undefined") {
      setMode("media-recorder");
      setSupported(true);
    } else {
      setMode("none");
      setSupported(false);
    }
  }, []);

  // ============================================
  // Web Speech API mode
  // ============================================
  const startSpeechApi = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

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
      if (interimText) setInterim(interimText);
      if (finalText) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalText);
        setInterim("");
        if (onFinalResult) onFinalResult(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      const msg = event.error || "Unknown error";
      // "not-allowed" = user denied mic permission
      // "no-speech" = silence timeout (not a real error)
      if (msg === "no-speech") {
        setListening(false);
        return;
      }
      setError(
        msg === "not-allowed"
          ? "נדרשת הרשאת מיקרופון. בדוק את הגדרות הדפדפן."
          : msg
      );
      setListening(false);
      if (onError) onError(msg);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    }
  }, [lang, continuous, onFinalResult, onError]);

  // ============================================
  // MediaRecorder fallback mode (iOS Safari, Firefox)
  // ============================================
  const startMediaRecorder = useCallback(async () => {
    try {
      setError(null);
      setInterim("🎤 מקליט...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setListening(false);
        setInterim("");
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const sizeKB = Math.round(blob.size / 1024);
          // In demo mode: we don't have a server-side STT service,
          // so we notify the user the audio was recorded
          const msg = `[הקלטה של ${sizeKB}KB נשמרה - לחיבור Whisper API צריך ANTHROPIC_API_KEY]`;
          setTranscript(msg);
          if (onFinalResult) onFinalResult(msg);
        }
      };

      recorder.onerror = () => {
        setError("שגיאה בהקלטה");
        setListening(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // 1s chunks
      setListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mic access denied";
      setError(
        msg.includes("NotAllowed") || msg.includes("Permission")
          ? "נדרשת הרשאת מיקרופון. לחץ על אייקון המנעול בשורת הכתובת."
          : msg
      );
      if (onError) onError(msg);
    }
  }, [onFinalResult, onError]);

  // ============================================
  // Unified start/stop
  // ============================================
  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    if (mode === "speech-api") {
      startSpeechApi();
    } else if (mode === "media-recorder") {
      startMediaRecorder();
    }
  }, [mode, startSpeechApi, startMediaRecorder]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    setListening(false);
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
