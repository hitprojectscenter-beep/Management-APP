"use client";
import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { useSpeechRecognition, speak } from "./use-speech-recognition";
import { toast } from "sonner";
import { CURRENT_USER_ID, getUserById } from "@/lib/db/mock-data";

type Stage = "idle" | "listening" | "processing" | "clarification" | "confirmation" | "blocked" | "executing" | "done";

interface Turn {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface ServerResponse {
  stage: "clarification" | "confirmation" | "blocked" | "query_response";
  intent: any;
  gaps: Array<{
    field: string;
    prompt: Record<string, string>;
    suggestions?: { value: string; label: string }[];
  }>;
  conflicts: Array<{
    type: string;
    blocking: boolean;
    message: Record<string, string>;
    suggestion?: Record<string, string>;
  }>;
  summary: string;
}

// Detect if a string contains specific script characters
const hasHebrewChars = (text: string) => /[\u0590-\u05FF]/.test(text || "");
const hasCyrillicChars = (text: string) => /[\u0400-\u04FF]/.test(text || "");

// Determine effective language from text + locale
// Priority: 1) Text script detection  2) UI locale  3) Hebrew default
const detectLang = (text: string, locale: string): string => {
  if (hasHebrewChars(text)) return "he";
  if (hasCyrillicChars(text)) return "ru";
  // Latin-based text: use locale to distinguish en/fr/es
  if (locale === "fr" || locale === "es" || locale === "en" || locale === "ru") return locale;
  return "he"; // Default
};

// TTS language codes
const TTS_LANG: Record<string, string> = {
  he: "he-IL", en: "en-US", ru: "ru-RU", fr: "fr-FR", es: "es-ES",
};

// Welcome messages per language
const WELCOME_MESSAGES: Record<string, string> = {
  he: "שלום! 👋 אני העוזר האישי שלך ב-PMO++.\n\nאפשר לדבר איתי או לכתוב. דוגמאות:\n• \"הסבר לי על לוח גאנט\"\n• \"פתח משימה חדשה\"\n• \"מה הסיכונים?\"\n• \"מי הכי עמוס?\"\n• \"איך מגדירים KPI?\"\n\n🎤 אפשר גם להקליט!",
  en: "Hi! 👋 I'm your PMO++ Personal Assistant.\n\nYou can speak or type. Examples:\n• \"Explain the Gantt chart\"\n• \"Create a new task\"\n• \"What are the risks?\"\n• \"Who is most loaded?\"\n\n🎤 Voice recording available!",
  ru: "Привет! 👋 Я ваш личный помощник PMO++.\n\nМожно говорить или писать. Примеры:\n• \"Объясни диаграмму Ганта\"\n• \"Создай новую задачу\"\n• \"Какие риски?\"\n• \"Кто больше всех загружен?\"\n\n🎤 Запись голоса доступна!",
  fr: "Bonjour ! 👋 Je suis votre assistant personnel PMO++.\n\nParlez ou tapez. Exemples :\n• \"Explique le diagramme de Gantt\"\n• \"Crée une nouvelle tâche\"\n• \"Quels sont les risques ?\"\n• \"Qui est le plus chargé ?\"\n\n🎤 Enregistrement vocal disponible !",
  es: "¡Hola! 👋 Soy tu asistente personal de PMO++.\n\nHabla o escribe. Ejemplos:\n• \"Explica el diagrama de Gantt\"\n• \"Crea una nueva tarea\"\n• \"¿Cuáles son los riesgos?\"\n• \"¿Quién está más cargado?\"\n\n🎤 ¡Grabación de voz disponible!",
};

// Fallback messages per language
const FALLBACK: Record<string, { noData: string; helpMore: string; error: string; confirm: string }> = {
  he: { noData: "אין מספיק נתונים. נסה שאלה אחרת.", helpMore: "במה עוד אוכל לעזור?", error: "שגיאה", confirm: "✅ הבנתי! בוא נוודא שהכל נכון:" },
  en: { noData: "Not enough data. Try another question.", helpMore: "What else can I help with?", error: "Error", confirm: "✅ Got it! Let me confirm:" },
  ru: { noData: "Недостаточно данных. Попробуйте другой вопрос.", helpMore: "Чем ещё могу помочь?", error: "Ошибка", confirm: "✅ Понял! Давайте подтвердим:" },
  fr: { noData: "Pas assez de données. Essayez une autre question.", helpMore: "Comment puis-je vous aider ?", error: "Erreur", confirm: "✅ Compris ! Confirmons :" },
  es: { noData: "Datos insuficientes. Prueba otra pregunta.", helpMore: "¿En qué más puedo ayudar?", error: "Error", confirm: "✅ ¡Entendido! Confirmemos:" },
};

export function PersonalAssistant() {
  const locale = useLocale();
  const currentUser = getUserById(CURRENT_USER_ID);
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputText, setInputText] = useState("");
  const [carryover, setCarryover] = useState<any>(null);
  const [carryoverAction, setCarryoverAction] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<ServerResponse | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true); // TTS ON by default - assistant speaks back
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTextRef = useRef<(text: string) => void>(() => {});

  const {
    supported: speechSupported,
    listening,
    error: speechError,
    mode,
    interim,
    start: startListening,
    stop: stopListening,
    reset: resetSpeech,
  } = useSpeechRecognition({
    lang: locale === "he" ? "he-IL" : "en-US",
    continuous: false,
    // When speech recognition returns final text → AUTO-SUBMIT immediately.
    // No need for the user to press Send manually after speaking.
    onFinalResult: (text) => {
      if (text && text.trim() && !text.startsWith("[")) {
        // Real transcribed text → submit automatically
        submitTextRef.current(text.trim());
      } else if (text) {
        // MediaRecorder placeholder → put in input for user to type over
        setInputText(text);
      }
    },
    // Show interim (partial) text in real-time while user is speaking
    onInterim: (text) => {
      setInputText(text);
    },
  });

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, currentResponse, interim]);

  // Keep submitTextRef pointing to the latest submitText function
  useEffect(() => {
    submitTextRef.current = submitText;
  });

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Welcome message on first open — in the user's UI language
  useEffect(() => {
    if (isOpen && turns.length === 0) {
      setTurns([
        {
          role: "assistant",
          text: WELCOME_MESSAGES[locale] || WELCOME_MESSAGES.he,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isOpen, turns.length, locale]);

  const submitText = async (text: string) => {
    if (!text.trim() || stage === "processing" || stage === "executing") return;

    // If user is mid-recording, stop listening first so we don't double-submit
    if (listening) {
      try {
        stopListening();
      } catch {}
    }

    const userTurn: Turn = { role: "user", text, timestamp: Date.now() };
    setTurns((prev) => [...prev, userTurn]);
    setInputText("");
    setStage("processing");
    resetSpeech();
    // Reset textarea height
    try {
      const ta = (inputRef as any).current;
      if (ta) ta.style.height = "44px";
    } catch {}

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          locale,
          carryover,
          carryoverAction,
          mode: "parse",
        }),
      });
      const data: ServerResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any).error || "Server error");
      }

      setCurrentResponse(data);
      // Keep the carryover so subsequent turns continue the same intent
      setCarryover(data.intent?.entities || null);
      setCarryoverAction(data.intent?.action || null);

      // Generate assistant reply based on stage
      // Detect language from user text + locale for fallback messages
      const lang = detectLang(text, locale);
      const fb = FALLBACK[lang] || FALLBACK.he;
      let reply = "";
      if (data.stage === "blocked") {
        setStage("idle");
        reply = data.conflicts
          .filter((c) => c.blocking)
          .map((c) => `⛔ ${c.message[lang] || c.message.he || c.message.en}${c.suggestion ? `\n💡 ${c.suggestion[lang] || c.suggestion.he || c.suggestion.en}` : ""}`)
          .join("\n\n");
      } else if (data.stage === "clarification") {
        setStage("idle");
        reply = data.gaps.map((g) => `❓ ${g.prompt[lang] || g.prompt.he || g.prompt.en}`).join("\n");
      } else if (data.stage === "confirmation") {
        setStage("confirmation");
        reply = fb.confirm;
      } else if (data.stage === "query_response") {
        setStage("idle");
        reply = data.intent?.responseText || fb.noData;
      } else {
        setStage("idle");
        reply = data.intent?.responseText || fb.helpMore;
      }

      const assistantTurn: Turn = { role: "assistant", text: reply, timestamp: Date.now() };
      setTurns((prev) => [...prev, assistantTurn]);
      // TTS: detect language from reply text for correct speech
      const ttsLang = hasHebrewChars(reply) ? "he" : hasCyrillicChars(reply) ? "ru" : lang;
      if (ttsEnabled) speak(reply, TTS_LANG[ttsLang] || "he-IL");
    } catch (err) {
      setStage("idle");
      const errLang = detectLang(text, locale);
      const efb = FALLBACK[errLang] || FALLBACK.he;
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `${efb.error}: ${err instanceof Error ? err.message : "unknown"}`,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const executeAction = async () => {
    if (!currentResponse) return;
    setStage("executing");
    try {
      const res = await fetch("/api/assistant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: currentResponse.intent }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          txt(locale, { he: "הפעולה בוצעה בהצלחה!", en: "Action completed successfully!" }),
          {
            description: txt(locale, { he: "המשימה נוספה למערכת ותועדה ביומן הביקורת.", en: "Task added and recorded in audit log." }),
          }
        );
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            text: txt(locale, { he: "✅ בוצע! המשימה נרשמה במערכת.", en: "✅ Done! Task recorded." }),
            timestamp: Date.now(),
          },
        ]);
        setStage("done");
        // Reset carryover
        setCarryover(null);
        setCarryoverAction(null);
        setCurrentResponse(null);
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (err) {
      setStage("blocked");
      toast.error(txt(locale, { he: "הפעולה נכשלה", en: "Action failed" }));
    }
  };

  const cancelAction = () => {
    setStage("idle");
    setCurrentResponse(null);
    setCarryover(null);
    setCarryoverAction(null);
    setTurns((prev) => [
      ...prev,
      {
        role: "assistant",
        text: txt(locale, { he: "ביטלתי. במה עוד אוכל לעזור?", en: "Cancelled. What else can I help with?" }),
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSuggestionClick = (_field: string, _value: string, label: string) => {
    // User tapped a suggestion chip during clarification.
    // Submit the label as a free-text reply; the server will re-parse and
    // resolve it against real projects/users via fuzzy name matching.
    if (stage === "processing" || stage === "executing") return;
    submitText(label);
  };

  const toggleMic = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ============================================
  // Floating launch button (when closed)
  // ============================================
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 start-6 z-[75] size-14 rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-2xl hover:shadow-violet-500/50 hover:scale-110 transition-all flex items-center justify-center group"
        aria-label={txt(locale, { he: "פתח עוזר אישי", en: "Open Personal Assistant" })}
        title={txt(locale, { he: "עוזר אישי (דיבור או כתיבה)", en: "Personal Assistant (voice or text)" })}
      >
        <Sparkles className="size-6" />
        <span className="absolute -top-1 -end-1 size-3 rounded-full bg-amber-400 animate-pulse" />
        <span
          className={cn(
            "absolute start-full ms-3 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          )}
        >
          {txt(locale, { he: "עוזר אישי", en: "Personal Assistant", ru: "Личный помощник", fr: "Assistant personnel", es: "Asistente personal" })} 🎤
        </span>
      </button>
    );
  }

  // ============================================
  // Chat panel (when open)
  // ============================================
  return (
    <div className="fixed bottom-6 start-6 z-[95] w-[min(440px,calc(100vw-2rem))] h-[min(680px,calc(100vh-3rem))] bg-card border-2 border-violet-300 dark:border-violet-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="font-bold text-base">
              {txt(locale, { he: "עוזר אישי", en: "Personal Assistant", ru: "Личный помощник", fr: "Assistant personnel", es: "Asistente personal" })}
            </div>
            <div className="text-[11px] opacity-90 flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  stage === "listening"
                    ? "bg-red-400 animate-pulse"
                    : stage === "processing"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-emerald-400"
                )}
              />
              {stage === "listening" && txt(locale, { he: "מקשיב...", en: "Listening..." })}
              {stage === "processing" && txt(locale, { he: "מעבד...", en: "Processing..." })}
              {stage === "clarification" && txt(locale, { he: "ממתין למידע נוסף", en: "Awaiting info" })}
              {stage === "confirmation" && txt(locale, { he: "ממתין לאישור", en: "Awaiting confirmation" })}
              {stage === "blocked" && txt(locale, { he: "חסום", en: "Blocked" })}
              {(stage === "idle" || stage === "done") && txt(locale, { he: "מוכן", en: "Ready" })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={cn(
              "size-8 rounded-full flex items-center justify-center text-[10px] font-bold",
              ttsEnabled ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
            )}
            title={txt(locale, { he: "הפעל/כבה דיבור", en: "Toggle TTS" })}
          >
            TTS
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="size-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages - dialog format: "מארק:" / "עוזר:" */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {turns.map((turn, idx) => {
          const senderName =
            turn.role === "user"
              ? currentUser?.name?.split(" ")[0] || txt(locale, { he: "אתה", en: "You" })
              : txt(locale, { he: "עוזר", en: "Assistant" });

          return (
            <div
              key={idx}
              className={cn(
                "flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200",
                turn.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center shrink-0 shadow-sm text-[10px] font-bold",
                  turn.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gradient-to-br from-violet-600 to-indigo-700 text-white"
                )}
              >
                {turn.role === "user" ? (
                  <UserIcon className="size-4" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm max-w-[85%] shadow-sm",
                  turn.role === "user"
                    ? "bg-primary text-primary-foreground rounded-se-sm"
                    : "bg-background border rounded-ss-sm"
                )}
              >
                <div className="text-[10px] font-bold mb-0.5 opacity-80">
                  {senderName}:
                </div>
                <div className="whitespace-pre-line">{turn.text}</div>
              </div>
            </div>
          );
        })}

        {/* Interim (live speech-to-text) */}
        {interim && (
          <div className="flex gap-2 flex-row-reverse">
            <div className="size-8 rounded-full bg-primary/60 flex items-center justify-center shrink-0">
              <Mic className="size-4 text-white animate-pulse" />
            </div>
            <div className="rounded-2xl px-3.5 py-2 text-sm bg-primary/20 border border-primary/30 italic">
              {interim}
            </div>
          </div>
        )}

        {/* Processing spinner */}
        {stage === "processing" && (
          <div className="flex gap-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
              <Loader2 className="size-4 text-white animate-spin" />
            </div>
            <div className="rounded-2xl px-3.5 py-2 bg-background border text-sm italic text-muted-foreground">
              {txt(locale, { he: "מעבד את הבקשה שלך...", en: "Processing your request..." })}
            </div>
          </div>
        )}

        {/* Clarification suggestions */}
        {stage === "clarification" && currentResponse && currentResponse.gaps.length > 0 && (
          <div className="space-y-2">
            {currentResponse.gaps.map((gap, i) =>
              gap.suggestions && gap.suggestions.length > 0 ? (
                <div key={i} className="flex flex-wrap gap-1.5 ps-10">
                  {gap.suggestions.slice(0, 6).map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleSuggestionClick(gap.field, s.value, s.label)}
                      className="px-2.5 py-1 rounded-full bg-violet-100 hover:bg-violet-200 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 text-violet-800 dark:text-violet-200 text-xs font-medium transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Confirmation card */}
        {stage === "confirmation" && currentResponse && (
          <div className="ms-10 border-2 border-violet-400 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden shadow-md">
            <div className="px-3 py-2 bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              {txt(locale, { he: "אישור לפני ביצוע", en: "Confirm before executing" })}
            </div>
            <div className="p-3 text-sm whitespace-pre-line font-mono">{currentResponse.summary}</div>
            {currentResponse.conflicts.length > 0 && (
              <div className="px-3 pb-2 space-y-1">
                {currentResponse.conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="text-[11px] p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 flex items-start gap-1"
                  >
                    <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                    <span>{c.message[locale]}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="px-3 pb-3 flex gap-2">
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={executeAction}>
                <CheckCircle2 className="size-3.5" />
                {txt(locale, { he: "אשר וצור", en: "Confirm & Create" })}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelAction}>
                <XCircle className="size-3.5" />
                {txt(locale, { he: "בטל", en: "Cancel" })}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Input area - both typing and recording work together.
          The user can: type freely, press Enter to send, click the mic to
          record (optional), and press the send button. Typing is never
          blocked by recording. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitText(inputText);
        }}
        className="p-3 border-t bg-card flex gap-2 items-center"
      >
        {/* Mic button (optional input mode) */}
        {speechSupported ? (
          <Button
            type="button"
            size="icon"
            variant={listening ? "destructive" : "outline"}
            onClick={toggleMic}
            className={cn(
              "min-w-[44px] min-h-[44px] shrink-0",
              listening && "animate-pulse"
            )}
            title={
              listening
                ? txt(locale, { he: "הפסק הקלטה", en: "Stop recording" })
                : txt(locale, { he: "הקלט הודעה קולית", en: "Record voice message" })
            }
            aria-label={
              listening
                ? txt(locale, { he: "הפסק הקלטה", en: "Stop recording" })
                : txt(locale, { he: "התחל הקלטה", en: "Start recording" })
            }
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled
            title={txt(locale, { he: "הדפדפן שלך לא תומך בזיהוי דיבור", en: "Speech not supported in this browser" })}
            className="min-w-[44px] min-h-[44px] shrink-0"
          >
            <MicOff className="size-4 opacity-50" />
          </Button>
        )}

        {/* Flexible textarea that grows with content.
            Always editable - only disabled while server is processing.
            Recording does NOT disable it. */}
        <textarea
          ref={inputRef as any}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            // Auto-grow: reset to 1 row then expand to content
            const el = e.target;
            el.style.height = "44px";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (inputText.trim() && stage !== "processing" && stage !== "executing") {
                submitText(inputText);
                // Reset textarea height after submit
                const el = e.target as HTMLTextAreaElement;
                setTimeout(() => { el.style.height = "44px"; }, 50);
              }
            }
          }}
          onFocus={(e) => {
            // On mobile: scroll into view when keyboard appears
            setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
          }}
          placeholder={
            listening
              ? txt(locale, { he: "🎤 מקשיב... (אפשר גם לכתוב)", en: "🎤 Listening... (you can also type)" })
              : txt(locale, { he: "כתוב הודעה או לחץ על 🎤...", en: "Type a message or tap 🎤..." })
          }
          disabled={stage === "processing" || stage === "executing"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          rows={1}
          className="flex-1 bg-muted/30 border rounded-lg min-h-[44px] max-h-[120px] py-2.5 px-3 text-base resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
          style={{ fontSize: "16px", lineHeight: "1.4" }}
        />

        {/* Send button - works for both typed and dictated text */}
        <Button
          type="submit"
          size="icon"
          disabled={!inputText.trim() || stage === "processing" || stage === "executing"}
          className="min-w-[44px] min-h-[44px] shrink-0"
          aria-label={txt(locale, { he: "שלח", en: "Send" })}
          title={txt(locale, { he: "שלח הודעה (Enter)", en: "Send message (Enter)" })}
        >
          <Send className="size-4" />
        </Button>
      </form>

      {/* Speech error display - shows mic permission instructions */}
      {speechError && (
        <div className="px-3 py-2 border-t bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 whitespace-pre-line">
          {speechError}
        </div>
      )}

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t bg-muted/10 text-[10px] text-muted-foreground text-center">
        {`🔒 RBAC + ${txt(locale, { he: "Audit Log + אישור לפני ביצוע · מצב הקלטה", en: "Audit + Confirmation · Recording" })}: ${mode === "speech-api" ? txt(locale, { he: "זיהוי דיבור ✅", en: "Speech API ✅" }) : mode === "media-recorder" ? txt(locale, { he: "הקלטת אודיו 🎤", en: "Audio Recorder 🎤" }) : txt(locale, { he: "לא זמין ❌", en: "N/A ❌" })}`}
      </div>
    </div>
  );
}
