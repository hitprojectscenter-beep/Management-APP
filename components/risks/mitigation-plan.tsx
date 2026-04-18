"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  TrendingUp,
  Target,
  Wrench,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import type { MitigationPlan, MitigationStrategy, MitigationAction } from "@/lib/ai/mitigation-engine";
import type { MockUser } from "@/lib/db/mock-data";

const CATEGORY_META: Record<string, { he: string; en: string; icon: typeof Wrench; color: string }> = {
  resource: { he: "משאבים", en: "Resource", icon: Users, color: "text-blue-600" },
  schedule: { he: "לו״ז", en: "Schedule", icon: TrendingUp, color: "text-purple-600" },
  scope: { he: "תכולה", en: "Scope", icon: Target, color: "text-amber-600" },
  process: { he: "תהליך", en: "Process", icon: ClipboardList, color: "text-emerald-600" },
  escalation: { he: "הסלמה", en: "Escalation", icon: AlertOctagon, color: "text-red-600" },
};

const SEVERITY_BADGE: Record<string, "destructive" | "warning" | "secondary"> = {
  critical: "destructive",
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const EFFORT_LABELS = {
  low: { he: "מאמץ נמוך", en: "Low effort", color: "text-emerald-600" },
  medium: { he: "מאמץ בינוני", en: "Medium effort", color: "text-amber-600" },
  high: { he: "מאמץ גבוה", en: "High effort", color: "text-red-600" },
};

const IMPACT_LABELS = {
  low: { he: "השפעה נמוכה", en: "Low impact", color: "text-slate-600" },
  medium: { he: "השפעה בינונית", en: "Medium impact", color: "text-blue-600" },
  high: { he: "השפעה גבוהה", en: "High impact", color: "text-purple-600" },
};

export function MitigationPlanCard({
  plan,
  users,
  locale,
}: {
  plan: MitigationPlan;
  users: MockUser[];
  locale: string;
}) {
  const isHe = locale === "he"; // kept for RTL arrow direction
  const Arrow = isHe ? ArrowLeft : ArrowRight;
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());

  const toggleStrategy = (id: string) => {
    setExpandedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50/40 via-indigo-50/30 to-blue-50/20 dark:from-purple-950/15 dark:via-indigo-950/10 dark:to-blue-950/5">
      {/* Header with summary */}
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {txt(locale, { he: "תוכנית ניהול סיכונים של ה-AI", en: "AI Mitigation Plan" })}
                <Badge variant="outline" className="bg-background">
                  <Sparkles className="size-3 me-1" />
                  Claude AI
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {txt(locale, {
                  he: "תוכנית פעולה אקטיבית: שיבוצים מחדש, אסטרטגיות גידור, התרעות מוקדמות והמלצות אקטיביות",
                  en: "Active playbook: reassignments, mitigation strategies, early warnings, and active recommendations",
                })}
              </CardDescription>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="px-3 py-1.5 rounded-md bg-background border">
              <div className="text-2xl font-black text-purple-600">{plan.summary.totalActions}</div>
              <div className="text-[9px] text-muted-foreground uppercase">{txt(locale, { he: "פעולות סה״כ", en: "Total actions" })}</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-300">
              <div className="text-2xl font-black text-red-600">{plan.summary.immediateActions}</div>
              <div className="text-[9px] text-muted-foreground uppercase">{txt(locale, { he: "מיידיות", en: "Immediate" })}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ===== Section 1: Smart Reassignment ===== */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-8 rounded-md bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
              <Users className="size-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-base">
              {txt(locale, { he: "1. הצעות שיבוץ מחדש חכמות", en: "1. Smart Reassignment Suggestions" })}
            </h3>
            <Badge variant="outline" className="bg-background ms-auto">
              {plan.reassignments.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
            <Info className="size-3 mt-0.5 shrink-0 text-blue-500" />
            {txt(locale, {
              he: "ה-AI מתאים בין משימות שעמוסות לחברי צוות אחרים על בסיס: כישורים תואמים, זמינות נוכחית והיסטוריית ביצועים.",
              en: "AI matches over-loaded tasks to alternative team members based on: skill match, current availability, and performance history.",
            })}
          </p>
          {plan.reassignments.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {txt(locale, { he: "אין צורך בשיבוצים מחדש כעת 🎉", en: "No reassignments needed 🎉" })}
            </div>
          ) : (
            <div className="space-y-2">
              {plan.reassignments.map((r) => {
                const fromUser = users.find((u) => u.id === r.fromUserId);
                const toUser = users.find((u) => u.id === r.toUserId);
                return (
                  <div
                    key={`${r.taskId}-${r.toUserId}`}
                    className="p-3 rounded-lg border bg-background hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/tasks/${r.taskId}`}
                        className="font-semibold text-sm hover:text-primary line-clamp-1 flex-1"
                      >
                        {r.taskTitle}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            r.matchScore >= 70
                              ? "bg-emerald-100 text-emerald-700"
                              : r.matchScore >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          )}
                        >
                          {r.matchScore} match
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* From */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {fromUser && (
                          <Avatar
                            src={fromUser.image}
                            fallback={fromUser.name[0]}
                            className="size-8 ring-2 ring-red-300 opacity-60"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {txt(locale, { he: "מ-", en: "From" })}
                          </div>
                          <div className="text-xs font-semibold truncate line-through">{r.fromUserName}</div>
                        </div>
                      </div>
                      <Arrow className="size-4 text-purple-600 shrink-0" />
                      {/* To */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {toUser && (
                          <Avatar
                            src={toUser.image}
                            fallback={toUser.name[0]}
                            className="size-8 ring-2 ring-emerald-400"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-[10px] text-emerald-600 uppercase font-bold">
                            {txt(locale, { he: "ל-", en: "To" })}
                          </div>
                          <div className="text-xs font-semibold truncate text-emerald-700">{r.toUserName}</div>
                        </div>
                      </div>
                    </div>
                    {/* Reasoning */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.reasoning.map((reason, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-normal">
                          ✓ {reason}
                        </Badge>
                      ))}
                    </div>
                    {/* Mini metrics */}
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
                      <div>
                        <div className="text-purple-600 font-bold">{r.skillMatch}%</div>
                        <div className="text-muted-foreground">{txt(locale, { he: "כישורים", en: "skills" })}</div>
                      </div>
                      <div>
                        <div className="text-blue-600 font-bold">{r.availability}%</div>
                        <div className="text-muted-foreground">{txt(locale, { he: "זמינות", en: "available" })}</div>
                      </div>
                      <div>
                        <div className="text-emerald-600 font-bold">{r.performance}/100</div>
                        <div className="text-muted-foreground">{txt(locale, { he: "ביצועים", en: "perf" })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== Section 2: Mitigation Strategies ===== */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <Wrench className="size-4 text-emerald-600" />
            </div>
            <h3 className="font-bold text-base">
              {txt(locale, { he: "2. אסטרטגיות גידור (Mitigation)", en: "2. Mitigation Strategies" })}
            </h3>
            <Badge variant="outline" className="bg-background ms-auto">
              {plan.strategies.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
            <Info className="size-3 mt-0.5 shrink-0 text-blue-500" />
            {txt(locale, {
              he: "לכל סיכון, ה-AI מציע 2-3 פעולות גידור עם דירוג מאמץ והשפעה. הפעולה המומלצת מסומנת ב-⭐.",
              en: "For each risk, AI proposes 2-3 mitigation actions rated by effort and impact. The preferred one is marked ⭐.",
            })}
          </p>
          {plan.strategies.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {txt(locale, { he: "אין סיכונים פעילים שדורשים גידור 🎉", en: "No active risks need mitigation 🎉" })}
            </div>
          ) : (
            <div className="space-y-2">
              {plan.strategies.map((s) => {
                const isExpanded = expandedStrategies.has(s.taskId);
                return (
                  <div key={s.taskId} className="rounded-lg border bg-background overflow-hidden">
                    <button
                      onClick={() => toggleStrategy(s.taskId)}
                      className="w-full p-3 text-start hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant={SEVERITY_BADGE[s.riskSeverity]}>{s.riskSeverity}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {s.riskType}
                        </Badge>
                        <span className="ms-auto text-muted-foreground">
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </span>
                      </div>
                      <div className="font-semibold text-sm line-clamp-1">{s.taskTitle}</div>
                      {/* Preferred action preview */}
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span>⭐</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {s.preferredAction.title}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-3 space-y-2">
                        {s.actions.map((action, i) => {
                          const isPreferred = action.title === s.preferredAction.title;
                          const meta = CATEGORY_META[action.category];
                          const Icon = meta.icon;
                          return (
                            <div
                              key={i}
                              className={cn(
                                "p-3 rounded border bg-background",
                                isPreferred && "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <Icon className={cn("size-4 mt-0.5 shrink-0", meta.color)} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isPreferred && <span className="text-base">⭐</span>}
                                    <span className="font-semibold text-sm">{action.title}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{action.detail}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="outline" className={cn("text-[10px]", EFFORT_LABELS[action.effort].color)}>
                                      ⚡ {txt(locale, { he: EFFORT_LABELS[action.effort].he, en: EFFORT_LABELS[action.effort].en })}
                                    </Badge>
                                    <Badge variant="outline" className={cn("text-[10px]", IMPACT_LABELS[action.impact].color)}>
                                      📈 {txt(locale, { he: IMPACT_LABELS[action.impact].he, en: IMPACT_LABELS[action.impact].en })}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px]">
                                      🕐 {action.timeframe}
                                    </Badge>
                                  </div>
                                </div>
                                {isPreferred && (
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
                                    <CheckCircle2 className="size-3" />
                                    {txt(locale, { he: "הפעל", en: "Apply" })}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== Section 3: Early Warnings ===== */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-8 rounded-md bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <Eye className="size-4 text-amber-600" />
            </div>
            <h3 className="font-bold text-base">
              {txt(locale, { he: "3. התרעות מוקדמות (Early Warnings)", en: "3. Early Warnings" })}
            </h3>
            <Badge variant="outline" className="bg-background ms-auto">
              {plan.earlyWarnings.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
            <Info className="size-3 mt-0.5 shrink-0 text-blue-500" />
            {txt(locale, {
              he: "ה-AI מזהה דברים שיהפכו לבעיה לפני שהם משפיעים על אבני הדרך, ומאפשר לך למנוע אותם מראש.",
              en: "AI identifies things that will become problems before they affect milestones, enabling proactive prevention.",
            })}
          </p>
          {plan.earlyWarnings.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {txt(locale, { he: "אין התרעות מוקדמות 🎉", en: "No early warnings 🎉" })}
            </div>
          ) : (
            <div className="space-y-2">
              {plan.earlyWarnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border-s-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== Section 4: Footer ===== */}
        <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-purple-600" />
            <span>{txt(locale, { he: "תוכנית נוצרה ב-", en: "Plan generated at" })} {new Date(plan.generatedAt).toLocaleString(locale === "he" ? "he-IL" : "en-US")}</span>
          </div>
          <Button variant="outline" size="sm">
            <Sparkles className="size-3" />
            {txt(locale, { he: "רענן תוכנית", en: "Regenerate" })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
