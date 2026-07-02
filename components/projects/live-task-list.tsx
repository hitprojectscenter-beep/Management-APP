"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { TaskList } from "@/components/projects/task-list";
import { Button } from "@/components/ui/button";
import { useLiveTasks, syncTasksFromDb } from "@/lib/db/local-tasks";
import { useRole } from "@/lib/auth/role-context";
import { txt, PRIORITY_LABELS_ML } from "@/lib/utils/locale-text";
import { isOpenStatus, isClosedStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/**
 * Client wrapper around <TaskList> that merges in tasks created during this
 * session (localStorage) on top of the server snapshot, kept live via the
 * "pmo:tasks-changed" event. Also hosts multi-select + BULK actions (#8):
 * change priority / extend due date for many selected tasks at once. Bulk edits
 * apply only to user-created (DB-backed) tasks; seeded tasks are reported as
 * skipped. After a bulk write the list re-syncs from the DB.
 */
export function LiveTaskList({
  serverTasks,
  users,
  locale,
}: {
  serverTasks: MockTask[];
  users: MockUser[];
  locale: string;
}) {
  const tasks = useLiveTasks(serverTasks);
  const { currentUser } = useRole();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"priority" | "dueDate">("priority");
  const [priorityVal, setPriorityVal] = useState("high");
  const [dueVal, setDueVal] = useState("");
  const [applying, setApplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed" | "new" | "rejected">("all");
  const [createdByMe, setCreatedByMe] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Combined filter: status (lifecycle) AND "created by me" AND date-range
  // overlap. open = not finished; closed = done/completed/cancelled/handled/
  // rejected; new = new/not-started; rejected = נדחתה. Date range matches any
  // task whose window overlaps [from, to] (yyyy-mm-dd lexical compare).
  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (statusFilter === "open") list = list.filter((t) => isOpenStatus(t.status));
    else if (statusFilter === "closed") list = list.filter((t) => isClosedStatus(t.status));
    else if (statusFilter === "new") list = list.filter((t) => t.status === "new" || t.status === "not_started");
    else if (statusFilter === "rejected") list = list.filter((t) => t.status === "rejected");
    if (createdByMe) list = list.filter((t) => (t as MockTask & { creatorId?: string }).creatorId === currentUser.id);
    if (dateFrom) list = list.filter((t) => (t.plannedEnd ?? "") >= dateFrom);
    if (dateTo) list = list.filter((t) => (t.plannedStart ?? "") <= dateTo);
    return list;
  }, [tasks, statusFilter, createdByMe, dateFrom, dateTo, currentUser.id]);

  const createdByMeCount = useMemo(
    () => tasks.filter((t) => (t as MockTask & { creatorId?: string }).creatorId === currentUser.id).length,
    [tasks, currentUser.id],
  );
  const anyFilter = statusFilter !== "all" || createdByMe || !!dateFrom || !!dateTo;

  const ids = useMemo(() => visibleTasks.map((t) => t.id), [visibleTasks]);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () => setSelected(() => (allChecked ? new Set() : new Set(ids)));
  const clear = () => setSelected(new Set());

  const apply = async () => {
    const taskIds = [...selected];
    if (taskIds.length === 0) return;
    const value = bulkAction === "priority" ? priorityVal : dueVal;
    if (bulkAction === "dueDate" && !value) {
      toast.error(txt(locale, { he: "יש לבחור תאריך יעד", en: "Pick a due date" }) as string);
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, action: bulkAction, value }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok) {
        await syncTasksFromDb();
        const upd = out.updated?.length || 0;
        const skip = out.skipped?.length || 0;
        toast.success(
          (txt(locale, { he: `${upd} משימות עודכנו`, en: `${upd} tasks updated` }) as string) +
            (skip ? (txt(locale, { he: ` · ${skip} דולגו (מערכת/ללא הרשאה)`, en: ` · ${skip} skipped` }) as string) : ""),
        );
        clear();
      } else {
        toast.error(txt(locale, { he: "הפעולה נכשלה", en: "Action failed" }) as string);
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <div className="-mt-2 mb-3 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {!anyFilter
            ? `${tasks.length} ${txt(locale, { he: "משימות בסך הכל", en: "total tasks" })}`
            : `${visibleTasks.length} / ${tasks.length} ${txt(locale, { he: "משימות", en: "tasks" })}`}
        </p>
        {selected.size > 0 && (
          <span className="text-xs font-medium text-primary">
            {selected.size} {txt(locale, { he: "נבחרו", en: "selected" })}
          </span>
        )}
      </div>

      {/* Lifecycle filter: open / closed / new / rejected */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["all", "open", "closed", "new", "rejected"] as const).map((f) => {
          const count =
            f === "all" ? tasks.length
              : f === "open" ? tasks.filter((t) => isOpenStatus(t.status)).length
                : f === "closed" ? tasks.filter((t) => isClosedStatus(t.status)).length
                  : f === "new" ? tasks.filter((t) => t.status === "new" || t.status === "not_started").length
                    : tasks.filter((t) => t.status === "rejected").length;
          const label = {
            all: { he: "הכל", en: "All" },
            open: { he: "פתוחות", en: "Open" },
            closed: { he: "סגורות", en: "Closed" },
            new: { he: "חדשות", en: "New" },
            rejected: { he: "נדחו", en: "Rejected" },
          }[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                statusFilter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {txt(locale, label)} <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Extra filters: "created by me" + date range (combine with status) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCreatedByMe((v) => !v)}
          title={txt(locale, { he: "הצג רק משימות שאני יצרתי", en: "Show only tasks I created" }) as string}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            createdByMe ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {txt(locale, { he: "משימות שיצרתי", en: "Created by me" })} <span className="text-[10px] opacity-70">({createdByMeCount})</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">{txt(locale, { he: "מתאריך", en: "From" })}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title={txt(locale, { he: "הצג משימות שתאריך היעד שלהן הוא בתאריך זה או אחריו", en: "Tasks whose due date is on/after this date" }) as string}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
          <span className="text-muted-foreground text-xs">{txt(locale, { he: "עד", en: "to" })}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title={txt(locale, { he: "הצג משימות שתאריך ההתחלה שלהן הוא בתאריך זה או לפניו", en: "Tasks whose start date is on/before this date" }) as string}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>

        {anyFilter && (
          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setCreatedByMe(false); setDateFrom(""); setDateTo(""); }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> {txt(locale, { he: "נקה סינון", en: "Clear filters" })}
          </button>
        )}
      </div>

      {/* Bulk action bar — appears when rows are selected */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">
            {selected.size} {txt(locale, { he: "נבחרו — פעולה בכמות:", en: "selected — bulk action:" })}
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as "priority" | "dueDate")}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="priority">{txt(locale, { he: "שנה עדיפות", en: "Change priority" })}</option>
            <option value="dueDate">{txt(locale, { he: "שנה תאריך יעד", en: "Change due date" })}</option>
          </select>
          {bulkAction === "priority" ? (
            <select
              value={priorityVal}
              onChange={(e) => setPriorityVal(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {["low", "medium", "high", "critical"].map((p) => (
                <option key={p} value={p}>
                  {txt(locale, PRIORITY_LABELS_ML[p])}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              value={dueVal}
              onChange={(e) => setDueVal(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          )}
          <Button size="sm" onClick={apply} disabled={applying}>
            {applying && <Loader2 className="size-3.5 animate-spin me-1" />}
            {txt(locale, { he: "החל", en: "Apply" })}
          </Button>
          <Button size="sm" variant="outline" onClick={clear} disabled={applying}>
            <X className="size-3.5 me-1" />
            {txt(locale, { he: "נקה בחירה", en: "Clear" })}
          </Button>
        </div>
      )}

      <TaskList
        tasks={visibleTasks}
        users={users}
        locale={locale}
        selectable
        selected={selected}
        onToggle={toggle}
        allChecked={allChecked}
        onToggleAll={toggleAll}
      />
    </>
  );
}
