"use client";

/**
 * מרכז דוחות ואנליטיקה — the reporting/analytics center.
 *
 * Answers the two "different views" the PMO asked for:
 *  - **תצוגת משימות (tasks)** vs **תצוגת פרויקטים (projects)** — separate dashboards
 *    + separate reports (mode toggle at the top).
 *  - a **report builder**: filter by several attributes at once (keyword, date
 *    range, status, priority, division, department, assignee) + export CSV.
 *  - **distribution dashboards** (התפלגות) by חטיבה / אגף / עובד, **RBAC-scoped**:
 *    מנכ"ל + ניר + מארק see everything; a division head sees only their division
 *    (across its departments + employees); a department head sees only their
 *    department (its employees). See lib/analytics/org.ts for the scoping rule.
 *
 * All data is client-side (useLiveTasks / useLiveProjects merge session-created
 * items on top of the seeded snapshot), so the report reflects live edits.
 */

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  BarChart3,
  ListTodo,
  Briefcase,
  Search,
  Download,
  Filter,
  X,
  Users,
  Building2,
  Network,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldHint } from "@/components/ui/field-hint";
import { mockWbsNodes, mockUsers, type MockTask, type MockUser, type MockWbsNode } from "@/lib/db/mock-data";
import { useLiveTasks } from "@/lib/db/local-tasks";
import { useLiveProjects, type LiveProject } from "@/lib/db/local-projects";
import { useRole } from "@/lib/auth/role-context";
import { isClosedStatus, isOpenStatus } from "@/lib/db/types";
import { txt, STATUS_LABELS_ML, PRIORITY_LABELS_ML } from "@/lib/utils/locale-text";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import {
  buildOrgIndex,
  resolveViewerScope,
  divisionHeadOf,
  departmentHeadOf,
  groupLabelFor,
  type ScopeLevel,
} from "@/lib/analytics/org";

type Mode = "tasks" | "projects";
const ALL = "__all";
const OPEN = "__open";
const CLOSED = "__closed";

const LEVEL_META: Record<ScopeLevel, { icon: typeof Users; label: { he: string; en: string } }> = {
  division: { icon: Building2, label: { he: "חטיבה", en: "Division" } },
  department: { icon: Network, label: { he: "אגף", en: "Department" } },
  employee: { icon: Users, label: { he: "עובד", en: "Employee" } },
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  // BOM so Excel reads Hebrew (UTF-8) correctly.
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsCenter({
  serverTasks,
  serverProjects,
  locale,
}: {
  serverTasks: MockTask[];
  serverProjects: LiveProject[];
  locale: string;
}) {
  const isHe = locale === "he";
  const { currentUser } = useRole();
  const tasks = useLiveTasks(serverTasks);
  const projects = useLiveProjects(serverProjects);

  const [mode, setMode] = useState<Mode>("tasks");
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [priority, setPriority] = useState<string>(ALL);
  const [assignee, setAssignee] = useState<string>(ALL);
  const [division, setDivision] = useState<string>(ALL);
  const [department, setDepartment] = useState<string>(ALL);
  const [projBucket, setProjBucket] = useState<string>(ALL);

  // ---- Org index + RBAC scope -------------------------------------------------
  const idx = useMemo(() => buildOrgIndex(mockUsers), []);
  const scope = useMemo(() => resolveViewerScope(currentUser, idx), [currentUser, idx]);
  const [level, setLevel] = useState<ScopeLevel>(scope.levels[0]);
  // Keep the selected level valid if the viewer changes (role switcher).
  const activeLevel = scope.levels.includes(level) ? level : scope.levels[0];

  const userById = useMemo(() => {
    const m = new Map<string, MockUser>();
    for (const u of mockUsers) m.set(u.id, u);
    return m;
  }, []);

  // ---- Task → project resolution ---------------------------------------------
  const nodeById = useMemo(() => {
    const m = new Map<string, MockWbsNode | LiveProject>();
    for (const n of mockWbsNodes) m.set(n.id, n);
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);
  const projectIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const n of mockWbsNodes) if (n.level === "project") s.add(n.id);
    for (const p of projects) s.add(p.id);
    return s;
  }, [projects]);
  const projectOfNode = useMemo(() => {
    const cache = new Map<string, string | null>();
    return (wbsNodeId: string | null | undefined): string | null => {
      if (!wbsNodeId) return null;
      if (cache.has(wbsNodeId)) return cache.get(wbsNodeId) as string | null;
      let cur: string | null | undefined = wbsNodeId;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        if (projectIdSet.has(cur)) {
          cache.set(wbsNodeId, cur);
          return cur;
        }
        cur = nodeById.get(cur)?.parentId ?? null;
      }
      cache.set(wbsNodeId, null);
      return null;
    };
  }, [nodeById, projectIdSet]);
  const projectName = (id: string | null) => (id ? nodeById.get(id)?.name ?? id : isHe ? "—" : "—");

  // ---- Dropdown option sources (derived from data) ---------------------------
  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) s.add(t.status);
    return Array.from(s);
  }, [tasks]);
  const priorityOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) s.add(t.priority);
    return Array.from(s);
  }, [tasks]);
  // Assignee / division / department options are limited to what the viewer may see.
  const visibleUsers = useMemo(
    () => mockUsers.filter((u) => scope.visibleUserIds.has(u.id)),
    [scope],
  );
  const divisionOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of visibleUsers) {
      const h = divisionHeadOf(u.id, idx);
      if (h) m.set(h, userById.get(h)?.name ?? h);
    }
    return Array.from(m.entries());
  }, [visibleUsers, idx, userById]);
  const departmentOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of visibleUsers) {
      const h = departmentHeadOf(u.id, idx);
      if (h) m.set(h, userById.get(h)?.title ?? userById.get(h)?.name ?? h);
    }
    return Array.from(m.entries());
  }, [visibleUsers, idx, userById]);

  // ---- Task filtering (report builder + RBAC) --------------------------------
  const kw = keyword.trim().toLowerCase();
  const taskVisible = (t: MockTask): boolean => {
    // RBAC: only tasks assigned to someone the viewer may see (unassigned only
    // for all-access viewers).
    if (t.assigneeId) {
      if (!scope.visibleUserIds.has(t.assigneeId)) return false;
    } else if (!scope.allAccess) {
      return false;
    }
    return true;
  };
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!taskVisible(t)) return false;
      if (kw) {
        const hay = `${t.title} ${t.titleEn ?? ""} ${t.description ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (dateFrom && (t.plannedEnd ?? "") < dateFrom) return false;
      if (dateTo && (t.plannedStart ?? "") > dateTo) return false;
      if (status === OPEN && !isOpenStatus(t.status)) return false;
      if (status === CLOSED && !isClosedStatus(t.status)) return false;
      if (status !== ALL && status !== OPEN && status !== CLOSED && t.status !== status) return false;
      if (priority !== ALL && t.priority !== priority) return false;
      if (assignee !== ALL && t.assigneeId !== assignee) return false;
      if (division !== ALL && divisionHeadOf(t.assigneeId ?? "", idx) !== division) return false;
      if (department !== ALL && departmentHeadOf(t.assigneeId ?? "", idx) !== department) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, kw, dateFrom, dateTo, status, priority, assignee, division, department, scope, idx]);

  // ---- Distribution over the filtered tasks ----------------------------------
  const distribution = useMemo(() => {
    const map = new Map<string, { name: string; total: number; open: number; closed: number }>();
    for (const t of filteredTasks) {
      const label = groupLabelFor(t.assigneeId ?? null, activeLevel, idx);
      const row = map.get(label) ?? { name: label, total: 0, open: 0, closed: 0 };
      row.total += 1;
      if (isClosedStatus(t.status)) row.closed += 1;
      else row.open += 1;
      map.set(label, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTasks, activeLevel, idx]);

  const taskKpis = useMemo(() => {
    let open = 0,
      closed = 0,
      overdue = 0;
    for (const t of filteredTasks) {
      if (isClosedStatus(t.status)) closed += 1;
      else open += 1;
      if (isOverdue(t.plannedEnd, t.status)) overdue += 1;
    }
    return { total: filteredTasks.length, open, closed, overdue };
  }, [filteredTasks]);

  // ---- Project filtering + metrics -------------------------------------------
  const tasksOfProject = useMemo(() => {
    const m = new Map<string, MockTask[]>();
    for (const t of tasks) {
      const pid = projectOfNode(t.wbsNodeId);
      if (!pid) continue;
      const arr = m.get(pid) ?? [];
      arr.push(t);
      m.set(pid, arr);
    }
    return m;
  }, [tasks, projectOfNode]);

  const bucketOfProject = (p: LiveProject, ptasks: MockTask[]): "open" | "closed" | "new" | "rejected" => {
    const st = String((p as { status?: string }).status ?? "").toLowerCase();
    if (st === "rejected" || st === "cancelled") return "rejected";
    if (st === "completed" || st === "done" || st === "closed" || st === "archived") return "closed";
    if (ptasks.length === 0) return "new";
    if (ptasks.every((t) => isClosedStatus(t.status))) return "closed";
    if (!ptasks.some((t) => t.status !== "not_started" && t.status !== "new")) return "new";
    return "open";
  };

  const projectRows = useMemo(() => {
    return projects
      .map((p) => {
        const ptasks = tasksOfProject.get(p.id) ?? [];
        const done = ptasks.filter((t) => isClosedStatus(t.status)).length;
        const completion = ptasks.length ? Math.round((done / ptasks.length) * 100) : 0;
        return { p, ptasks, done, completion, bucket: bucketOfProject(p, ptasks) };
      })
      .filter(({ p, ptasks }) => {
        // RBAC: all-access sees all; otherwise a project the viewer's team touches
        // (or that the viewer created).
        if (!scope.allAccess) {
          const mine =
            (p as { creatorId?: string | null }).creatorId === currentUser.id ||
            ptasks.some((t) => t.assigneeId && scope.visibleUserIds.has(t.assigneeId));
          if (!mine) return false;
        }
        if (kw) {
          const hay = `${p.name} ${p.nameEn ?? ""} ${p.description ?? ""}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        const ps = (p as { plannedStart?: string }).plannedStart;
        const pe = (p as { plannedEnd?: string }).plannedEnd;
        if (dateFrom && pe && pe < dateFrom) return false;
        if (dateTo && ps && ps > dateTo) return false;
        return true;
      })
      .filter(({ bucket }) => projBucket === ALL || bucket === projBucket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, tasksOfProject, kw, dateFrom, dateTo, projBucket, scope, currentUser]);

  const projectKpis = useMemo(() => {
    const total = projectRows.length;
    const active = projectRows.filter((r) => r.bucket === "open").length;
    const done = projectRows.filter((r) => r.bucket === "closed").length;
    const fresh = projectRows.filter((r) => r.bucket === "new").length;
    return { total, active, done, fresh };
  }, [projectRows]);

  const projectChart = useMemo(
    () =>
      projectRows
        .slice()
        .sort((a, b) => b.ptasks.length - a.ptasks.length)
        .slice(0, 12)
        .map((r) => ({ name: r.p.name, tasks: r.ptasks.length, done: r.done, completion: r.completion })),
    [projectRows],
  );

  // ---- Exports ---------------------------------------------------------------
  const exportTasks = () => {
    const rows: (string | number)[][] = [
      ["מזהה", "משימה", "פרויקט", "אחראי", "חטיבה", "אגף", "סטטוס", "עדיפות", "התחלה", "יעד", "התקדמות%"],
      ...filteredTasks.map((t) => [
        t.id,
        t.title,
        projectName(projectOfNode(t.wbsNodeId)),
        t.assigneeId ? userById.get(t.assigneeId)?.name ?? "" : "",
        groupLabelFor(t.assigneeId ?? null, "division", idx),
        groupLabelFor(t.assigneeId ?? null, "department", idx),
        txt(locale, STATUS_LABELS_ML[t.status] ?? { he: t.status, en: t.status }),
        txt(locale, PRIORITY_LABELS_ML[t.priority] ?? { he: t.priority, en: t.priority }),
        t.plannedStart ?? "",
        t.plannedEnd ?? "",
        t.progressPercent ?? 0,
      ]),
    ];
    downloadCsv(`דוח-משימות-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };
  const exportProjects = () => {
    const rows: (string | number)[][] = [
      ["מזהה", "פרויקט", "מצב", "משימות", "הושלמו", "התקדמות%"],
      ...projectRows.map((r) => [
        r.p.id,
        r.p.name,
        { open: "פתוח", closed: "סגור", new: "חדש", rejected: "נדחה" }[r.bucket],
        r.ptasks.length,
        r.done,
        r.completion,
      ]),
    ];
    downloadCsv(`דוח-פרויקטים-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const clearFilters = () => {
    setKeyword("");
    setDateFrom("");
    setDateTo("");
    setStatus(ALL);
    setPriority(ALL);
    setAssignee(ALL);
    setDivision(ALL);
    setDepartment(ALL);
    setProjBucket(ALL);
  };
  const hasFilters =
    kw || dateFrom || dateTo || status !== ALL || priority !== ALL || assignee !== ALL || division !== ALL || department !== ALL || projBucket !== ALL;

  const selectCls =
    "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1";

  return (
    <div className="space-y-6">
      {/* Header + mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="size-7 text-blue-500" />
            {isHe ? "מרכז דוחות ואנליטיקה" : "Reports & Analytics Center"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isHe
              ? "בונה דוחות לפי מאפיינים ותאריכים, חיפוש חופשי, והתפלגויות לפי חטיבה / אגף / עובד."
              : "Build reports by attribute and date, free-text search, and distributions by division / department / employee."}
          </p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {(["tasks", "projects"] as const).map((m) => {
            const Icon = m === "tasks" ? ListTodo : Briefcase;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {m === "tasks" ? (isHe ? "תצוגת משימות" : "Tasks view") : isHe ? "תצוגת פרויקטים" : "Projects view"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter bar (report builder) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4 text-blue-500" />
            {isHe ? "בונה הדוח — מאפיינים וטווח תאריכים" : "Report builder — attributes & date range"}
            <FieldHint
              text={
                isHe
                  ? "בחר/י כמה מאפיינים יחד (חיפוש, טווח תאריכים, סטטוס, עדיפות, חטיבה, אגף, אחראי). הדוח וההתפלגות למטה מתעדכנים מיד לפי הסינון."
                  : "Combine several attributes (search, date range, status, priority, division, department, assignee). The report and the distribution below update instantly."
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Keyword search */}
          <div>
            <label className={labelCls}>
              <Search className="size-3.5" />
              {isHe ? "חיפוש מילות מפתח (בכל המשימות והפרויקטים)" : "Keyword search (across all tasks & projects)"}
              <FieldHint
                text={
                  isHe
                    ? "חיפוש חופשי בכותרת, בתיאור ובתגיות. מסנן גם משימות וגם פרויקטים לפי המילה שתקלידו."
                    : "Free-text search over title, description and tags — filters both tasks and projects."
                }
              />
            </label>
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 size-4 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={isHe ? "הקלד/י מילה או ביטוי…" : "Type a word or phrase…"}
                className="w-full h-10 rounded-md border border-input bg-background ps-8 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Date range */}
            <div>
              <label className={labelCls}>
                {isHe ? "מתאריך" : "From date"}
                <FieldHint text={isHe ? "מציג פריטים שהיעד שלהם הוא בתאריך זה או אחריו." : "Shows items whose due date is on/after this date."} />
              </label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={cn(selectCls, "w-full")} />
            </div>
            <div>
              <label className={labelCls}>
                {isHe ? "עד תאריך" : "To date"}
                <FieldHint text={isHe ? "מציג פריטים שההתחלה שלהם היא בתאריך זה או לפניו." : "Shows items whose start date is on/before this date."} />
              </label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={cn(selectCls, "w-full")} />
            </div>

            {mode === "tasks" && (
              <>
                <div>
                  <label className={labelCls}>{isHe ? "סטטוס" : "Status"}</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(selectCls, "w-full")}>
                    <option value={ALL}>{isHe ? "הכל" : "All"}</option>
                    <option value={OPEN}>{isHe ? "פתוחות" : "Open"}</option>
                    <option value={CLOSED}>{isHe ? "סגורות" : "Closed"}</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {txt(locale, STATUS_LABELS_ML[s] ?? { he: s, en: s })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{isHe ? "עדיפות" : "Priority"}</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className={cn(selectCls, "w-full")}>
                    <option value={ALL}>{isHe ? "הכל" : "All"}</option>
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>
                        {txt(locale, PRIORITY_LABELS_ML[p] ?? { he: p, en: p })}
                      </option>
                    ))}
                  </select>
                </div>
                {(scope.allAccess || scope.isDivisionHead) && divisionOptions.length > 1 && (
                  <div>
                    <label className={labelCls}>
                      {isHe ? "חטיבה" : "Division"}
                      <FieldHint text={isHe ? "סינון לפי החטיבה (הסמנכ\"ל) שאליה משתייך האחראי על המשימה." : "Filter by the assignee's division (the division head)."} />
                    </label>
                    <select value={division} onChange={(e) => setDivision(e.target.value)} className={cn(selectCls, "w-full")}>
                      <option value={ALL}>{isHe ? "הכל" : "All"}</option>
                      {divisionOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {departmentOptions.length > 1 && (
                  <div>
                    <label className={labelCls}>
                      {isHe ? "אגף" : "Department"}
                      <FieldHint text={isHe ? "סינון לפי האגף שאליו משתייך האחראי על המשימה." : "Filter by the assignee's department."} />
                    </label>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className={cn(selectCls, "w-full")}>
                      <option value={ALL}>{isHe ? "הכל" : "All"}</option>
                      {departmentOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelCls}>{isHe ? "אחראי" : "Assignee"}</label>
                  <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={cn(selectCls, "w-full")}>
                    <option value={ALL}>{isHe ? "הכל" : "All"}</option>
                    {visibleUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {mode === "projects" && (
              <div>
                <label className={labelCls}>{isHe ? "מצב פרויקט" : "Project state"}</label>
                <select value={projBucket} onChange={(e) => setProjBucket(e.target.value)} className={cn(selectCls, "w-full")}>
                  <option value={ALL}>{isHe ? "הכל" : "All"}</option>
                  <option value="open">{isHe ? "פתוח" : "Open"}</option>
                  <option value="closed">{isHe ? "סגור" : "Closed"}</option>
                  <option value="new">{isHe ? "חדש" : "New"}</option>
                  <option value="rejected">{isHe ? "נדחה" : "Rejected"}</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {mode === "tasks"
                ? isHe
                  ? `נמצאו ${filteredTasks.length} משימות`
                  : `${filteredTasks.length} tasks`
                : isHe
                  ? `נמצאו ${projectRows.length} פרויקטים`
                  : `${projectRows.length} projects`}
            </div>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 h-9 rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="size-3.5" />
                  {isHe ? "נקה סינון" : "Clear"}
                </button>
              )}
              <button
                type="button"
                onClick={mode === "tasks" ? exportTasks : exportProjects}
                className="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition"
              >
                <Download className="size-3.5" />
                {isHe ? "ייצוא CSV" : "Export CSV"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {mode === "tasks" ? (
        <>
          {/* Task KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={isHe ? "סה\"כ משימות" : "Total"} value={taskKpis.total} tone="blue" />
            <KpiCard label={isHe ? "פתוחות" : "Open"} value={taskKpis.open} tone="amber" />
            <KpiCard label={isHe ? "סגורות" : "Closed"} value={taskKpis.closed} tone="emerald" />
            <KpiCard label={isHe ? "באיחור" : "Overdue"} value={taskKpis.overdue} tone="red" />
          </div>

          {/* Distribution dashboard */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {isHe ? "התפלגות משימות" : "Task distribution"}
                  <Badge variant="secondary" className="font-normal">
                    {txt(locale, scope.scopeLabel)}
                  </Badge>
                  <FieldHint
                    text={
                      isHe
                        ? "כמה משימות (פתוחות מול סגורות) יש בכל חטיבה / אגף / עובד. ההיקף מוגבל להרשאות שלך: הנהלה בכירה רואה את כל הארגון, מנהל חטיבה את החטיבה שלו, מנהל אגף את האגף שלו."
                        : "Open vs closed tasks per division / department / employee. Scope follows your permissions."
                    }
                  />
                </CardTitle>
                {/* Level selector — only levels allowed for this viewer */}
                <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                  {scope.levels.map((lv) => {
                    const Icon = LEVEL_META[lv].icon;
                    return (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setLevel(lv)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          activeLevel === lv ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                        {txt(locale, LEVEL_META[lv].label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {distribution.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {isHe ? "אין נתונים להצגה בסינון הנוכחי." : "No data for the current filter."}
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(220, distribution.length * 42)}>
                    <BarChart data={distribution} layout="vertical" margin={{ left: 12, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <RTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="open" name={isHe ? "פתוחות" : "Open"} stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="closed" name={isHe ? "סגורות" : "Closed"} stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Distribution table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-start text-xs text-muted-foreground border-b">
                          <th className="text-start font-medium py-2">{txt(locale, LEVEL_META[activeLevel].label)}</th>
                          <th className="text-center font-medium py-2">{isHe ? "סה\"כ" : "Total"}</th>
                          <th className="text-center font-medium py-2">{isHe ? "פתוחות" : "Open"}</th>
                          <th className="text-center font-medium py-2">{isHe ? "סגורות" : "Closed"}</th>
                          <th className="text-center font-medium py-2">{isHe ? "% מהסה\"כ" : "% of total"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distribution.map((row) => (
                          <tr key={row.name} className="border-b last:border-0">
                            <td className="py-2 font-medium">{row.name}</td>
                            <td className="py-2 text-center">{row.total}</td>
                            <td className="py-2 text-center text-amber-600">{row.open}</td>
                            <td className="py-2 text-center text-emerald-600">{row.closed}</td>
                            <td className="py-2 text-center text-muted-foreground">
                              {taskKpis.total ? Math.round((row.total / taskKpis.total) * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Filtered task report */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isHe ? "דוח משימות מפורט" : "Detailed task report"}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "משימה" : "Task"}</th>
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "פרויקט" : "Project"}</th>
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "אחראי" : "Assignee"}</th>
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "סטטוס" : "Status"}</th>
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "עדיפות" : "Priority"}</th>
                    <th className="text-start font-medium py-2">{isHe ? "יעד" : "Due"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.slice(0, 200).map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pe-3 font-medium max-w-[280px] truncate">{t.title}</td>
                      <td className="py-2 pe-3 text-muted-foreground max-w-[180px] truncate">{projectName(projectOfNode(t.wbsNodeId))}</td>
                      <td className="py-2 pe-3">{t.assigneeId ? userById.get(t.assigneeId)?.name ?? "—" : "—"}</td>
                      <td className="py-2 pe-3">
                        <span className={cn("status-badge", `status-${t.status}`)}>
                          {txt(locale, STATUS_LABELS_ML[t.status] ?? { he: t.status, en: t.status })}
                        </span>
                      </td>
                      <td className="py-2 pe-3">{txt(locale, PRIORITY_LABELS_ML[t.priority] ?? { he: t.priority, en: t.priority })}</td>
                      <td className={cn("py-2", isOverdue(t.plannedEnd, t.status) && "text-red-600 font-medium")}>
                        {formatDate(t.plannedEnd, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTasks.length > 200 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {isHe ? `מוצגות 200 מתוך ${filteredTasks.length}. צמצם/י את הסינון או ייצא/י CSV לרשימה המלאה.` : `Showing 200 of ${filteredTasks.length}. Narrow the filter or export CSV for the full list.`}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Project KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={isHe ? "סה\"כ פרויקטים" : "Total"} value={projectKpis.total} tone="blue" />
            <KpiCard label={isHe ? "פעילים" : "Active"} value={projectKpis.active} tone="amber" />
            <KpiCard label={isHe ? "הושלמו" : "Completed"} value={projectKpis.done} tone="emerald" />
            <KpiCard label={isHe ? "חדשים" : "New"} value={projectKpis.fresh} tone="violet" />
          </div>

          {/* Project completion chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isHe ? "התקדמות לפי פרויקט" : "Completion by project"}
                <FieldHint text={isHe ? "אחוז המשימות שהושלמו בכל פרויקט (עד 12 הגדולים ביותר לפי מספר משימות)." : "Completion rate per project (top 12 by task count)."} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectChart.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{isHe ? "אין פרויקטים להצגה בסינון הנוכחי." : "No projects for the current filter."}</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, projectChart.length * 40)}>
                  <BarChart data={projectChart} layout="vertical" margin={{ left: 12, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <RTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                      formatter={(v: number) => [`${v}%`, isHe ? "הושלם" : "Completion"]}
                    />
                    <Bar dataKey="completion" name={isHe ? "% הושלמו" : "% done"} radius={[0, 4, 4, 0]}>
                      {projectChart.map((entry, i) => (
                        <Cell key={i} fill={entry.completion >= 70 ? "#10b981" : entry.completion >= 40 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Project report */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isHe ? "דוח פרויקטים מפורט" : "Detailed project report"}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "פרויקט" : "Project"}</th>
                    <th className="text-start font-medium py-2 pe-3">{isHe ? "מצב" : "State"}</th>
                    <th className="text-center font-medium py-2 pe-3">{isHe ? "משימות" : "Tasks"}</th>
                    <th className="text-center font-medium py-2 pe-3">{isHe ? "הושלמו" : "Done"}</th>
                    <th className="text-start font-medium py-2 w-[160px]">{isHe ? "התקדמות" : "Progress"}</th>
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((r) => (
                    <tr key={r.p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pe-3 font-medium max-w-[300px] truncate">{r.p.name}</td>
                      <td className="py-2 pe-3">
                        <Badge
                          variant={r.bucket === "closed" ? "success" : r.bucket === "rejected" ? "destructive" : r.bucket === "new" ? "secondary" : "warning"}
                        >
                          {{ open: isHe ? "פתוח" : "Open", closed: isHe ? "סגור" : "Closed", new: isHe ? "חדש" : "New", rejected: isHe ? "נדחה" : "Rejected" }[r.bucket]}
                        </Badge>
                      </td>
                      <td className="py-2 pe-3 text-center">{r.ptasks.length}</td>
                      <td className="py-2 pe-3 text-center text-emerald-600">{r.done}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${r.completion}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-9 text-end">{r.completion}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {projectRows.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">{isHe ? "אין פרויקטים בסינון הנוכחי." : "No projects for the current filter."}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "emerald" | "red" | "violet" }) {
  const toneCls: Record<string, string> = {
    blue: "text-blue-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
    violet: "text-violet-600",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-3xl font-bold mt-1", toneCls[tone])}>{value}</div>
      </CardContent>
    </Card>
  );
}
