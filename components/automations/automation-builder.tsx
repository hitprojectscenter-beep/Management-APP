"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap, ArrowDown, Plus, Clock, CheckSquare, AlertTriangle,
  Users, Mail, Bell, GitBranch, Calendar, Sparkles, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================
// Trigger, Condition, Action definitions (no-code building blocks)
// ============================================================

const TRIGGERS = [
  { id: "status_changed", icon: CheckSquare, labelHe: "סטטוס משימה השתנה", labelEn: "Task status changed",
    params: [{ id: "from_status", labelHe: "מסטטוס", labelEn: "From status", type: "select",
      options: ["any", "not_started", "in_progress", "review", "blocked"] },
    { id: "to_status", labelHe: "לסטטוס", labelEn: "To status", type: "select",
      options: ["any", "not_started", "in_progress", "review", "done", "blocked"] }]
  },
  { id: "due_approaching", icon: Clock, labelHe: "תאריך יעד מתקרב", labelEn: "Due date approaching",
    params: [{ id: "days_before", labelHe: "ימים לפני", labelEn: "Days before", type: "number", default: "3" }]
  },
  { id: "task_overdue", icon: AlertTriangle, labelHe: "משימה באיחור", labelEn: "Task overdue",
    params: [{ id: "days_overdue", labelHe: "ימי איחור", labelEn: "Days overdue", type: "number", default: "1" }]
  },
  { id: "task_created", icon: Plus, labelHe: "משימה חדשה נוצרה", labelEn: "New task created", params: [] },
  { id: "task_assigned", icon: Users, labelHe: "משימה הוקצתה", labelEn: "Task assigned", params: [] },
  { id: "comment_added", icon: Bell, labelHe: "תגובה נוספה", labelEn: "Comment added", params: [] },
  { id: "milestone_reached", icon: GitBranch, labelHe: "אבן דרך הושגה", labelEn: "Milestone reached", params: [] },
  { id: "schedule", icon: Calendar, labelHe: "לפי לוח זמנים", labelEn: "On schedule",
    params: [{ id: "cron", labelHe: "תדירות", labelEn: "Frequency", type: "select",
      options: ["daily", "weekly", "monthly"] }]
  },
] as const;

const CONDITIONS = [
  { id: "task_priority", labelHe: "עדיפות המשימה", labelEn: "Task priority",
    params: [{ id: "priority", labelHe: "שווה ל", labelEn: "Equals", type: "select",
      options: ["any", "low", "medium", "high", "critical"] }]
  },
  { id: "project_is", labelHe: "שייך לפרויקט", labelEn: "Belongs to project",
    params: [{ id: "project", labelHe: "פרויקט", labelEn: "Project", type: "text" }]
  },
  { id: "assignee_is", labelHe: "מוקצה ל", labelEn: "Assigned to",
    params: [{ id: "user", labelHe: "משתמש", labelEn: "User", type: "text" }]
  },
  { id: "has_tag", labelHe: "מכיל תגית", labelEn: "Has tag",
    params: [{ id: "tag", labelHe: "תגית", labelEn: "Tag", type: "text" }]
  },
] as const;

const ACTIONS = [
  { id: "notify_assignee", icon: Bell, labelHe: "שלח התראה לאחראי", labelEn: "Notify assignee",
    params: [{ id: "message", labelHe: "הודעה", labelEn: "Message", type: "text" }]
  },
  { id: "notify_manager", icon: Mail, labelHe: "שלח התראה למנהל", labelEn: "Notify manager",
    params: [{ id: "message", labelHe: "הודעה", labelEn: "Message", type: "text" }]
  },
  { id: "change_status", icon: CheckSquare, labelHe: "שנה סטטוס", labelEn: "Change status",
    params: [{ id: "new_status", labelHe: "סטטוס חדש", labelEn: "New status", type: "select",
      options: ["not_started", "in_progress", "review", "done", "blocked"] }]
  },
  { id: "change_priority", icon: AlertTriangle, labelHe: "שנה עדיפות", labelEn: "Change priority",
    params: [{ id: "new_priority", labelHe: "עדיפות חדשה", labelEn: "New priority", type: "select",
      options: ["low", "medium", "high", "critical"] }]
  },
  { id: "assign_to", icon: Users, labelHe: "הקצה למשתמש", labelEn: "Assign to user",
    params: [{ id: "user", labelHe: "משתמש", labelEn: "User", type: "text" }]
  },
  { id: "create_subtask", icon: Plus, labelHe: "צור תת-משימה", labelEn: "Create subtask",
    params: [{ id: "title", labelHe: "כותרת", labelEn: "Title", type: "text" }]
  },
  { id: "ai_generate_subtasks", icon: Sparkles, labelHe: "AI: צור תת-משימות אוטומטית", labelEn: "AI: Auto-generate subtasks",
    params: []
  },
  { id: "ai_risk_scan", icon: Sparkles, labelHe: "AI: סרוק סיכונים", labelEn: "AI: Scan for risks",
    params: []
  },
] as const;

// ============================================================
// Templates (pre-built automations)
// ============================================================
const TEMPLATES = [
  {
    id: "tpl-overdue-alert",
    nameHe: "התראה על משימות באיחור",
    nameEn: "Overdue task alert",
    descHe: "כשמשימה עוברת את תאריך היעד — שלח התראה לאחראי ולמנהל",
    descEn: "When a task passes its due date — notify assignee and manager",
    trigger: "task_overdue",
    conditions: [],
    actions: ["notify_assignee", "notify_manager"],
  },
  {
    id: "tpl-sla-escalation",
    nameHe: "הסלמת SLA",
    nameEn: "SLA escalation",
    descHe: "3 ימים לפני דדליין של משימה קריטית — שנה עדיפות והתריע",
    descEn: "3 days before a critical task deadline — escalate and notify",
    trigger: "due_approaching",
    conditions: ["task_priority"],
    actions: ["change_priority", "notify_manager"],
  },
  {
    id: "tpl-auto-subtasks",
    nameHe: "יצירת תת-משימות אוטומטית",
    nameEn: "Auto-generate subtasks",
    descHe: "כשמשימה חדשה נוצרת — AI מפרק אותה לתת-משימות",
    descEn: "When a new task is created — AI breaks it into subtasks",
    trigger: "task_created",
    conditions: [],
    actions: ["ai_generate_subtasks"],
  },
  {
    id: "tpl-done-notify",
    nameHe: "התראה על השלמת משימה",
    nameEn: "Task completion notification",
    descHe: "כשמשימה עוברת ל'הושלם' — התריע למנהל",
    descEn: "When a task moves to Done — notify manager",
    trigger: "status_changed",
    conditions: [],
    actions: ["notify_manager"],
  },
  {
    id: "tpl-blocked-escalation",
    nameHe: "הסלמת חסימות",
    nameEn: "Blocked task escalation",
    descHe: "כשמשימה נחסמת — שנה עדיפות לגבוהה ושלח התראה",
    descEn: "When a task is blocked — raise priority and alert",
    trigger: "status_changed",
    conditions: [],
    actions: ["change_priority", "notify_assignee", "notify_manager"],
  },
];

// ============================================================
// Builder Component
// ============================================================

interface BuilderState {
  name: string;
  trigger: string;
  triggerParams: Record<string, string>;
  conditions: { id: string; params: Record<string, string> }[];
  actions: { id: string; params: Record<string, string> }[];
}

export function AutomationBuilder({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const isHe = locale === "he";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"templates" | "builder">("templates");
  const [state, setState] = useState<BuilderState>({
    name: "",
    trigger: "",
    triggerParams: {},
    conditions: [],
    actions: [],
  });

  const reset = () => {
    setState({ name: "", trigger: "", triggerParams: {}, conditions: [], actions: [] });
    setStep("templates");
  };

  const applyTemplate = (tpl: typeof TEMPLATES[number]) => {
    setState({
      name: isHe ? tpl.nameHe : tpl.nameEn,
      trigger: tpl.trigger,
      triggerParams: {},
      conditions: tpl.conditions.map((c) => ({ id: c, params: {} })),
      actions: tpl.actions.map((a) => ({ id: a, params: {} })),
    });
    setStep("builder");
  };

  const addCondition = (id: string) => {
    setState((s) => ({ ...s, conditions: [...s.conditions, { id, params: {} }] }));
  };

  const removeCondition = (idx: number) => {
    setState((s) => ({ ...s, conditions: s.conditions.filter((_, i) => i !== idx) }));
  };

  const addAction = (id: string) => {
    setState((s) => ({ ...s, actions: [...s.actions, { id, params: {} }] }));
  };

  const removeAction = (idx: number) => {
    setState((s) => ({ ...s, actions: s.actions.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!state.name.trim()) {
      toast.error(isHe ? "חובה לתת שם לאוטומציה" : "Automation name required");
      return;
    }
    if (!state.trigger) {
      toast.error(isHe ? "חובה לבחור טריגר" : "Must select a trigger");
      return;
    }
    if (state.actions.length === 0) {
      toast.error(isHe ? "חובה להוסיף לפחות פעולה אחת" : "Must add at least one action");
      return;
    }

    toast.success(isHe ? `האוטומציה "${state.name}" נוצרה!` : `Automation "${state.name}" created!`, {
      description: isHe
        ? `טריגר + ${state.conditions.length} תנאים + ${state.actions.length} פעולות`
        : `Trigger + ${state.conditions.length} conditions + ${state.actions.length} actions`,
    });
    setOpen(false);
    reset();
  };

  const selectedTrigger = TRIGGERS.find((t) => t.id === state.trigger);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-violet-600" />
            {isHe ? "בניית אוטומציה חדשה" : "Build New Automation"}
          </DialogTitle>
          <DialogDescription>
            {step === "templates"
              ? isHe ? "בחר תבנית מוכנה או בנה מאפס — ללא קוד!" : "Pick a template or build from scratch — no code!"
              : isHe ? "הגדר טריגר → תנאים (אופציונלי) → פעולות" : "Set trigger → conditions (optional) → actions"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "templates" ? (
          <div className="space-y-4">
            {/* Templates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 text-start transition-all min-h-[44px]"
                >
                  <div className="font-semibold text-sm">{isHe ? tpl.nameHe : tpl.nameEn}</div>
                  <div className="text-xs text-muted-foreground mt-1">{isHe ? tpl.descHe : tpl.descEn}</div>
                </button>
              ))}
            </div>

            {/* Build from scratch */}
            <div className="border-t pt-3">
              <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setStep("builder")}>
                <Plus className="size-4" />
                {isHe ? "בנה מאפס" : "Build from scratch"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>{isHe ? "שם האוטומציה" : "Automation name"} <span className="text-red-500">*</span></Label>
              <Input
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                placeholder={isHe ? "לדוגמה: התראה על משימות באיחור" : "e.g., Alert on overdue tasks"}
                className="min-h-[44px]"
              />
            </div>

            {/* === TRIGGER === */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-xs font-bold">1</div>
                <Label className="text-base font-bold">{isHe ? "כשזה קורה (טריגר)" : "When this happens (trigger)"} <span className="text-red-500">*</span></Label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRIGGERS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setState({ ...state, trigger: t.id, triggerParams: {} })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all min-h-[36px]",
                        state.trigger === t.id
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-border bg-background hover:bg-accent"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {isHe ? t.labelHe : t.labelEn}
                    </button>
                  );
                })}
              </div>
              {/* Trigger params */}
              {selectedTrigger && selectedTrigger.params.length > 0 && (
                <div className="ps-10 space-y-2">
                  {selectedTrigger.params.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Label className="text-xs w-20 shrink-0">{isHe ? p.labelHe : p.labelEn}</Label>
                      {p.type === "select" ? (
                        <select
                          value={state.triggerParams[p.id] || (p as any).options?.[0] || ""}
                          onChange={(e) => setState({ ...state, triggerParams: { ...state.triggerParams, [p.id]: e.target.value } })}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1 min-h-[36px]"
                        >
                          {(p as any).options?.map((o: string) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={p.type}
                          value={state.triggerParams[p.id] || (p as any).default || ""}
                          onChange={(e) => setState({ ...state, triggerParams: { ...state.triggerParams, [p.id]: e.target.value } })}
                          className="flex-1 h-9 min-h-[36px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center"><ArrowDown className="size-5 text-muted-foreground" /></div>

            {/* === CONDITIONS (optional) === */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 text-xs font-bold">2</div>
                <Label className="text-base font-bold">{isHe ? "רק אם (תנאי — אופציונלי)" : "Only if (condition — optional)"}</Label>
              </div>
              {state.conditions.map((cond, idx) => {
                const def = CONDITIONS.find((c) => c.id === cond.id);
                return (
                  <div key={idx} className="flex items-center gap-2 ps-10">
                    <Badge variant="outline" className="shrink-0">{isHe ? def?.labelHe : def?.labelEn}</Badge>
                    {def?.params.map((p) => (
                      <Input
                        key={p.id}
                        placeholder={isHe ? p.labelHe : p.labelEn}
                        value={cond.params[p.id] || ""}
                        onChange={(e) => {
                          const updated = [...state.conditions];
                          updated[idx] = { ...cond, params: { ...cond.params, [p.id]: e.target.value } };
                          setState({ ...state, conditions: updated });
                        }}
                        className="flex-1 h-8 text-xs min-h-[36px]"
                      />
                    ))}
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => removeCondition(idx)}>
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-1 ps-10">
                {CONDITIONS.map((c) => (
                  <button key={c.id} onClick={() => addCondition(c.id)}
                    className="text-[10px] px-2 py-1 rounded border border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 min-h-[28px]"
                  >
                    + {isHe ? c.labelHe : c.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center"><ArrowDown className="size-5 text-muted-foreground" /></div>

            {/* === ACTIONS === */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-xs font-bold">3</div>
                <Label className="text-base font-bold">{isHe ? "אז תבצע (פעולות)" : "Then do (actions)"} <span className="text-red-500">*</span></Label>
              </div>
              {state.actions.map((act, idx) => {
                const def = ACTIONS.find((a) => a.id === act.id);
                const Icon = def?.icon || Zap;
                return (
                  <div key={idx} className="flex items-center gap-2 ps-10">
                    <Icon className="size-4 text-emerald-600 shrink-0" />
                    <Badge variant="outline" className="shrink-0 bg-emerald-50 dark:bg-emerald-950/30">
                      {isHe ? def?.labelHe : def?.labelEn}
                    </Badge>
                    {def?.params.map((p) => (
                      p.type === "select" ? (
                        <select key={p.id}
                          value={act.params[p.id] || ""}
                          onChange={(e) => {
                            const updated = [...state.actions];
                            updated[idx] = { ...act, params: { ...act.params, [p.id]: e.target.value } };
                            setState({ ...state, actions: updated });
                          }}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1 min-h-[36px]"
                        >
                          {(p as any).options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <Input key={p.id}
                          placeholder={isHe ? p.labelHe : p.labelEn}
                          value={act.params[p.id] || ""}
                          onChange={(e) => {
                            const updated = [...state.actions];
                            updated[idx] = { ...act, params: { ...act.params, [p.id]: e.target.value } };
                            setState({ ...state, actions: updated });
                          }}
                          className="flex-1 h-8 text-xs min-h-[36px]"
                        />
                      )
                    ))}
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => removeAction(idx)}>
                      <Trash2 className="size-3 text-red-500" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-1 ps-10">
                {ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.id} onClick={() => addAction(a.id)}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 min-h-[28px]"
                    >
                      <Icon className="size-3" />
                      + {isHe ? a.labelHe : a.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {state.trigger && state.actions.length > 0 && (
              <Card className="bg-violet-50/50 dark:bg-violet-950/20 border-violet-300">
                <CardContent className="p-3 text-xs">
                  <div className="font-bold text-violet-700 dark:text-violet-300 mb-1">
                    {isHe ? "סיכום:" : "Summary:"}
                  </div>
                  <div>
                    <span className="text-blue-600">{isHe ? "כש: " : "When: "}</span>
                    {isHe ? TRIGGERS.find((t) => t.id === state.trigger)?.labelHe : TRIGGERS.find((t) => t.id === state.trigger)?.labelEn}
                  </div>
                  {state.conditions.length > 0 && (
                    <div>
                      <span className="text-amber-600">{isHe ? "ורק אם: " : "Only if: "}</span>
                      {state.conditions.map((c) => isHe ? CONDITIONS.find((d) => d.id === c.id)?.labelHe : CONDITIONS.find((d) => d.id === c.id)?.labelEn).join(", ")}
                    </div>
                  )}
                  <div>
                    <span className="text-emerald-600">{isHe ? "אז: " : "Then: "}</span>
                    {state.actions.map((a) => isHe ? ACTIONS.find((d) => d.id === a.id)?.labelHe : ACTIONS.find((d) => d.id === a.id)?.labelEn).join(" → ")}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {step === "builder" && (
            <Button variant="outline" onClick={() => setStep("templates")} className="min-h-[44px]">
              {isHe ? "חזור לתבניות" : "Back to templates"}
            </Button>
          )}
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }} className="min-h-[44px]">
            {isHe ? "ביטול" : "Cancel"}
          </Button>
          {step === "builder" && (
            <Button onClick={handleSave} className="min-h-[44px] bg-violet-600 hover:bg-violet-700">
              <Zap className="size-4" />
              {isHe ? "צור אוטומציה" : "Create Automation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
