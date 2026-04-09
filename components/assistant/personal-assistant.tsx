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
import { useSpeechRecognition, speak } from "./use-speech-recognition";
import { toast } from "sonner";

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
    prompt: { he: string; en: string };
    suggestions?: { value: string; label: string }[];
  }>;
  conflicts: Array<{
    type: string;
    blocking: boolean;
    message: { he: string; en: string };
    suggestion?: { he: string; en: string };
  }>;
  summary: string;
}

export function PersonalAssistant() {
  const locale = useLocale() as "he" | "en";
  const isHe = locale === "he";
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputText, setInputText] = useState("");
  const [carryover, setCarryover] = useState<any>(null);
  const [carryoverAction, setCarryoverAction] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<ServerResponse | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    supported: speechSupported,
    listening,
    interim,
    start: startListening,
    stop: stopListening,
    reset: resetSpeech,
  } = useSpeechRecognition({
    lang: isHe ? "he-IL" : "en-US",
    continuous: false,
    // When final text is recognized, drop it into the input field so the
    // user can review / edit / append before submitting. This is friendlier
    // than auto-submitting - voice is just a typing shortcut.
    onFinalResult: (text) => {
      setInputText((prev) => (prev.trim() ? prev + " " + text : text));
      // Return focus to the input so the user can immediately edit or press Enter
      setTimeout(() => inputRef.current?.focus(), 50);
    },
  });

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, currentResponse, interim]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && turns.length === 0) {
      setTurns([
        {
          role: "assistant",
          text: isHe
            ? "שלום! אני העוזר האישי שלך ב-Work OS. אפשר לדבר איתי או לכתוב. לדוגמה: \"פתח משימה חדשה לבדיקת שרתים מיום ראשון עד חמישי\" או \"מה הסיכונים בפרויקט CRM?\""
            : "Hi! I'm your Work OS Personal Assistant. You can speak or type. Try: \"Create a new task to check database servers from Sunday to Thursday\" or \"What are the risks in the CRM project?\"",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isOpen, turns.length, isHe]);

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
      let reply = "";
      if (data.stage === "blocked") {
        setStage("idle"); // back to idle so user can retry
        reply = data.conflicts
          .filter((c) => c.blocking)
          .map((c) => `⛔ ${c.message[locale]}${c.suggestion ? `\n💡 ${c.suggestion[locale]}` : ""}`)
          .join("\n\n");
      } else if (data.stage === "clarification") {
        setStage("idle"); // idle so user can type/speak a reply
        reply = data.gaps.map((g) => `❓ ${g.prompt[locale]}`).join("\n");
      } else if (data.stage === "confirmation") {
        setStage("confirmation");
        reply = isHe ? "✅ הבנתי! בוא נוודא שהכל נכון:" : "✅ Got it! Let me confirm:";
      } else if (data.stage === "query_response") {
        setStage("idle");
        reply = data.intent?.responseText || (isHe ? "אין מספיק נתונים לתשובה. נסה שאלה אחרת." : "Not enough data. Try another question.");
      } else {
        // Fallback - always go back to idle
        setStage("idle");
        reply = data.intent?.responseText || (isHe ? "במה עוד אוכל לעזור?" : "What else can I help with?");
      }

      const assistantTurn: Turn = { role: "assistant", text: reply, timestamp: Date.now() };
      setTurns((prev) => [...prev, assistantTurn]);
      if (ttsEnabled) speak(reply, isHe ? "he-IL" : "en-US");
    } catch (err) {
      setStage("idle");
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: isHe
            ? `שגיאה: ${err instanceof Error ? err.message : "לא ידוע"}`
            : `Error: ${err instanceof Error ? err.message : "unknown"}`,
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
          isHe ? "הפעולה בוצעה בהצלחה!" : "Action completed successfully!",
          {
            description: isHe
              ? "המשימה נוספה למערכת ותועדה ביומן הביקורת."
              : "Task added and recorded in audit log.",
          }
        );
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            text: isHe ? "✅ בוצע! המשימה נרשמה במערכת." : "✅ Done! Task recorded.",
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
      toast.error(isHe ? "הפעולה נכשלה" : "Action failed");
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
        text: isHe ? "ביטלתי. במה עוד אוכל לעזור?" : "Cancelled. What else can I help with?",
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
        aria-label={isHe ? "פתח עוזר אישי" : "Open Personal Assistant"}
        title={isHe ? "עוזר אישי (דיבור או כתיבה)" : "Personal Assistant (voice or text)"}
      >
        <Sparkles className="size-6" />
        <span className="absolute -top-1 -end-1 size-3 rounded-full bg-amber-400 animate-pulse" />
        <span
          className={cn(
            "absolute start-full ms-3 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          )}
        >
          {isHe ? "עוזר אישי 🎤" : "Personal Assistant 🎤"}
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
              {isHe ? "עוזר אישי" : "Personal Assistant"}
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
              {stage === "listening" && (isHe ? "מקשיב..." : "Listening...")}
              {stage === "processing" && (isHe ? "מעבד..." : "Processing...")}
              {stage === "clarification" && (isHe ? "ממתין למידע נוסף" : "Awaiting info")}
              {stage === "confirmation" && (isHe ? "ממתין לאישור" : "Awaiting confirmation")}
              {stage === "blocked" && (isHe ? "חסום" : "Blocked")}
              {(stage === "idle" || stage === "done") && (isHe ? "מוכן" : "Ready")}
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
            title={isHe ? "הפעל/כבה דיבור" : "Toggle TTS"}
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {turns.map((turn, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200",
              turn.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "size-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
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
                "rounded-2xl px-3.5 py-2 text-sm max-w-[85%] whitespace-pre-line shadow-sm",
                turn.role === "user"
                  ? "bg-primary text-primary-foreground rounded-se-sm"
                  : "bg-background border rounded-ss-sm"
              )}
            >
              {turn.text}
            </div>
          </div>
        ))}

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
              {isHe ? "מעבד את הבקשה שלך..." : "Processing your request..."}
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
              {isHe ? "אישור לפני ביצוע" : "Confirm before executing"}
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
                {isHe ? "אשר וצור" : "Confirm & Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelAction}>
                <XCircle className="size-3.5" />
                {isHe ? "בטל" : "Cancel"}
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
                ? isHe ? "הפסק הקלטה" : "Stop recording"
                : isHe ? "הקלט הודעה קולית" : "Record voice message"
            }
            aria-label={
              listening
                ? isHe ? "הפסק הקלטה" : "Stop recording"
                : isHe ? "התחל הקלטה" : "Start recording"
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
            title={isHe ? "הדפדפן שלך לא תומך בזיהוי דיבור" : "Speech not supported in this browser"}
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
            // Auto-grow the textarea
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (inputText.trim() && stage !== "processing" && stage !== "executing") {
                submitText(inputText);
              }
            }
          }}
          placeholder={
            listening
              ? isHe
                ? "🎤 מקשיב... (אפשר גם לכתוב)"
                : "🎤 Listening... (you can also type)"
              : isHe
                ? "כתוב הודעה או לחץ על 🎤..."
                : "Type a message or tap 🎤..."
          }
          disabled={stage === "processing" || stage === "executing"}
          autoComplete="off"
          spellCheck={false}
          rows={1}
          className="flex-1 bg-muted/30 border-0 min-h-[44px] max-h-[120px] py-2.5 px-3 text-base rounded-md resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
          style={{ fontSize: "16px" }}
        />

        {/* Send button - works for both typed and dictated text */}
        <Button
          type="submit"
          size="icon"
          disabled={!inputText.trim() || stage === "processing" || stage === "executing"}
          className="min-w-[44px] min-h-[44px] shrink-0"
          aria-label={isHe ? "שלח" : "Send"}
          title={isHe ? "שלח הודעה (Enter)" : "Send message (Enter)"}
        >
          <Send className="size-4" />
        </Button>
      </form>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t bg-muted/10 text-[10px] text-muted-foreground text-center">
        {isHe
          ? "🔒 הפעולות מוגנות ב-RBAC, מתועדות ב-Audit Log, ודורשות אישור לפני ביצוע"
          : "🔒 Actions are RBAC-protected, audit-logged, and require confirmation before execution"}
      </div>
    </div>
  );
}
