"use client";
import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useHelp } from "./help-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { X, Send, HelpCircle, BookOpen, Sparkles, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { HELP_ENTRIES, type HelpEntry } from "@/lib/help/help-content";

interface BotMessage {
  role: "user" | "bot";
  content: string;
  matchedEntries?: HelpEntry[];
  ts: number;
}

const QUICK_QUESTIONS: Record<string, string[]> = {
  he: ["איך מוסיפים משימה?", "מה זה FTE?", "מה ההבדל בין הבוטים?", "איך עובדות ההרשאות?"],
  en: ["How do I add a task?", "What is FTE?", "What's the difference between bots?", "How do permissions work?"],
  ru: ["Как добавить задачу?", "Что такое FTE?", "В чём разница между ботами?", "Как работают разрешения?"],
  fr: ["Comment ajouter une tâche ?", "Qu'est-ce que le FTE ?", "Quelle différence entre les bots ?", "Comment fonctionnent les permissions ?"],
  es: ["¿Cómo añadir una tarea?", "¿Qué es FTE?", "¿Cuál es la diferencia entre bots?", "¿Cómo funcionan los permisos?"],
};

const BOT_LABELS: Record<string, { title: string; subtitle: string; welcome: string; placeholder: string; related: string; popular: string; error: string }> = {
  he: { title: "בוט עזרה", subtitle: "תמיד כאן לעזור", welcome: "שלום! אני בוט העזרה של Work OS. אני יכול לענות על כל שאלה על השימוש במערכת.", placeholder: "שאל אותי משהו...", related: "אולי גם תרצה לדעת", popular: "שאלות נפוצות", error: "מצטער, נתקלתי בשגיאה. נסה לנסח את השאלה אחרת." },
  en: { title: "Help Bot", subtitle: "Always here to help", welcome: "Hi! I'm the Work OS help bot. I can answer any question about how to use the system.", placeholder: "Ask me anything...", related: "You might also want", popular: "Quick questions", error: "Sorry, I encountered an error. Try rephrasing." },
  ru: { title: "Бот помощи", subtitle: "Всегда готов помочь", welcome: "Привет! Я бот помощи Work OS. Могу ответить на любой вопрос о системе.", placeholder: "Спросите меня...", related: "Возможно, вас заинтересует", popular: "Популярные вопросы", error: "Извините, произошла ошибка. Попробуйте переформулировать." },
  fr: { title: "Bot d'aide", subtitle: "Toujours là pour aider", welcome: "Bonjour ! Je suis le bot d'aide Work OS. Je peux répondre à toute question sur le système.", placeholder: "Posez votre question...", related: "Vous pourriez aussi vouloir", popular: "Questions fréquentes", error: "Désolé, une erreur est survenue. Essayez de reformuler." },
  es: { title: "Bot de ayuda", subtitle: "Siempre aquí para ayudar", welcome: "¡Hola! Soy el bot de ayuda de Work OS. Puedo responder cualquier pregunta sobre el sistema.", placeholder: "Pregúntame algo...", related: "También podría interesarte", popular: "Preguntas frecuentes", error: "Lo siento, ocurrió un error. Intenta reformular." },
};

export function HelpBot() {
  const { isBotOpen, closeBot } = useHelp();
  const locale = useLocale();
  const lang = (["he", "en", "ru", "fr", "es"].includes(locale) ? locale : "he") as string;
  const labels = BOT_LABELS[lang] || BOT_LABELS.he;
  const isHe = lang === "he";
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (isBotOpen && messages.length === 0) {
      setMessages([
        {
          role: "bot",
          content: labels.welcome,
          ts: Date.now(),
        },
      ]);
    }
  }, [isBotOpen, messages.length, isHe]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isBotOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isBotOpen]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: BotMessage = { role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, locale }),
      });
      const data = await res.json();

      setMessages((m) => [
        ...m,
        {
          role: "bot",
          content: data.answer,
          matchedEntries: data.matchedEntries,
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          content: labels.error,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = QUICK_QUESTIONS[lang] || QUICK_QUESTIONS.he;

  if (!isBotOpen) return null;

  return (
    <div
      className="fixed bottom-6 end-6 z-[90] w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-3rem))] bg-card border-2 border-primary/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
      data-tour="help-bot"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <div className="font-bold text-base">{labels.title}</div>
            <div className="text-[11px] opacity-90">{labels.subtitle}</div>
          </div>
        </div>
        <button
          onClick={closeBot}
          className="size-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
          aria-label="Close help bot"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "size-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-br from-emerald-500 to-cyan-600 text-white"
              )}
            >
              {msg.role === "user" ? "U" : <HelpCircle className="size-4" />}
            </div>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm max-w-[85%] whitespace-pre-line shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-se-sm"
                  : "bg-background border rounded-ss-sm"
              )}
            >
              {msg.content}
              {msg.matchedEntries && msg.matchedEntries.length > 1 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase opacity-70 flex items-center gap-1">
                    <Lightbulb className="size-3" />
                    {labels.related}
                  </div>
                  {msg.matchedEntries.slice(1).map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => send(entry.question[locale])}
                      className="block text-start text-xs text-primary hover:underline w-full"
                    >
                      → {entry.question[locale]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="size-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <HelpCircle className="size-4 text-white animate-pulse" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-background border rounded-ss-sm">
              <div className="flex gap-1">
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 border-t bg-background/50 space-y-1.5">
          <div className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
            <BookOpen className="size-3" />
            {labels.popular}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 border-t bg-card flex gap-2"
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={labels.placeholder}
          disabled={loading}
          className="flex-1 bg-muted/30 border-0"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
