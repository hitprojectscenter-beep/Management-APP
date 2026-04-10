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

// ============================================
// Task source options (per spec)
// ============================================
const TASK_SOURCES = [
  { value: "manager_decision", labelHe: "החלטת מנהל", labelEn: "Manager Decision" },
  { value: "following_meeting", labelHe: "בהמשך לפגישה", labelEn: "Following a Meeting" },
  { value: "meeting_prep", labelHe: "הכנה לפגישה", labelEn: "Meeting Preparation" },
  { value: "other", labelHe: "אחר", labelEn: "Other" },
] as const;

interface AddTaskFormData {
  title: string;
  taskType: string;
  parentType: "project" | "program";
  parentId: string;
  description: string;
  teamMembers: string[]; // array of user IDs
  plannedStart: string;
  plannedEnd: string;
  source: string;
  sourceOther: string; // free text when source === "other"
  priority: string;
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
  const isHe = locale === "he";
  const [open, setOpen] = useState(false);

  const programs = projects.filter((p) => p.level === "program");
  const projectsOnly = projects.filter((p) => p.level === "project");
  const taskTypes = mockItemTypes.filter((t) => t.scope === "task");

  const [form, setForm] = useState<AddTaskFormData>({
    title: "",
    taskType: taskTypes[0]?.id || "",
    parentType: "project",
    parentId: projectsOnly[0]?.id || "",
    description: "",
    teamMembers: [],
    plannedStart: new Date().toISOString().slice(0, 10),
    plannedEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    source: "manager_decision",
    sourceOther: "",
    priority: "medium",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddTaskFormData, string>>>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = isHe ? "חובה למלא כותרת" : "Title is required";
    if (!form.parentId) errs.parentId = isHe ? "חובה לבחור שיוך" : "Must select assignment";
    if (!form.plannedStart) errs.plannedStart = isHe ? "חובה" : "Required";
    if (!form.plannedEnd) errs.plannedEnd = isHe ? "חובה" : "Required";
    if (form.plannedEnd && form.plannedStart && form.plannedEnd < form.plannedStart) {
      errs.plannedEnd = isHe ? "תאריך סיום לפני ההתחלה" : "End before start";
    }
    if (form.description.length > 300) {
      errs.description = isHe ? `עד 300 תווים (${form.description.length})` : `Max 300 chars (${form.description.length})`;
    }
    if (form.source === "other" && !form.sourceOther.trim()) {
      errs.sourceOther = isHe ? "חובה למלא מקור" : "Source required";
    }
    if (form.source === "other" && form.sourceOther.length > 100) {
      errs.sourceOther = isHe ? `עד 100 תווים (${form.sourceOther.length})` : `Max 100 chars`;
    }
    if (form.teamMembers.length === 0) {
      errs.teamMembers = isHe ? "חובה לבחור לפחות חבר צוות אחד" : "Select at least one member";
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
      isHe ? `המשימה "${form.title}" נוצרה בהצלחה!` : `Task "${form.title}" created!`,
      {
        description: isHe
          ? `סוג: ${taskType?.nameHe || ""} · צוות: ${form.teamMembers.length} חברים · מקור: ${TASK_SOURCES.find((s) => s.value === form.source)?.labelHe || form.sourceOther}`
          : `Type: ${taskType?.nameEn || ""} · Team: ${form.teamMembers.length} members`,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isHe ? "הוספת משימה חדשה" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {isHe ? "מלא את הפרטים הנדרשים ליצירת המשימה." : "Fill in the required details."}
            {" "}
            <span className="text-red-500">*</span> = {isHe ? "חובה" : "required"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">
              {isHe ? "כותרת המשימה" : "Task Title"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isHe ? "מה צריך לעשות?" : "What needs to be done?"}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Task Type */}
          <div className="space-y-1.5">
            <Label htmlFor="task-type">{isHe ? "סוג משימה" : "Task Type"}</Label>
            <div className="flex flex-wrap gap-1.5">
              {taskTypes.map((tt) => (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => setForm({ ...form, taskType: tt.id })}
                  className={cn(
                    "px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]",
                    form.taskType === tt.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  {tt.icon} {isHe ? tt.nameHe : tt.nameEn}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment: Project or Program */}
          <div className="space-y-1.5">
            <Label>
              {isHe ? "שיוך" : "Assignment"} <span className="text-red-500">*</span>
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
                {isHe ? "פרויקט" : "Project"}
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
                {isHe ? "פרוגרמה" : "Program"}
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
              <option value="">{isHe ? "-- בחר --" : "-- Select --"}</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {isHe ? p.name : p.nameEn || p.name}
                </option>
              ))}
            </select>
            {errors.parentId && <p className="text-xs text-red-500">{errors.parentId}</p>}
          </div>

          {/* Description (max 300) */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">
              {isHe ? "תיאור" : "Description"}{" "}
              <span className="text-muted-foreground text-[10px]">({isHe ? "עד 300 תווים" : "max 300 chars"})</span>
            </Label>
            <textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 300) })}
              placeholder={isHe ? "תיאור קצר של המשימה..." : "Brief description..."}
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
              {isHe ? "צוות" : "Team"} <span className="text-red-500">*</span>{" "}
              <span className="text-muted-foreground text-[10px]">({isHe ? "בחירה מרובה" : "multi-select"})</span>
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
                {form.teamMembers.length} {isHe ? "נבחרו" : "selected"}
              </div>
            )}
            {errors.teamMembers && <p className="text-xs text-red-500">{errors.teamMembers}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">
                {isHe ? "תאריך התחלה" : "Start Date"} <span className="text-red-500">*</span>
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
                {isHe ? "תאריך סיום משוער" : "Est. End Date"} <span className="text-red-500">*</span>
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
            <Label>{isHe ? "עדיפות" : "Priority"}</Label>
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
                  {isHe ? p.he : p.en}
                </button>
              ))}
            </div>
          </div>

          {/* Task Source */}
          <div className="space-y-1.5">
            <Label>
              {isHe ? "מקור המשימה" : "Task Source"} <span className="text-red-500">*</span>
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
                  {isHe ? src.labelHe : src.labelEn}
                </button>
              ))}
            </div>
            {/* "Other" free text (max 100 chars) */}
            {form.source === "other" && (
              <div className="mt-2">
                <Input
                  value={form.sourceOther}
                  onChange={(e) => setForm({ ...form, sourceOther: e.target.value.slice(0, 100) })}
                  placeholder={isHe ? "הזן מקור משימה..." : "Enter task source..."}
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

          {/* Footer */}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {isHe ? "ביטול" : "Cancel"}
            </Button>
            <Button type="submit" className="min-h-[44px]">
              {isHe ? "צור משימה" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
