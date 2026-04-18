"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const SUGGESTIONS_HE = [
  "מה הסיכונים העיקריים בפרויקט AWS Migration?",
  "אילו משימות באיחור?",
  "סכם לי את ההתקדמות השבוע",
  "מי חבר הצוות העמוס ביותר?",
];

const SUGGESTIONS_EN = [
  "What are the main risks in the AWS Migration project?",
  "Which tasks are overdue?",
  "Summarize this week's progress",
  "Who is the busiest team member?",
];

export function AiSidekick({ locale }: { locale: string }) {
  const isRTL = locale === "he";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: isRTL
        ? "שלום! אני Claude, העוזר החכם של PMO++. אוכל לעזור לך לנתח פרויקטים, לזהות סיכונים, לסכם פגישות ולענות על שאלות על המשימות שלך. במה אוכל לעזור?"
        : "Hello! I'm Claude, your PMO++ assistant. I can help analyze projects, detect risks, summarize meetings, and answer questions about your tasks. How can I help?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], locale }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || data.error || "Error", ts: Date.now() },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: isRTL
            ? "מצטער, נתקלתי בשגיאה. ודא ש-ANTHROPIC_API_KEY מוגדר ב-.env.local"
            : "Sorry, I encountered an error. Make sure ANTHROPIC_API_KEY is set in .env.local",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = isRTL ? SUGGESTIONS_HE : SUGGESTIONS_EN;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pe-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-2",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "size-7 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-br from-orange-500 to-pink-600 text-white"
              )}
            >
              {msg.role === "user" ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
            </div>
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="size-7 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="size-3.5 text-white animate-pulse" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-muted text-sm">
              <span className="inline-flex gap-1">
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="space-y-1.5 pt-3">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">
            {isRTL ? "הצעות" : "Suggestions"}
          </div>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="block w-full text-start text-xs px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 pt-3 border-t mt-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRTL ? "שאל שאלה..." : "Ask a question..."}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
