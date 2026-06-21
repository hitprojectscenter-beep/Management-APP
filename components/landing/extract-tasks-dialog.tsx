"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2, FileText, Trash2 } from "lucide-react";
import { txt } from "@/lib/utils/locale-text";

interface ExtractedTask {
  title: string;
  description?: string;
  assigneeHint?: string;
  dueDate?: string;
  estimateHours?: number;
  workTypeLabel?: string;
  confidence: number;
}

/**
 * Paste a meeting summary or document → AI extracts a list of tasks (with
 * effort estimates, assignee hints, and due dates) → user reviews → confirm.
 */
export function ExtractTasksDialog({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleExtract = async () => {
    if (!text.trim()) {
      toast.error(txt(locale, { he: "אנא הדבק טקסט לסריקה", en: "Please paste text to scan" }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setTasks(data.tasks || []);
      setSelected(new Set((data.tasks || []).map((_: any, i: number) => i)));
      toast.success(
        txt(locale, {
          he: `זוהו ${data.count} משימות`,
          en: `Found ${data.count} tasks`,
        })
      );
    } catch (err) {
      toast.error(
        txt(locale, { he: "שגיאה בסריקה", en: "Scan failed" }) +
        `: ${err instanceof Error ? err.message : "unknown"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const count = selected.size;
    if (count === 0) {
      toast.error(txt(locale, { he: "בחר לפחות משימה אחת", en: "Select at least one task" }));
      return;
    }
    // Demo mode: success toast. Real impl would POST to /api/tasks/bulk
    toast.success(
      txt(locale, {
        he: `נוצרו ${count} משימות`,
        en: `${count} tasks created`,
      }),
      {
        description: txt(locale, {
          he: "במצב הדגמה — בייצור יישלחו ל-DB ויתועדו ב-Audit Log",
          en: "Demo mode — production would persist to DB + audit log",
        }),
      }
    );
    setOpen(false);
    setText("");
    setTasks([]);
    setSelected(new Set());
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const removeTask = (i: number) => {
    setTasks((prev) => prev.filter((_, idx) => idx !== i));
    setSelected((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            {txt(locale, { he: "ייבוא משימות מטקסט / סיכום פגישה", en: "Import Tasks from Text / Meeting Summary" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, {
              he: "הדבק טקסט (סיכום פגישה, מסמך וכו') — ה-AI יחלץ משימות עם הערכות מאמץ, תאריכים ואחראים מוצעים.",
              en: "Paste text (meeting summary, document) — AI extracts tasks with effort estimates, due dates and suggested assignees.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={txt(locale, {
              he: "לדוגמה: בסיכום הפגישה הוחלט שאלעד יכין מצגת לדירקטוריון עד יום חמישי. ניר יכתוב מסמך אפיון. מארק יענה ללקוח מחר...",
              en: "Example: Meeting decisions — Elad will prepare a presentation by Thursday. Nir will write the spec doc. Mark will reply to the customer tomorrow...",
            })}
            className="w-full min-h-[140px] bg-muted/30 border rounded-lg p-3 text-base resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ fontSize: "16px" }}
            disabled={loading}
          />

          <div className="flex justify-end">
            <Button onClick={handleExtract} disabled={loading || !text.trim()}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {txt(locale, { he: "סורק...", en: "Scanning..." })}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {txt(locale, { he: "חלץ משימות", en: "Extract Tasks" })}
                </>
              )}
            </Button>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {txt(locale, {
                    he: `משימות שזוהו (${tasks.length}, נבחרו: ${selected.size})`,
                    en: `Found tasks (${tasks.length}, selected: ${selected.size})`,
                  })}
                </h3>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {tasks.map((task, i) => {
                  const isSel = selected.has(i);
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 transition-all cursor-pointer ${
                        isSel ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/20" : "border-border bg-muted/20"
                      }`}
                      onClick={() => toggleSelect(i)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelect(i)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {task.workTypeLabel && (
                              <Badge variant="secondary" className="text-[10px]">
                                <FileText className="size-3 me-1" />
                                {task.workTypeLabel}
                              </Badge>
                            )}
                            {task.estimateHours && (
                              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                                ⏱ {task.estimateHours} {txt(locale, { he: "שעות", en: "hrs" })}
                              </Badge>
                            )}
                            {task.assigneeHint && (
                              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">
                                👤 {task.assigneeHint}
                              </Badge>
                            )}
                            {task.dueDate && (
                              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                                📅 {task.dueDate}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTask(i);
                          }}
                          className="text-muted-foreground hover:text-red-500 p-1"
                          title={txt(locale, { he: "הסר", en: "Remove" })}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {txt(locale, { he: "ביטול", en: "Cancel" })}
          </Button>
          {tasks.length > 0 && (
            <Button onClick={handleConfirm} disabled={selected.size === 0}>
              {txt(locale, {
                he: `צור ${selected.size} משימות`,
                en: `Create ${selected.size} tasks`,
              })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
