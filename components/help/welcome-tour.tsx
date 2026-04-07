"use client";
import { useEffect, useState, useRef } from "react";
import { useLocale } from "next-intl";
import { useHelp } from "./help-provider";
import { TOUR_STEPS } from "@/lib/help/tour-steps";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  centered: boolean;
}

const PADDING = 8;

export function WelcomeTour() {
  const { isTourActive, tourStepIndex, nextStep, prevStep, stopTour } = useHelp();
  const locale = useLocale() as "he" | "en";
  const isHe = locale === "he";
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[tourStepIndex];
  const isLast = tourStepIndex === TOUR_STEPS.length - 1;
  const isFirst = tourStepIndex === 0;

  // Compute spotlight rect when step changes
  useEffect(() => {
    if (!isTourActive || !step) return;

    const update = () => {
      // Center / body steps
      if (step.placement === "center" || step.selector === "body") {
        const w = window.innerWidth;
        const h = window.innerHeight;
        setRect({
          top: h / 2 - 1,
          left: w / 2 - 1,
          width: 2,
          height: 2,
          centered: true,
        });
        return;
      }

      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        // Element not yet rendered - retry shortly
        setTimeout(update, 200);
        return;
      }

      if (step.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Wait for scroll to settle
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top - PADDING,
          left: r.left - PADDING,
          width: r.width + PADDING * 2,
          height: r.height + PADDING * 2,
          centered: false,
        });
      }, 300);
    };

    update();

    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [isTourActive, step, tourStepIndex]);

  // Handle escape key
  useEffect(() => {
    if (!isTourActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopTour();
      if (e.key === "ArrowRight") isHe ? prevStep() : nextStep();
      if (e.key === "ArrowLeft") isHe ? nextStep() : prevStep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTourActive, isHe, nextStep, prevStep, stopTour]);

  // Auto-advance past last step
  useEffect(() => {
    if (tourStepIndex >= TOUR_STEPS.length) {
      stopTour();
    }
  }, [tourStepIndex, stopTour]);

  if (!isTourActive || !step || !rect) return null;

  // Compute popover position
  const popoverPos = computePopoverPosition(rect, step.placement || "bottom");

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[100] pointer-events-none transition-all duration-300"
        style={{
          background: rect.centered
            ? "rgba(0, 0, 0, 0.75)"
            : `radial-gradient(ellipse ${rect.width / 2 + 30}px ${rect.height / 2 + 30}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 0%, transparent 60%, rgba(0, 0, 0, 0.75) 100%)`,
        }}
      />

      {/* Highlight ring around target */}
      {!rect.centered && (
        <div
          className="fixed z-[101] pointer-events-none rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background/0 animate-pulse-slow transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            background: "transparent",
          }}
        />
      )}

      {/* Popover card */}
      <div
        ref={popoverRef}
        className={cn(
          "fixed z-[110] w-[min(420px,calc(100vw-2rem))] bg-card text-card-foreground rounded-xl shadow-2xl border-2 border-primary/30 overflow-hidden transition-all duration-300",
          rect.centered && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={
          rect.centered
            ? undefined
            : { top: popoverPos.top, left: popoverPos.left }
        }
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold tracking-wider opacity-80 uppercase mb-1">
                {isHe ? "סיור" : "Tour"} · {tourStepIndex + 1}/{TOUR_STEPS.length}
              </div>
              <h3 className="text-lg font-bold leading-tight">{step.title[locale]}</h3>
            </div>
            <button
              onClick={stopTour}
              className="size-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0"
              aria-label="Close tour"
            >
              <X className="size-4" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${((tourStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {step.content[locale]}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-muted/30 border-t flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={stopTour}
            className="text-muted-foreground"
          >
            <SkipForward className="size-3" />
            {isHe ? "דלג" : "Skip"}
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={prevStep}>
                {isHe ? <ArrowRight className="size-3" /> : <ArrowLeft className="size-3" />}
                {isHe ? "הקודם" : "Back"}
              </Button>
            )}
            <Button size="sm" onClick={isLast ? stopTour : nextStep}>
              {isLast ? (isHe ? "סיום 🎉" : "Finish 🎉") : isHe ? "הבא" : "Next"}
              {!isLast && (isHe ? <ArrowLeft className="size-3" /> : <ArrowRight className="size-3" />)}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function computePopoverPosition(
  rect: SpotlightRect,
  placement: "top" | "bottom" | "start" | "end" | "center"
): { top: number; left: number } {
  if (rect.centered) return { top: 0, left: 0 };
  const popW = 420;
  const popH = 280;
  const margin = 20;
  const w = window.innerWidth;
  const h = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = rect.top - popH - margin;
      left = rect.left + rect.width / 2 - popW / 2;
      break;
    case "bottom":
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - popW / 2;
      break;
    case "start":
      top = rect.top + rect.height / 2 - popH / 2;
      left = rect.left - popW - margin;
      break;
    case "end":
      top = rect.top + rect.height / 2 - popH / 2;
      left = rect.left + rect.width + margin;
      break;
    default:
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - popW / 2;
  }

  // Clamp to viewport
  left = Math.max(16, Math.min(w - popW - 16, left));
  top = Math.max(16, Math.min(h - popH - 16, top));

  return { top, left };
}
