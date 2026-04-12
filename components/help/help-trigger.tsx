"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { useHelp } from "./help-provider";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Topbar help button - opens a small popover with two options:
 * 1. Start the interactive tour
 * 2. Open the help bot
 */
export function HelpTrigger() {
  const [open, setOpen] = useState(false);
  const { startTour, openBot } = useHelp();
  const locale = useLocale();
  const isHe = locale === "he";

  return (
    <div className="relative" data-tour="help-trigger">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
        title={isHe ? "עזרה" : "Help"}
        aria-label="Help"
      >
        <HelpCircle className="size-4" />
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Popover */}
          <div
            className={cn(
              "absolute z-50 mt-2 w-64 rounded-xl bg-card border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150",
              isHe ? "start-0" : "end-0"
            )}
          >
            <div className="px-4 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <div className="font-semibold text-sm">{isHe ? "איך אפשר לעזור?" : "How can we help?"}</div>
              <div className="text-[10px] opacity-90 mt-0.5">
                {isHe ? "בחר אופציה" : "Choose an option"}
              </div>
            </div>
            <button
              onClick={() => {
                startTour();
                setOpen(false);
              }}
              className="w-full px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 text-start"
            >
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                <BookOpen className="size-4 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {isHe ? "סיור אינטראקטיבי" : "Interactive Tour"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isHe ? "מדריך 11 שלבים, כ-2 דקות" : "11 steps, ~2 minutes"}
                </div>
              </div>
            </button>
            <div className="border-t" />
            <button
              onClick={() => {
                openBot();
                setOpen(false);
              }}
              className="w-full px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 text-start"
            >
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                <MessageCircleQuestion className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {isHe ? "בוט עזרה" : "Help Bot"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isHe ? "שאל כל שאלה על המערכת" : "Ask anything about the system"}
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Floating help button - bottom corner.
 * Provides instant access to the help bot from anywhere.
 */
export function HelpFloatingButton() {
  const { openBot, isBotOpen } = useHelp();
  const locale = useLocale();
  const isHe = locale === "he";

  if (isBotOpen) return null;

  return (
    <button
      onClick={openBot}
      className="fixed bottom-6 end-6 z-[80] size-14 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-2xl hover:shadow-emerald-500/50 hover:scale-110 transition-all flex items-center justify-center group"
      aria-label={isHe ? "פתח בוט עזרה" : "Open help bot"}
      title={isHe ? "צריך עזרה?" : "Need help?"}
    >
      <MessageCircleQuestion className="size-6" />
      <span className="absolute -top-1 -end-1 size-3 bg-amber-400 rounded-full animate-pulse" />
      <span className="absolute end-full me-3 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {isHe ? "צריך עזרה?" : "Need help?"}
      </span>
    </button>
  );
}
