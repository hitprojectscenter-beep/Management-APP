"use client";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { MockUser, MockWbsNode } from "@/lib/db/mock-data";
import { mockItemTypes } from "@/lib/db/mock-data";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

// ============================================
// Task source options (per spec)
// ============================================
const TASK_SOURCES = [
  { value: "manager_decision", labelHe: "החלטת מנהל", labelEn: "Manager Decision" },
  { value: "following_meeting", labelHe: "בהמשך לפגישה", labelEn: "Following a Meeting" },
  { value: "meeting_prep", labelHe: "הכנה לפגישה", labelEn: "Meeting Preparation" },
  { value: "other", labelHe: "אחר", labelEn: "Other" },
] as const;

// Project methodology options
const METHODOLOGY_OPTIONS = [
  { value: "waterfall", icon: "📊", he: "Waterfall — מפל מים", en: "Waterfall", desc: { he: "שלבים רציפים, שערי שלב", en: "Sequential phases, gate reviews" } },
  { value: "agile", icon: "🔄", he: "Agile — גמיש", en: "Agile / Scrum", desc: { he: "Sprints, velocity, user stories", en: "Sprints, velocity, user stories" } },
  { value: "kanban", icon: "📋", he: "Kanban — זרימה", en: "Kanban", desc: { he: "זרימה רציפה, WIP limit", en: "Continuous flow, WIP limits" } },
] as const;

interface AddTaskFormData {
  title: string;
  taskType: string;
  taskTypeOther: string;
  parentType: "project" | "program";
  parentId: string;
  methodology: string; // waterfall | agile | kanban
  description: string;
  teamMembers: string[];
  plannedStart: string;
  plannedEnd: string;
  source: string;
  sourceOther: string;
  priority: string;
  attachments: File[];
}

export function AddTaskDialog({
  projects,
  users,
  locale,
  children,
}: {
  projects: MockWbsNode[];
  users: MockUser[];
  locale: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const programs = projects.filter((p) => p.level === "program");
  const projectsOnly = projects.filter((p) => p.level === "project");
  const taskTypes = mockItemTypes.filter((t) => t.scope === "task");

  const [form, setForm] = useState<AddTaskFormData>({
    title: "",
    taskType: taskTypes[0]?.id || "",
    taskTypeOther: "",
    parentType: "project",
    parentId: projectsOnly[0]?.id || "",
    methodology: "waterfall",
    description: "",
    teamMembers: [],
    plannedStart: new Date().toISOString().slice(0, 10),
    plannedEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    source: "manager_decision",
    sourceOther: "",
    priority: "medium",
    attachments: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddTaskFormData, string>>>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = txt(locale, { he: "חובה למלא כותרת", en: "Title is required" });
    if (!form.parentId) errs.parentId = txt(locale, { he: "חובה לבחור שיוך", en: "Must select assignment" });
    if (!form.plannedStart) errs.plannedStart = txt(locale, { he: "חובה", en: "Required" });
    if (!form.plannedEnd) errs.plannedEnd = txt(locale, { he: "חובה", en: "Required" });
    if (form.plannedEnd && form.plannedStart && form.plannedEnd < form.plannedStart) {
      errs.plannedEnd = txt(locale, { he: "תאריך סיום לפני ההתחלה", en: "End before start" });
    }
    if (form.description.length > 300) {
      errs.description = txt(locale, { he: `עד 300 תווים (${form.description.length})`, en: `Max 300 chars (${form.description.length})` });
    }
    if (form.source === "other" && !form.sourceOther.trim()) {
      errs.sourceOther = txt(locale, { he: "חובה למלא מקור", en: "Source required" });
    }
    if (form.source === "other" && form.sourceOther.length > 100) {
      errs.sourceOther = txt(locale, { he: `עד 100 תווים (${form.sourceOther.length})`, en: `Max 100 chars` });
    }
    if (form.taskType === "tt-other" && !form.taskTypeOther.trim()) {
      errs.taskTypeOther = txt(locale, { he: "חובה לציין סוג משימה", en: "Task type required" });
    }
    if (form.taskType === "tt-other" && form.taskTypeOther.length > 100) {
      errs.taskTypeOther = txt(locale, { he: `עד 100 תווים`, en: `Max 100 chars` });
    }
    // Attachments - max 5MB each
    for (const file of form.attachments) {
      if (file.size > 5 * 1024 * 1024) {
        errs.attachments = txt(locale, { he: `הקובץ ${file.name} חורג מ-5MB`, en: `File ${file.name} exceeds 5MB` });
        break;
      }
    }
    if (form.teamMembers.length === 0) {
      errs.teamMembers = txt(locale, { he: "חובה לבחור לפחות חבר צוות אחד", en: "Select at least one member" });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const toggleTeamMember = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(userId)
        ? prev.teamMembers.filter((id) => id !== userId)
        : [...prev.teamMembers, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // In demo mode - show success toast
    const taskType = taskTypes.find((t) => t.id === form.taskType);
    toast.success(
      txt(locale, { he: `המשימה "${form.title}" נוצרה בהצלחה!`, en: `Task "${form.title}" created!` }),
      {
        description: txt(locale, {
          he: `סוג: ${taskType?.nameHe || ""} · צוות: ${form.teamMembers.length} חברים · מקור: ${TASK_SOURCES.find((s) => s.value === form.source)?.labelHe || form.sourceOther}`,
          en: `Type: ${taskType?.nameEn || ""} · Team: ${form.teamMembers.length} members`,
        }),
      }
    );
    setOpen(false);
    // Reset form
    setForm({
      ...form,
      title: "",
      description: "",
      teamMembers: [],
      sourceOther: "",
    });
    setErrors({});
  };

  const parentOptions =
    form.parentType === "project" ? projectsOnly : programs;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{txt(locale, { he: "הוספת משימה חדשה", en: "Add New Task" })}</DialogTitle>
          <DialogDescription>
            {txt(locale, { he: "מלא את הפרטים הנדרשים ליצירת המשימה.", en: "Fill in the required details." })}
            {" "}
            <span className="text-red-500">*</span> = {txt(locale, { he: "חובה", en: "required" })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">
              {txt(locale, { he: "כותרת המשימה", en: "Task Title", ru: "Название задачи", fr: "Titre de la tâche", es: "Título de la tarea" })} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={txt(locale, { he: "מה צריך לעשות?", en: "What needs to be done?" })}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Task Type */}
          <div className="space-y-1.5">
            <Label htmlFor="task-type">{txt(locale, { he: "סוג משימה", en: "Task Type" })}</Label>
            <div className="flex flex-wrap gap-1.5">
              {taskTypes.map((tt) => (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => setForm({ ...form, taskType: tt.id, taskTypeOther: "" })}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]",
                    form.taskType === tt.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  {tt.icon} {txt(locale, { he: tt.nameHe, en: tt.nameEn })}
                </button>
              ))}
            </div>
            {/* "Other" free text - 100 chars */}
            {form.taskType === "tt-other" && (
              <div className="mt-2">
                <Input
                  value={form.taskTypeOther}
                  onChange={(e) => setForm({ ...form, taskTypeOther: e.target.value.slice(0, 100) })}
                  placeholder={txt(locale, { he: "הזן סוג משימה...", en: "Enter task type..." })}
                  maxLength={100}
                  className={cn("min-h-[44px]", errors.taskTypeOther ? "border-red-500" : "")}
                />
                <div className="text-[10px] text-muted-foreground text-end mt-0.5">{form.taskTypeOther.length}/100</div>
                {errors.taskTypeOther && <p className="text-xs text-red-500">{errors.taskTypeOther}</p>}
              </div>
            )}
          </div>

          {/* Assignment: Project or Program */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "שיוך", en: "Assignment" })} <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, parentType: "project", parentId: projectsOnly[0]?.id || "" })}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-sm font-medium border min-h-[44px]",
                  form.parentType === "project"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                {txt(locale, { he: "פרויקט", en: "Project" })}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, parentType: "program", parentId: programs[0]?.id || "" })}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-sm font-medium border min-h-[44px]",
                  form.parentType === "program"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                {txt(locale, { he: "פרוגרמה", en: "Program" })}
              </button>
            </div>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]",
                errors.parentId ? "border-red-500" : ""
              )}
            >
              <option value="">{txt(locale, { he: "-- בחר --", en: "-- Select --" })}</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {txt(locale, { he: p.name, en: p.nameEn || p.name })}
                </option>
              ))}
            </select>
            {errors.parentId && <p className="text-xs text-red-500">{errors.parentId}</p>}
          </div>

          {/* Project Methodology selector */}
          {form.parentType === "project" && (
            <div className="space-y-1.5">
              <Label>{txt(locale, { he: "שיטת ניהול", en: "Methodology" })}</Label>
              <div className="grid grid-cols-3 gap-2">
                {METHODOLOGY_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, methodology: m.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all min-h-[44px]",
                      form.methodology === m.value
                        ? "border-primary bg-primary/10 text-primary shadow-md ring-2 ring-primary/20"
                        : "border-border hover:bg-accent hover:border-primary/30"
                    )}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-xs font-semibold">{txt(locale, { he: m.he.split(" — ")[0], en: m.en })}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">{txt(locale, m.desc)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description (max 300) */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">
              {txt(locale, { he: "תיאור", en: "Description", ru: "Описание", fr: "Description", es: "Descripción" })}{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "עד 300 תווים", en: "max 300 chars" })})</span>
            </Label>
            <textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 300) })}
              placeholder={txt(locale, { he: "תיאור קצר של המשימה...", en: "Brief description..." })}
              rows={3}
              maxLength={300}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none",
                errors.description ? "border-red-500" : ""
              )}
              style={{ fontSize: "16px" }}
            />
            <div className="text-[10px] text-muted-foreground text-end">
              {form.description.length}/300
            </div>
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Team Members (multi-select) */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "צוות", en: "Team" })} <span className="text-red-500">*</span>{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "בחירה מרובה", en: "multi-select" })})</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {users
                .filter((u) => u.role !== "guest" && u.role !== "viewer")
                .map((user) => {
                  const selected = form.teamMembers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleTeamMember(user.id)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 min-h-[36px]",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-accent"
                      )}
                    >
                      {selected && "✓ "}
                      {user.name}
                    </button>
                  );
                })}
            </div>
            {form.teamMembers.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                {form.teamMembers.length} {txt(locale, { he: "נבחרו", en: "selected" })}
              </div>
            )}
            {errors.teamMembers && <p className="text-xs text-red-500">{errors.teamMembers}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">
                {txt(locale, { he: "תאריך התחלה", en: "Start Date" })} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-start"
                type="date"
                value={form.plannedStart}
                onChange={(e) => setForm({ ...form, plannedStart: e.target.value })}
                className={cn("min-h-[44px]", errors.plannedStart ? "border-red-500" : "")}
              />
              {errors.plannedStart && <p className="text-xs text-red-500">{errors.plannedStart}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-end">
                {txt(locale, { he: "תאריך סיום משוער", en: "Est. End Date" })} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-end"
                type="date"
                value={form.plannedEnd}
                onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })}
                className={cn("min-h-[44px]", errors.plannedEnd ? "border-red-500" : "")}
              />
              {errors.plannedEnd && <p className="text-xs text-red-500">{errors.plannedEnd}</p>}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>{txt(locale, { he: "עדיפות", en: "Priority", ru: "Приоритет", fr: "Priorité", es: "Prioridad" })}</Label>
            <div className="flex gap-1.5">
              {[
                { value: "low", he: "נמוכה", en: "Low", color: "bg-slate-100 text-slate-700 border-slate-300" },
                { value: "medium", he: "בינונית", en: "Medium", color: "bg-blue-100 text-blue-700 border-blue-300" },
                { value: "high", he: "גבוהה", en: "High", color: "bg-orange-100 text-orange-700 border-orange-300" },
                { value: "critical", he: "קריטית", en: "Critical", color: "bg-red-100 text-red-700 border-red-300" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border min-h-[36px] transition-all",
                    form.priority === p.value
                      ? `${p.color} ring-2 ring-offset-1 ring-current`
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  {txt(locale, { he: p.he, en: p.en })}
                </button>
              ))}
            </div>
          </div>

          {/* Task Source */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "מקור המשימה", en: "Task Source" })} <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TASK_SOURCES.map((src) => (
                <button
                  key={src.value}
                  type="button"
                  onClick={() => setForm({ ...form, source: src.value, sourceOther: "" })}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]",
                    form.source === src.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  {txt(locale, { he: src.labelHe, en: src.labelEn })}
                </button>
              ))}
            </div>
            {/* "Other" free text (max 100 chars) */}
            {form.source === "other" && (
              <div className="mt-2">
                <Input
                  value={form.sourceOther}
                  onChange={(e) => setForm({ ...form, sourceOther: e.target.value.slice(0, 100) })}
                  placeholder={txt(locale, { he: "הזן מקור משימה...", en: "Enter task source..." })}
                  maxLength={100}
                  className={cn("min-h-[44px]", errors.sourceOther ? "border-red-500" : "")}
                />
                <div className="text-[10px] text-muted-foreground text-end mt-0.5">
                  {form.sourceOther.length}/100
                </div>
                {errors.sourceOther && <p className="text-xs text-red-500">{errors.sourceOther}</p>}
              </div>
            )}
          </div>

          {/* File Attachments (max 5MB each) */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "צירוף מסמכים", en: "Attachments" })}{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "עד 5MB לקובץ", en: "max 5MB each" })})</span>
            </Label>
            <div className="border-2 border-dashed rounded-lg p-3 text-center">
              <input
                type="file"
                multiple
                id="file-upload"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
                  const rejected = files.length - valid.length;
                  if (rejected > 0) {
                    toast.error(txt(locale, { he: `${rejected} קבצים חרגו מ-5MB ולא נוספו`, en: `${rejected} files exceeded 5MB` }));
                  }
                  setForm({ ...form, attachments: [...form.attachments, ...valid] });
                  e.target.value = ""; // reset input
                }}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-primary hover:underline font-medium"
              >
                {txt(locale, { he: "📎 לחץ לצירוף קבצים", en: "📎 Click to attach files" })}
              </label>
              <div className="text-[10px] text-muted-foreground mt-1">
                {txt(locale, { he: "כל פורמט · עד 5MB לקובץ", en: "Any format · Max 5MB per file" })}
              </div>
            </div>
            {form.attachments.length > 0 && (
              <div className="space-y-1">
                {form.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-muted/40 px-2 py-1.5 rounded">
                    <span className="truncate flex-1">📄 {file.name} ({(file.size / 1024).toFixed(0)}KB)</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, i) => i !== idx) })}
                      className="text-red-500 hover:text-red-700 ms-2 shrink-0"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            {errors.attachments && <p className="text-xs text-red-500">{errors.attachments}</p>}
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {txt(locale, { he: "ביטול", en: "Cancel", ru: "Отмена", fr: "Annuler", es: "Cancelar" })}
            </Button>
            <Button type="submit" className="min-h-[44px]">
              {txt(locale, { he: "צור משימה", en: "Create Task" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
