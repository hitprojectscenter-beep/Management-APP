"use client";

import { Info } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";

/**
 * A small ⓘ affordance placed next to a field label or control. On hover/tap it
 * shows a 1–3 sentence explanation of what the control is and what to enter.
 * Must render inside a TooltipProvider (mounted in the dashboard layout).
 */
export function FieldHint({ text, side = "top" }: { text: string; side?: "top" | "bottom" | "left" | "right" }) {
  if (!text) return null;
  return (
    <SimpleTooltip content={text} side={side}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={text}
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center align-middle text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <Info className="size-3.5" />
      </button>
    </SimpleTooltip>
  );
}
