"use client";

import { cn } from "@/lib/utils";

/**
 * Date input that ALWAYS displays dd/mm/yyyy, regardless of the browser's
 * locale. The native <input type="date"> shows mm/dd/yyyy (or whatever the
 * browser language dictates) and there is no attribute to override that — so
 * we keep the native control (for its calendar picker + keyboard) but hide
 * its own text (`text-transparent`) and paint a dd/mm/yyyy overlay on top.
 * The value stays an ISO yyyy-mm-dd string, exactly like a plain date input.
 */

/** "2025-09-10" → "10/09/2025" (string-based — no Date(), so no timezone shift). */
function isoToDisplay(iso: string): string {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export function DateField({
  value,
  onChange,
  id,
  min,
  max,
  error,
  className,
}: {
  value: string; // ISO yyyy-mm-dd
  onChange: (iso: string) => void;
  id?: string;
  min?: string;
  max?: string;
  error?: boolean;
  className?: string;
}) {
  const display = isoToDisplay(value);
  return (
    <div className={cn("relative", className)} dir="ltr">
      {/* dd/mm/yyyy overlay — the native text underneath is transparent */}
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
        {display ? (
          <span className="text-foreground">{display}</span>
        ) : (
          <span className="text-muted-foreground">dd/mm/yyyy</span>
        )}
      </div>
      <input
        type="date"
        id={id}
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full min-h-[44px] px-3 rounded-md border bg-background text-sm text-transparent",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          // keep the calendar picker icon visible (and legible in dark mode)
          "dark:[&::-webkit-calendar-picker-indicator]:invert",
          error ? "border-red-500" : "border-input",
        )}
      />
    </div>
  );
}
