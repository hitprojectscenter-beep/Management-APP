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
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Briefcase } from "lucide-react";
import { mockWbsNodes } from "@/lib/db/mock-data";
import { persistAddedProject, type LiveProject } from "@/lib/db/local-projects";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

interface FormState {
  name: string;
  nameEn: string;
  description: string;
  programId: string;
  methodology: "waterfall" | "agile" | "kanban";
  plannedStart: string;
  plannedEnd: string;
  budget: string;
}

const METHODOLOGY = [
  { value: "waterfall", icon: "📊", he: "Waterfall — מפל מים", en: "Waterfall", desc: { he: "שלבים רציפים, שערי שלב", en: "Sequential phases, gate reviews" } },
  { value: "agile",     icon: "🔄", he: "Agile",                en: "Agile",      desc: { he: "Sprints, velocity, retros",      en: "Sprints, velocity, retros" } },
  { value: "kanban",    icon: "📋", he: "Kanban",               en: "Kanban",     desc: { he: "זרימה רציפה, WIP מוגבל",        en: "Continuous flow, WIP limits" } },
] as const;

/**
 * Standalone "create a new project" dialog. The /projects page header had
 * a "פרויקט חדש" button with NO onClick — clicking it appeared to do nothing.
 * This dialog gives the button real behavior in demo mode.
 */
export function AddProjectDialog({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const programs = mockWbsNodes.filter((n) => n.level === "program");
  const [form, setForm] = useState<FormState>({
    name: "",
    nameEn: "",
    description: "",
    programId: programs[0]?.id || "",
    methodology: "waterfall",
    plannedStart: "",
    plannedEnd: "",
    budget: "",
  });

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = txt(locale, { he: "חובה למלא שם פרויקט", en: "Project name required" });
    if (!form.programId) errs.programId = txt(locale, { he: "חובה לבחור תוכנית", en: "Program required" });
    if (!form.plannedStart) errs.plannedStart = txt(locale, { he: "חובה", en: "Required" });
    if (!form.plannedEnd) errs.plannedEnd = txt(locale, { he: "חובה", en: "Required" });
    if (form.plannedEnd && form.plannedStart && form.plannedEnd < form.plannedStart) {
      errs.plannedEnd = txt(locale, { he: "תאריך סיום לפני ההתחלה", en: "End before start" });
    }
    if (form.budget && isNaN(parseFloat(form.budget))) {
      errs.budget = txt(locale, { he: "תקציב חייב להיות מספר", en: "Budget must be a number" });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(
        txt(locale, {
          he: "נא להשלים את כל שדות החובה המסומנים ב-*",
          en: "Please complete all required fields marked with *",
        })
      );
      requestAnimationFrame(() => {
        const firstErr = document.querySelector(
          '[role="dialog"] [aria-invalid="true"], [role="dialog"] .border-red-500'
        ) as HTMLElement | null;
        firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErr?.focus?.();
      });
      return;
    }

    const program = programs.find((p) => p.id === form.programId);

    // Persist the project: optimistic cache (so it shows immediately) AND a
    // durable write to PostgreSQL (cross-device, per-user). Previously this
    // dialog only toasted and saved nothing.
    const newProject: LiveProject = {
      id: `proj-${Date.now()}`,
      parentId: form.programId || null,
      level: "project",
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || undefined,
      description: form.description.trim() || undefined,
      position: 0,
      methodology: form.methodology,
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      budget: form.budget ? Math.round(parseFloat(form.budget)) : null,
      status: "active",
    };
    persistAddedProject(newProject);

    toast.success(
      txt(locale, {
        he: `הפרויקט "${form.name}" נוצר בהצלחה!`,
        en: `Project "${form.name}" created!`,
      }),
      {
        description: txt(locale, {
          he: `תוכנית: ${program?.name || ""} · מתודולוגיה: ${form.methodology} · ${form.plannedStart} → ${form.plannedEnd}`,
          en: `Program: ${program?.name || ""} · Methodology: ${form.methodology} · ${form.plannedStart} → ${form.plannedEnd}`,
        }),
      }
    );
    setOpen(false);
    setForm({
      name: "",
      nameEn: "",
      description: "",
      programId: programs[0]?.id || "",
      methodology: "waterfall",
      plannedStart: "",
      plannedEnd: "",
      budget: "",
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-primary" />
            {txt(locale, { he: "יצירת פרויקט חדש", en: "Create New Project" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, { he: "מלא את הפרטים הנדרשים ליצירת הפרויקט.", en: "Fill in the required project details." })}
            {" "}
            <span className="text-red-500">*</span> = {txt(locale, { he: "חובה", en: "required" })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Project name */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">
              {txt(locale, { he: "שם הפרויקט", en: "Project name" })} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="proj-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-invalid={!!errors.name}
              className={cn("min-h-[44px]", errors.name && "border-red-500")}
              style={{ fontSize: "16px" }}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* English name (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name-en">
              {txt(locale, { he: "שם באנגלית (אופציונלי)", en: "English name (optional)" })}
            </Label>
            <Input
              id="proj-name-en"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              className="min-h-[44px]"
              style={{ fontSize: "16px" }}
              dir="ltr"
            />
          </div>

          {/* Parent program */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-program">
              {txt(locale, { he: "תוכנית הורה", en: "Parent program" })} <span className="text-red-500">*</span>
            </Label>
            <select
              id="proj-program"
              value={form.programId}
              onChange={(e) => setForm({ ...form, programId: e.target.value })}
              aria-invalid={!!errors.programId}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]",
                errors.programId && "border-red-500"
              )}
            >
              <option value="">{txt(locale, { he: "-- בחר תוכנית --", en: "-- Select program --" })}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {locale === "he" ? p.name : (p.nameEn || p.name)}
                </option>
              ))}
            </select>
            {errors.programId && <p className="text-xs text-red-500">{errors.programId}</p>}
          </div>

          {/* Methodology */}
          <div className="space-y-1.5">
            <Label>{txt(locale, { he: "שיטת ניהול", en: "Methodology" })}</Label>
            <div className="grid grid-cols-3 gap-2">
              {METHODOLOGY.map((m) => (
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">{txt(locale, { he: "תיאור הפרויקט", en: "Description" })}</Label>
            <textarea
              id="proj-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })}
              className="w-full min-h-[80px] bg-muted/30 border rounded-md p-2 text-sm resize-y"
              style={{ fontSize: "16px" }}
              maxLength={500}
            />
            <div className="text-[10px] text-muted-foreground text-end">{form.description.length}/500</div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start">
                {txt(locale, { he: "תאריך התחלה", en: "Start date" })} <span className="text-red-500">*</span>
              </Label>
              <DateField
                id="proj-start"
                value={form.plannedStart}
                error={!!errors.plannedStart}
                onChange={(iso) => setForm({ ...form, plannedStart: iso })}
              />
              {errors.plannedStart && <p className="text-xs text-red-500">{errors.plannedStart}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-end">
                {txt(locale, { he: "תאריך סיום", en: "End date" })} <span className="text-red-500">*</span>
              </Label>
              <DateField
                id="proj-end"
                value={form.plannedEnd}
                error={!!errors.plannedEnd}
                onChange={(iso) => setForm({ ...form, plannedEnd: iso })}
              />
              {errors.plannedEnd && <p className="text-xs text-red-500">{errors.plannedEnd}</p>}
            </div>
          </div>

          {/* Budget (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-budget">{txt(locale, { he: "תקציב מתוכנן (אופציונלי)", en: "Planned budget (optional)" })}</Label>
            <Input
              id="proj-budget"
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              aria-invalid={!!errors.budget}
              className={cn("min-h-[44px]", errors.budget && "border-red-500")}
              placeholder="0"
              min={0}
            />
            {errors.budget && <p className="text-xs text-red-500">{errors.budget}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {txt(locale, { he: "ביטול", en: "Cancel" })}
            </Button>
            <Button type="submit">
              <Plus className="size-4" />
              {txt(locale, { he: "צור פרויקט", en: "Create Project" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
