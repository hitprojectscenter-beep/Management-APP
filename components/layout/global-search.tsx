"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, CheckSquare, Briefcase, Users as UsersIcon, FileText, CornerDownLeft } from "lucide-react";
import { useRouter, usePathname } from "@/lib/i18n/routing";
import { useLocale } from "next-intl";
import { mockTasks, mockUsers, getProjects } from "@/lib/db/mock-data";
import { useLiveTasks } from "@/lib/db/local-tasks";
import { useLiveProjects } from "@/lib/db/local-projects";
import { NAV_ITEMS } from "./nav-items";
import { txt, STATUS_LABELS_ML } from "@/lib/utils/locale-text";
import { cn } from "@/lib/utils";

type ResultType = "task" | "project" | "user" | "page";
interface Result {
  type: ResultType;
  id: string;
  label: string;
  sub?: string;
  href: string;
}

const TYPE_META: Record<ResultType, { icon: typeof CheckSquare; label: { he: string; en: string } }> = {
  task: { icon: CheckSquare, label: { he: "משימות", en: "Tasks" } },
  project: { icon: Briefcase, label: { he: "פרויקטים", en: "Projects" } },
  user: { icon: UsersIcon, label: { he: "אנשים", en: "People" } },
  page: { icon: FileText, label: { he: "מסכים", en: "Pages" } },
};

/**
 * Functional global search in the topbar. Filters live tasks, projects, people
 * and app screens by the entered value and jumps to the chosen result. Replaces
 * the previous dead search box that did nothing.
 */
export function GlobalSearch() {
  const locale = useLocale();
  const isHe = locale === "he";
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const tasks = useLiveTasks(mockTasks);
  const projects = useLiveProjects(getProjects());

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // The primary entity type of the page the user is currently on — its matches
  // are shown first (spec: "results from the page I'm on come first").
  const currentType: ResultType | null = useMemo(() => {
    const p = pathname || "";
    if (p.startsWith("/tasks")) return "task";
    if (p.startsWith("/projects") || p.startsWith("/portfolios") || p.startsWith("/wbs") || p.startsWith("/gantt")) return "project";
    if (p.startsWith("/team")) return "user";
    return null;
  }, [pathname]);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Result[] = [];
    let nt = 0, np = 0, nu = 0;
    for (const t of tasks) {
      if (nt >= 6) break;
      const hay = `${t.title} ${t.titleEn ?? ""} ${t.description ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: "task", id: t.id, label: t.title, sub: txt(locale, STATUS_LABELS_ML[t.status] ?? { he: t.status, en: t.status }) as string, href: `/tasks/${t.id}` });
        nt++;
      }
    }
    for (const p of projects) {
      if (np >= 5) break;
      const hay = `${p.name} ${p.nameEn ?? ""} ${p.description ?? ""}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: "project", id: p.id, label: p.name, href: `/projects/${p.id}` });
        np++;
      }
    }
    for (const u of mockUsers) {
      if (nu >= 4) break;
      const hay = `${u.name} ${u.title ?? ""} ${u.email}`.toLowerCase();
      if (hay.includes(term)) {
        out.push({ type: "user", id: u.id, label: u.name, sub: u.title ?? "", href: `/team` });
        nu++;
      }
    }
    for (const n of NAV_ITEMS) {
      const label = n.labels[locale] || n.labels.he;
      if (label.toLowerCase().includes(term)) out.push({ type: "page", id: n.key, label, href: n.href });
    }
    // Current-page results first, then the rest (each labelled by its location).
    out.sort((a, b) => (b.type === currentType ? 1 : 0) - (a.type === currentType ? 1 : 0));
    return out.slice(0, 22);
  }, [q, tasks, projects, locale, currentType]);

  useEffect(() => setActive(0), [q]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  // group results by type, preserving order
  const groups = useMemo(() => {
    const g: { type: ResultType; items: { r: Result; idx: number }[] }[] = [];
    results.forEach((r, idx) => {
      let bucket = g.find((x) => x.type === r.type);
      if (!bucket) { bucket = { type: r.type, items: [] }; g.push(bucket); }
      bucket.items.push({ r, idx });
    });
    return g;
  }, [results]);

  return (
    <div ref={boxRef} className="flex-1 max-w-md relative">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={isHe ? "חיפוש משימות, פרויקטים, אנשים ומסכים…" : "Search tasks, projects, people, pages…"}
        title={isHe ? "הקלד/י ערך לחיפוש בכל המערכת. התוצאות מופיעות מיד; לחיצה או Enter תנווט אליהן." : "Type to search across the system; click or Enter to navigate."}
        dir={isHe ? "rtl" : "ltr"}
        className="w-full ps-9 pe-8 h-9 rounded-md bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(""); setOpen(false); }}
          className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={isHe ? "נקה" : "Clear"}
        >
          <X className="size-4" />
        </button>
      )}

      {open && q.trim() && (
        <div className="absolute z-50 mt-1 w-[min(28rem,90vw)] max-h-[70vh] overflow-y-auto rounded-lg bg-card border shadow-xl start-0 animate-in fade-in slide-in-from-top-1 duration-150">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              {isHe ? `לא נמצאו תוצאות עבור "${q.trim()}"` : `No results for "${q.trim()}"`}
            </div>
          ) : (
            groups.map((grp) => {
              const Icon = TYPE_META[grp.type].icon;
              return (
                <div key={grp.type} className="py-1">
                  <div className={cn("px-3 py-1 text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5", grp.type === currentType ? "text-primary" : "text-muted-foreground")}>
                    <Icon className="size-3" />
                    {grp.type === currentType
                      ? `${txt(locale, { he: "בדף הנוכחי", en: "On this page" })} · ${txt(locale, TYPE_META[grp.type].label)}`
                      : txt(locale, TYPE_META[grp.type].label)}
                  </div>
                  {grp.items.map(({ r, idx }) => (
                    <button
                      key={r.type + r.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(r)}
                      className={cn(
                        "w-full px-3 py-2 text-start flex items-center gap-2 transition-colors",
                        active === idx ? "bg-primary/10 text-primary" : "hover:bg-accent",
                      )}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{r.label}</span>
                        {r.sub && <span className="block text-[11px] text-muted-foreground truncate">{r.sub}</span>}
                      </span>
                      {active === idx && <CornerDownLeft className="size-3.5 text-muted-foreground shrink-0" />}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
