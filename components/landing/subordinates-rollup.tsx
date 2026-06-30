"use client";
import { useMemo } from "react";
import type { MockTask, MockUser } from "@/lib/db/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/lib/i18n/routing";
import { txt, STATUS_LABELS_ML } from "@/lib/utils/locale-text";
import { STATUS_COLORS, type TaskStatus } from "@/lib/db/types";
import { AlertTriangle, Users2, CheckSquare, History } from "lucide-react";
import { formatDate } from "@/lib/utils";

const CLOSED = new Set(["done", "completed", "cancelled", "rejected"]);

/**
 * Manager rollup for the "משימות הכפופים אלי" tab — a quick read on the whole
 * reporting subtree: open/overdue counts, a status breakdown, per-member
 * workload (who's carrying the most open tasks), and the single oldest open
 * task (the one most at risk). Pure function of the subtree's tasks; no fetch.
 */
export function SubordinatesRollup({ tasks, users, locale }: { tasks: MockTask[]; users: MockUser[]; locale: string }) {
  const roll = useMemo(() => {
    const now = Date.now();
    const open = tasks.filter((t) => !CLOSED.has(t.status));
    const byStatus = new Map<string, number>();
    for (const t of tasks) byStatus.set(t.status, (byStatus.get(t.status) || 0) + 1);
    const overdue = open.filter((t) => t.plannedEnd && new Date(t.plannedEnd).getTime() < now).length;
    const byMember = new Map<string, number>();
    for (const t of open) if (t.assigneeId) byMember.set(t.assigneeId, (byMember.get(t.assigneeId) || 0) + 1);
    const workload = [...byMember.entries()].map(([uid, count]) => ({ uid, count })).sort((a, b) => b.count - a.count);
    const maxLoad = workload.reduce((m, w) => Math.max(m, w.count), 0);
    const oldest = [...open]
      .filter((t) => t.plannedEnd)
      .sort((a, b) => new Date(a.plannedEnd).getTime() - new Date(b.plannedEnd).getTime())[0] || null;
    return { total: tasks.length, openCount: open.length, byStatus: [...byStatus.entries()], overdue, workload, maxLoad, oldest };
  }, [tasks]);

  const name = (uid: string) => users.find((u) => u.id === uid)?.name || uid;
  const img = (uid: string) => users.find((u) => u.id === uid)?.image;
  if (roll.total === 0) return null;

  return (
    <Card className="border-blue-200/60 bg-blue-50/30 dark:bg-blue-950/10">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users2 className="size-4 text-blue-600" />
          {txt(locale, { he: "סיכום הכפופים אלי", en: "My team rollup", ru: "Сводка по подчинённым", fr: "Synthèse de mon équipe", es: "Resumen de mi equipo" })}
        </div>

        {/* Top numbers + status breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<CheckSquare className="size-4 text-blue-600" />} value={roll.openCount} label={txt(locale, { he: "פתוחות", en: "Open", ru: "Открытых", fr: "Ouvertes", es: "Abiertas" })} />
          <Stat icon={<AlertTriangle className="size-4 text-red-600" />} value={roll.overdue} label={txt(locale, { he: "באיחור", en: "Overdue", ru: "Просрочено", fr: "En retard", es: "Vencidas" })} danger={roll.overdue > 0} />
          <Stat icon={<Users2 className="size-4 text-indigo-600" />} value={roll.workload.length} label={txt(locale, { he: "אנשים עם משימות", en: "People with tasks", ru: "Людей с задачами", fr: "Personnes avec tâches", es: "Personas con tareas" })} />
          <Stat icon={<History className="size-4 text-slate-600" />} value={roll.total} label={txt(locale, { he: "סה״כ בתת-העץ", en: "Total in subtree", ru: "Всего", fr: "Total", es: "Total" })} />
        </div>

        {/* Status chips */}
        {roll.byStatus.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roll.byStatus.map(([s, n]) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s as TaskStatus] || "hsl(220,9%,46%)" }} />
                {STATUS_LABELS_ML[s] ? txt(locale, STATUS_LABELS_ML[s]) : s}
                <span className="font-bold">{n}</span>
              </span>
            ))}
          </div>
        )}

        {/* Per-member workload (top 6) + oldest open task */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground">{txt(locale, { he: "עומס לפי אדם (משימות פתוחות)", en: "Workload by person (open tasks)", ru: "Нагрузка по людям", fr: "Charge par personne", es: "Carga por persona" })}</div>
            {roll.workload.slice(0, 6).map((w) => (
              <div key={w.uid} className="flex items-center gap-2">
                <Avatar src={img(w.uid)} fallback={name(w.uid)[0]} className="size-5 shrink-0" />
                <span className="text-xs min-w-0 truncate flex-1">{name(w.uid)}</span>
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${roll.maxLoad ? (w.count / roll.maxLoad) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-bold w-5 text-end">{w.count}</span>
              </div>
            ))}
            {roll.workload.length === 0 && <div className="text-xs text-muted-foreground">{txt(locale, { he: "אין משימות פתוחות", en: "No open tasks", ru: "Нет открытых задач", fr: "Aucune tâche", es: "Sin tareas" })}</div>}
          </div>

          {roll.oldest && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground">{txt(locale, { he: "המשימה הוותיקה ביותר (בסיכון)", en: "Oldest open task (at risk)", ru: "Самая старая задача", fr: "Tâche la plus ancienne", es: "Tarea más antigua" })}</div>
              <Link href={`/tasks/${roll.oldest.id}`} className="block rounded-md border p-2.5 hover:bg-accent transition-colors">
                <div className="text-sm font-medium line-clamp-1">{locale === "he" ? roll.oldest.title : roll.oldest.titleEn || roll.oldest.title}</div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[roll.oldest.status as TaskStatus] || "hsl(220,9%,46%)" }} />
                    {STATUS_LABELS_ML[roll.oldest.status] ? txt(locale, STATUS_LABELS_ML[roll.oldest.status]) : roll.oldest.status}
                  </span>
                  <span>·</span>
                  <span>{formatDate(roll.oldest.plannedEnd, locale)}</span>
                  {roll.oldest.assigneeId && (<><span>·</span><span>{name(roll.oldest.assigneeId)}</span></>)}
                </div>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, value, label, danger }: { icon: React.ReactNode; value: number; label: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <div className="flex items-center gap-1.5">{icon}<span className={`text-xl font-bold ${danger ? "text-red-600" : ""}`}>{value}</span></div>
      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{label}</div>
    </div>
  );
}
