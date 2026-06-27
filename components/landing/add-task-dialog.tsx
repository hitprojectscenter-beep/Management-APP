"use client";
import React, { useState, useEffect, useMemo } from "react";
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
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, AlertTriangle, CalendarClock } from "lucide-react";
import type { MockUser, MockWbsNode, MockTaskAttachment, MockTask } from "@/lib/db/mock-data";
import { mockItemTypes, mockWbsNodes } from "@/lib/db/mock-data";
import { persistAddedTask } from "@/lib/db/local-tasks";
import { computeTeamWorkload } from "@/lib/ai/workload";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

/** One week, in ms — the default gap between start and end when the
 *  source doesn't give an explicit due date. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Add `days` to a YYYY-MM-DD string, timezone-safe (pure UTC math — no
 *  local-offset drift that would otherwise drop a day via toISOString). */
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Ensure end is strictly after start: a task can't start and end the same
 *  day. If end is missing or <= start, push it a week past start. */
function ensureEndAfterStart(start: string, end: string): string {
  if (!start) return end;
  if (end && end > start) return end;
  return addDaysISO(start, 7);
}

// Required-resources / effort categories — multi-select on the form.
const RESOURCE_OPTIONS = [
  { value: "manpower", he: "כוח אדם", en: "Manpower" },
  { value: "budget", he: "תקציב", en: "Budget" },
  { value: "equipment", he: "ציוד / חומרה", en: "Equipment / Hardware" },
  { value: "software_license", he: "רישוי תוכנה", en: "Software license" },
  { value: "external_consulting", he: "ייעוץ חיצוני", en: "External consulting" },
  { value: "cloud_compute", he: "מחשוב / ענן", en: "Cloud / Compute" },
  { value: "data_gis", he: "נתונים / GIS", en: "Data / GIS" },
  { value: "expert_time", he: "זמן מומחה", en: "Expert time" },
  { value: "training", he: "הדרכה", en: "Training" },
  { value: "vendor", he: "ספק חיצוני", en: "External vendor" },
] as const;

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
  /** Required resources / effort categories (multi-select). */
  resources: string[];
  plannedStart: string;
  plannedEnd: string;
  source: string;
  sourceOther: string;
  priority: string;
  attachments: File[];
}

/**
 * Optional pre-fill payload — used by the intake center to open this dialog
 * with the data the AI extracted from a meeting/document/audio source.
 * Every field is optional; the dialog still works with no pre-fill.
 */
export interface AddTaskInitialValues {
  title?: string;
  description?: string;
  /** Work-type label like "מצגת" / "מסמך אפיון" — mapped to taskType id by emoji/keyword */
  workTypeLabel?: string;
  /** Free-text assignee hint from the source — resolved to a user id by fuzzy match */
  assigneeHint?: string;
  /** Specific user id — wins over assigneeHint */
  assigneeUserId?: string;
  plannedStart?: string;
  plannedEnd?: string;
  estimateHours?: number;
  /** Source label rendered into the "source" / "מקור" field — typically
   *  "<document title> · <document date>" so every extracted task carries
   *  its provenance. */
  sourceLabel?: string;
  /** Original uploaded file — pre-attached to the task's attachments list
   *  so the source can always be downloaded for context. */
  sourceFile?: File;
  /** When the dialog is opened from the intake center, default a few more
   *  required fields so the user can submit with one click after a tiny
   *  review — instead of having to manually fill priority, parent, etc.
   *  for every single extracted task. Manual New-Task flow leaves these
   *  empty so the user picks consciously. */
  defaultPriority?: "low" | "medium" | "high" | "critical";
  defaultParentType?: "project" | "program";
  defaultParentId?: string;
  defaultMethodology?: string;
}

export function AddTaskDialog({
  projects,
  users,
  locale,
  children,
  initialValues,
  /** Controlled-open mode (intake table opens externally) — optional. */
  open: openProp,
  onOpenChange,
  /** Fired right after the task is pushed to mockTasks. Used by the
   *  intake table to remove the source row once the user has converted it
   *  into a real task. */
  onCreated,
}: {
  projects: MockWbsNode[];
  users: MockUser[];
  locale: string;
  children?: React.ReactNode;
  initialValues?: AddTaskInitialValues;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const programs = projects.filter((p) => p.level === "program");
  const projectsOnly = projects.filter((p) => p.level === "project");
  const taskTypes = mockItemTypes.filter((t) => t.scope === "task");

  // Try to map a workTypeLabel ("מצגת" / "מסמך אפיון") to one of the catalog
  // taskType ids so the chip picker shows the right selection on open.
  const resolveTaskTypeId = (label?: string): string => {
    if (!label) return "";
    const l = label.toLowerCase();
    const match = taskTypes.find(
      (t) => t.nameHe.toLowerCase().includes(l) || l.includes(t.nameHe.toLowerCase()) || (t.nameEn && l.includes(t.nameEn.toLowerCase()))
    );
    return match?.id || "";
  };

  // Fuzzy-resolve an assignee hint to a user id
  const resolveAssigneeId = (hint?: string): string => {
    if (!hint) return "";
    const h = hint.toLowerCase().trim();
    const exact = users.find((u) => u.name.toLowerCase() === h);
    if (exact) return exact.id;
    const partial = users.find(
      (u) => u.name.toLowerCase().includes(h) || h.includes(u.name.toLowerCase().split(" ")[0])
    );
    return partial?.id || "";
  };

  const initialAssigneeId =
    initialValues?.assigneeUserId || resolveAssigneeId(initialValues?.assigneeHint);

  // Per user spec: every selectable field starts empty so the user must
  // pick consciously instead of submitting whatever the form happened to
  // pre-fill. EXCEPT when initialValues are passed in from the intake
  // center — then the pre-fill comes from real source data, not a default.
  // For intake-initiated edits, fall back to the first task type in the
  // catalog when the work-type label couldn't be matched. Without this the
  // user would have to manually pick a task type for every single extracted
  // task even when the source didn't say anything specific.
  const resolvedTaskTypeId = (() => {
    const fromLabel = resolveTaskTypeId(initialValues?.workTypeLabel);
    if (fromLabel) return fromLabel;
    // Only auto-default when this open came from intake (i.e. caller asked
    // for intake-mode defaults). Manual New-Task flow stays blank.
    if (initialValues?.defaultPriority || initialValues?.defaultParentId) {
      return taskTypes[0]?.id || "";
    }
    return "";
  })();

  const [form, setForm] = useState<AddTaskFormData>({
    title: initialValues?.title || "",
    taskType: resolvedTaskTypeId,
    taskTypeOther: "",
    parentType: initialValues?.defaultParentType || "project",
    parentId: initialValues?.defaultParentId || "",
    methodology: (initialValues?.defaultMethodology || "") as any,
    description: initialValues?.description || "",
    teamMembers: initialAssigneeId ? [initialAssigneeId] : [],
    resources: [],
    plannedStart: initialValues?.plannedStart || "",
    // Never let end == start: if the source gave the same (or no) end,
    // default to a one-week window.
    plannedEnd: ensureEndAfterStart(initialValues?.plannedStart || "", initialValues?.plannedEnd || ""),
    // When a source-extracted task is opened, source="other" and the source
    // label (e.g. "סיכום פגישה Salesforce · 2026-06-27") is the free-text.
    // For a manual New Task it stays empty so the user has to choose.
    source: initialValues?.sourceLabel ? ("other" as any) : ("" as any),
    sourceOther: initialValues?.sourceLabel || "",
    priority: (initialValues?.defaultPriority || "") as any,
    // Pre-attach the original source file (if any) so the task always
    // carries provenance back to the document/audio it came from.
    attachments: initialValues?.sourceFile ? [initialValues.sourceFile] : [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddTaskFormData, string>>>({});

  // Re-apply initialValues whenever the dialog re-opens with new pre-fill data,
  // so the intake center can open the dialog for several different extracted
  // tasks in a row without showing stale data from the previous one.
  useEffect(() => {
    if (!open || !initialValues) return;
    setForm((prev) => ({
      ...prev,
      title: initialValues.title ?? prev.title,
      taskType:
        resolveTaskTypeId(initialValues.workTypeLabel) ||
        // When opened from intake, default to the first catalog type if the
        // work-type label didn't match anything — keeps "click → submit" working.
        ((initialValues.defaultPriority || initialValues.defaultParentId) ? taskTypes[0]?.id : "") ||
        prev.taskType,
      description: initialValues.description ?? prev.description,
      teamMembers: initialAssigneeId ? [initialAssigneeId] : prev.teamMembers,
      plannedStart: initialValues.plannedStart ?? prev.plannedStart,
      // Guarantee a real window — never start == end.
      plannedEnd: ensureEndAfterStart(
        initialValues.plannedStart ?? prev.plannedStart,
        initialValues.plannedEnd ?? prev.plannedEnd,
      ),
      source: initialValues.sourceLabel ? ("other" as any) : prev.source,
      sourceOther: initialValues.sourceLabel ?? prev.sourceOther,
      attachments: initialValues.sourceFile ? [initialValues.sourceFile] : prev.attachments,
      // Intake-only defaults — populated only when the caller asked for them,
      // so the manual New-Task flow keeps its blank-required-fields behavior.
      priority: initialValues.defaultPriority ? (initialValues.defaultPriority as any) : prev.priority,
      parentType: initialValues.defaultParentType ?? prev.parentType,
      parentId: initialValues.defaultParentId ?? prev.parentId,
      methodology: initialValues.defaultMethodology ? (initialValues.defaultMethodology as any) : prev.methodology,
    }));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  const validate = (): typeof errors => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = txt(locale, { he: "חובה למלא כותרת", en: "Title is required" });
    if (!form.taskType) errs.taskType = txt(locale, { he: "חובה לבחור סוג משימה", en: "Task type required" });
    // NOTE: parentId (שיוך לפרויקט/פרוגרמה) is intentionally OPTIONAL — a task
    // doesn't have to belong to a project. (User feedback: "משימה לא חייבת
    // להיות משוייכת לפרויקט/פרוגרמה כלשהי".)
    if (!form.plannedStart) errs.plannedStart = txt(locale, { he: "חובה", en: "Required" });
    if (!form.plannedEnd) errs.plannedEnd = txt(locale, { he: "חובה", en: "Required" });
    if (!form.priority) errs.priority = txt(locale, { he: "חובה לבחור עדיפות", en: "Priority required" });
    if (!form.source) errs.source = txt(locale, { he: "חובה לבחור מקור", en: "Source required" });
    if (form.plannedEnd && form.plannedStart && form.plannedEnd <= form.plannedStart) {
      errs.plannedEnd = txt(locale, { he: "תאריך הסיום חייב להיות אחרי ההתחלה", en: "End must be after start" });
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
    return errs;
  };

  /** Friendly label per field — used to tell the user EXACTLY which
   *  required fields are missing, instead of a generic "complete all
   *  required fields" message that leaves them hunting. */
  const FIELD_LABELS: Partial<Record<keyof AddTaskFormData, string>> = {
    title: txt(locale, { he: "כותרת", en: "Title" }) as string,
    taskType: txt(locale, { he: "סוג משימה", en: "Task type" }) as string,
    taskTypeOther: txt(locale, { he: "סוג משימה (אחר)", en: "Task type (other)" }) as string,
    plannedStart: txt(locale, { he: "תאריך התחלה", en: "Start date" }) as string,
    plannedEnd: txt(locale, { he: "תאריך סיום", en: "End date" }) as string,
    priority: txt(locale, { he: "עדיפות", en: "Priority" }) as string,
    source: txt(locale, { he: "מקור", en: "Source" }) as string,
    sourceOther: txt(locale, { he: "מקור (אחר)", en: "Source (other)" }) as string,
    teamMembers: txt(locale, { he: "צוות", en: "Team" }) as string,
    description: txt(locale, { he: "תיאור", en: "Description" }) as string,
    attachments: txt(locale, { he: "קבצים מצורפים", en: "Attachments" }) as string,
  };

  const toggleTeamMember = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(userId)
        ? prev.teamMembers.filter((id) => id !== userId)
        : [...prev.teamMembers, userId],
    }));
  };

  /**
   * Notify the assigned team members that they were put on a task.
   * Sends server-side via Gmail/Resend when configured; otherwise the
   * toast offers one-click "open mail client" / WhatsApp fallbacks so
   * the operator can send the heads-up from their own account. (Bug
   * fix: previously NO notification was sent on assignment at all.)
   */
  const notifyAssignees = async (task: MockTask) => {
    const assignees = task && form.teamMembers.length > 0
      ? form.teamMembers
          .map((id) => users.find((u) => u.id === id))
          .filter((u): u is MockUser => !!u)
          .map((u) => ({ name: u.name, email: u.email, phone: u.phone }))
      : [];
    if (assignees.length === 0) return;

    let data: any = null;
    try {
      const res = await fetch("/api/tasks/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          plannedStart: task.plannedStart,
          plannedEnd: task.plannedEnd,
          assignees,
          locale,
        }),
      });
      data = await res.json().catch(() => null);
    } catch {
      data = null;
    }

    const sentCount = data?.results?.filter((r: any) => r.emailDeliveryStatus === "sent").length ?? 0;
    if (sentCount > 0) {
      toast.success(
        txt(locale, {
          he: `📧 נשלחה הודעה ל-${sentCount} חברי צוות`,
          en: `📧 Notified ${sentCount} team member(s)`,
        }),
      );
      return;
    }

    // No transport configured (or send failed) — offer manual channels.
    const mailto: string | undefined = data?.mailtoAll;
    const whatsapp: string | undefined = data?.whatsappFirst;
    toast(
      txt(locale, {
        he: `הודעה לצוות (${assignees.length})`,
        en: `Notify the team (${assignees.length})`,
      }),
      {
        description: txt(locale, {
          he: "שליחה אוטומטית לא מוגדרת. בחר ערוץ לשליחת ההודעה:",
          en: "Auto-send isn't configured. Pick a channel to send the heads-up:",
        }),
        duration: 30_000,
        action: mailto
          ? {
              label: txt(locale, { he: "📧 מייל לכולם", en: "📧 Email all" }),
              onClick: () => { window.location.href = mailto; },
            }
          : undefined,
      },
    );
    if (whatsapp) {
      toast(
        txt(locale, { he: "או דרך WhatsApp", en: "Or via WhatsApp" }),
        {
          duration: 30_000,
          action: {
            label: txt(locale, { he: "💬 WhatsApp", en: "💬 WhatsApp" }),
            onClick: () => { window.open(whatsapp, "_blank"); },
          },
        },
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      // Tell the user EXACTLY which fields are missing — the old generic
      // "complete all required fields" left users (who believed they had
      // filled everything) hunting for a field they couldn't see. Now we
      // name the offending fields and scroll the first one into view.
      const missingLabels = (Object.keys(errs) as (keyof AddTaskFormData)[])
        .map((k) => FIELD_LABELS[k] || k)
        .filter((v, i, a) => a.indexOf(v) === i); // dedupe
      toast.error(
        txt(locale, {
          he: "חסרים פרטים: " + missingLabels.join(", "),
          en: "Missing: " + missingLabels.join(", "),
          ru: "Не заполнено: " + missingLabels.join(", "),
          fr: "Manquant : " + missingLabels.join(", "),
          es: "Falta: " + missingLabels.join(", "),
        })
      );
      requestAnimationFrame(() => {
        // Existing error styling uses .border-red-500 on the failing input;
        // fall back to aria-invalid / data-error if a future field opts in.
        const firstErrorEl = document.querySelector(
          '[role="dialog"] [aria-invalid="true"], [role="dialog"] [data-error="true"], [role="dialog"] .border-red-500'
        ) as HTMLElement | null;
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
          firstErrorEl.focus?.();
        }
      });
      return;
    }

    // Persist to mockTasks so the task actually shows up on /tasks etc.
    // (Previously this was toast-only; the user could see "task created"
    // but nothing was saved — and the source file attached via the intake
    // center was being silently dropped.)
    const taskType = taskTypes.find((t) => t.id === form.taskType);
    const attachments: MockTaskAttachment[] = form.attachments.map((file) => {
      let blobUrl: string | undefined;
      try {
        blobUrl = URL.createObjectURL(file);
      } catch {
        // SSR / sandboxed iframe — skip
      }
      return {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        blobUrl,
        source: form.source === "other" ? form.sourceOther || undefined : undefined,
      };
    });
    const wbsLeaf = mockWbsNodes.find((n) => n.level === "task")?.id
      ?? mockWbsNodes[0]?.id
      ?? "root";
    const newTask: MockTask = {
      id: `task-${Date.now()}`,
      wbsNodeId: wbsLeaf,
      parentTaskId: null,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: "not_started",
      priority: (form.priority as any) || "medium",
      assigneeId: form.teamMembers[0] || null,
      // Persist the FULL team (was dropped before) — every member is a
      // participant in the task's chat + receipts and sees the task.
      team: form.teamMembers.length > 0 ? form.teamMembers : undefined,
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      actualStart: null,
      actualEnd: null,
      estimateHours: 4,
      actualHours: 0,
      progressPercent: 0,
      tags: taskType?.nameHe ? [taskType.nameHe] : [],
      dependencies: [],
      resources: form.resources.length > 0 ? form.resources : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    // persistAddedTask pushes to the in-memory module AND localStorage AND
    // fires "pmo:tasks-changed" so the task list updates live and survives
    // reloads / server snapshots. (Bug fix: plain mockTasks.push didn't
    // reach the server-rendered /tasks page.)
    persistAddedTask(newTask);
    onCreated?.();

    toast.success(
      txt(locale, { he: `המשימה "${form.title}" נוצרה בהצלחה!`, en: `Task "${form.title}" created!` }),
      {
        description: attachments.length > 0
          ? (txt(locale, {
              he: `סוג: ${taskType?.nameHe || ""} · ${attachments.length} קבצים מצורפים: ${attachments.map((a) => a.name).join(", ")}`,
              en: `Type: ${taskType?.nameEn || ""} · ${attachments.length} files attached: ${attachments.map((a) => a.name).join(", ")}`,
            }) as string)
          : (txt(locale, {
              he: `סוג: ${taskType?.nameHe || ""} · צוות: ${form.teamMembers.length} חברים`,
              en: `Type: ${taskType?.nameEn || ""} · Team: ${form.teamMembers.length} members`,
            }) as string),
      }
    );

    // Notify the assigned team members (email + WhatsApp fallback).
    void notifyAssignees(newTask);

    setOpen(false);
    // Reset form
    setForm({
      ...form,
      title: "",
      description: "",
      teamMembers: [],
      resources: [],
      sourceOther: "",
      attachments: [],
    });
    setErrors({});
  };

  const parentOptions =
    form.parentType === "project" ? projectsOnly : programs;

  /** Live workload check for the selected team members across the task
   *  window. Warns (never blocks) when any member is over-allocated or
   *  has overlapping tasks in the same dates — exactly what the operator
   *  asked for when assigning people. Recomputed only when the inputs
   *  change. */
  const workload = useMemo(() => {
    if (form.teamMembers.length === 0 || !form.plannedStart || !form.plannedEnd) return [];
    return computeTeamWorkload(form.teamMembers, form.plannedStart, form.plannedEnd);
  }, [form.teamMembers, form.plannedStart, form.plannedEnd]);
  const overloadedMembers = workload.filter((w) => w.overloaded);
  const membersWithOverlaps = workload.filter((w) => w.overlapping.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
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

          {/* Description — placed right under the title: per the requested
              logical order it is the second-most important field a reader scans
              (what the task IS), before classification/assignment. */}
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

          {/* Dates — "when" (scheduling group) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">
                {txt(locale, { he: "תאריך התחלה", en: "Start Date" })} <span className="text-red-500">*</span>
              </Label>
              <DateField
                id="task-start"
                value={form.plannedStart}
                error={!!errors.plannedStart}
                onChange={(iso) =>
                  setForm((prev) => ({
                    ...prev,
                    plannedStart: iso,
                    // Keep a valid window: push the end a week out if it would
                    // now fall on/before the new start.
                    plannedEnd: ensureEndAfterStart(iso, prev.plannedEnd),
                  }))
                }
              />
              {errors.plannedStart && <p className="text-xs text-red-500">{errors.plannedStart}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-end">
                {txt(locale, { he: "תאריך סיום משוער", en: "Est. End Date" })} <span className="text-red-500">*</span>
              </Label>
              <DateField
                id="task-end"
                value={form.plannedEnd}
                error={!!errors.plannedEnd}
                onChange={(iso) => setForm({ ...form, plannedEnd: iso })}
              />
              {errors.plannedEnd && <p className="text-xs text-red-500">{errors.plannedEnd}</p>}
            </div>
          </div>

          {/* Priority — grouped with scheduling */}
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

          {/* Required resources / effort — multi-select dropdown */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "משאבים / מאמץ נדרש", en: "Required Resources / Effort" })}{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "בחירה מרובה · רשות", en: "multi-select · optional" })})</span>
            </Label>
            <OptionMultiSelect
              options={RESOURCE_OPTIONS.map((o) => ({ value: o.value, label: txt(locale, { he: o.he, en: o.en }) as string }))}
              selected={form.resources}
              onToggle={(v) =>
                setForm((prev) => ({
                  ...prev,
                  resources: prev.resources.includes(v)
                    ? prev.resources.filter((x) => x !== v)
                    : [...prev.resources, v],
                }))
              }
              placeholder={txt(locale, { he: "בחר משאבים נדרשים", en: "Select required resources" }) as string}
            />
          </div>

          {/* Team Members — "who" does it: placed after resources, with the
              built-in workload / calendar-availability check (multi-select). */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "צוות", en: "Team" })} <span className="text-red-500">*</span>{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "בחירה מרובה", en: "multi-select" })})</span>
            </Label>
            <TeamMultiSelect
              users={users.filter((u) => u.role !== "guest" && u.role !== "viewer")}
              selected={form.teamMembers}
              onToggle={toggleTeamMember}
              locale={locale}
              error={!!errors.teamMembers}
            />
            {errors.teamMembers && <p className="text-xs text-red-500">{errors.teamMembers}</p>}

            {/* Workload / availability check — warns (never blocks) when an
                assigned member is over-allocated or already has overlapping
                tasks in the chosen window. */}
            {overloadedMembers.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-300 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800 text-xs">
                <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-red-800 dark:text-red-200">
                  <div className="font-semibold">
                    {txt(locale, { he: "⚠️ עומס מעל 100%", en: "⚠️ Over 100% allocation" })}
                  </div>
                  {overloadedMembers.map((w) => (
                    <div key={w.userId}>
                      {txt(locale, {
                        he: `${w.name} מוקצה כבר ל-${w.ftePercent}% משרה`,
                        en: `${w.name} is already allocated ${w.ftePercent}%`,
                      })}
                    </div>
                  ))}
                  <div className="opacity-80 mt-0.5">
                    {txt(locale, { he: "ניתן להמשיך, אך שקול לשייך מחדש או להאריך לו\"ז.", en: "You can proceed, but consider reassigning or extending the schedule." })}
                  </div>
                </div>
              </div>
            )}
            {membersWithOverlaps.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-md border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 text-xs">
                <CalendarClock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-amber-900 dark:text-amber-100">
                  <div className="font-semibold">
                    {txt(locale, { he: "התנגשות ביומן בתקופה זו", en: "Calendar overlap in this window" })}
                  </div>
                  {membersWithOverlaps.map((w) => (
                    <div key={w.userId}>
                      {txt(locale, {
                        he: `${w.name}: ${w.overlapping.length} משימות חופפות`,
                        en: `${w.name}: ${w.overlapping.length} overlapping task(s)`,
                      })}
                      <span className="opacity-70"> — {w.overlapping.slice(0, 2).map((t) => t.title).join(" · ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignment: Project or Program */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "שיוך", en: "Assignment" })}{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "רשות", en: "optional" })})</span>
            </Label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, parentType: "project", parentId: "" })}
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
                onClick={() => setForm({ ...form, parentType: "program", parentId: "" })}
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

/**
 * Collapsible multi-select dropdown for picking team members. The previous
 * row-of-chips layout grew unwieldy as more users were added; the user asked
 * to "put all team members in a dropdown and allow multi-select".
 *
 * Closed state: shows the current selection as comma-separated names plus a
 * count badge.  Open state: scrollable list with a checkbox per user.
 * Click outside or press Escape closes it.
 */
function TeamMultiSelect({
  users,
  selected,
  onToggle,
  locale,
  error,
}: {
  users: MockUser[];
  selected: string[];
  onToggle: (userId: string) => void;
  locale: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside the picker
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedNames = users.filter((u) => selected.includes(u.id)).map((u) => u.name);
  const summary = selectedNames.length === 0
    ? (txt(locale, { he: "בחר חברי צוות", en: "Select team members" }) as string)
    : selectedNames.join(", ");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm min-h-[44px] text-start",
          error ? "border-red-500" : "border-input",
          selectedNames.length === 0 && "text-muted-foreground"
        )}
      >
        <span className="line-clamp-1 flex-1 min-w-0">{summary}</span>
        <span className="flex items-center gap-1 shrink-0">
          {selectedNames.length > 0 && (
            <span className="text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
              {selectedNames.length}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform", open && "rotate-180")}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {users.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              {txt(locale, { he: "אין משתמשים זמינים", en: "No users available" })}
            </div>
          ) : (
            users.map((user) => {
              const isSel = selected.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onToggle(user.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-accent min-h-[40px]",
                    isSel && "bg-primary/5"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    readOnly
                    className="size-4 shrink-0 pointer-events-none"
                  />
                  <span className="flex-1 min-w-0 line-clamp-1">{user.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Generic multi-select dropdown over {value,label} options. Same UX as
 * TeamMultiSelect (closed pill summary + checkbox list) but decoupled from
 * users — used for the required-resources picker.
 */
function OptionMultiSelect({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const summary = selectedLabels.length === 0 ? placeholder : selectedLabels.join(", ");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px] text-start",
          selectedLabels.length === 0 && "text-muted-foreground"
        )}
      >
        <span className="line-clamp-1 flex-1 min-w-0">{summary}</span>
        <span className="flex items-center gap-1 shrink-0">
          {selectedLabels.length > 0 && (
            <span className="text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
              {selectedLabels.length}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform", open && "rotate-180")}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const isSel = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-accent min-h-[40px]",
                  isSel && "bg-primary/5"
                )}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  readOnly
                  className="size-4 shrink-0 pointer-events-none"
                />
                <span className="flex-1 min-w-0 line-clamp-1">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
