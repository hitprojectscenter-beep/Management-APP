"use client";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic collapsible section with localStorage persistence. Use it on
 * pages where you want users to toggle big sections (open tasks list,
 * project list, etc.) without losing their choice on reload.
 *
 * Defaults to CLOSED — the user opts in to expand.
 */
export function CollapsibleSection({
  id,
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  /** Unique key — used as the localStorage suffix */
  id: string;
  title: React.ReactNode;
  /** Small badge (count, status) rendered to the side of the title */
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `pmo:collapsible:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "true") setOpen(true);
      else if (raw === "false") setOpen(false);
    } catch {}
  }, [storageKey]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start hover:bg-accent/40 transition-colors min-h-[52px]"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-sm">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            !open && "-rotate-90"
          )}
        />
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}
