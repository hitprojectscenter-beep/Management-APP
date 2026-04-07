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
import { toast } from "sonner";
import type { MockUser, MockWbsNode } from "@/lib/db/mock-data";

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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: projects[0]?.id || "",
    assigneeId: users[0]?.id || "",
    status: "not_started",
    priority: "medium",
    plannedStart: new Date().toISOString().slice(0, 10),
    plannedEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    estimateHours: "8",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(isHe ? "נדרש כותרת למשימה" : "Task title is required");
      return;
    }
    setSubmitting(true);
    // Simulated server action - in production this would call a server action
    await new Promise((r) => setTimeout(r, 600));
    toast.success(
      isHe
        ? `המשימה "${form.title}" נוצרה בהצלחה`
        : `Task "${form.title}" created successfully`,
      {
        description: isHe
          ? "במצב הדגמה - חיבור ל-DB יוסיף משימות אמיתיות"
          : "Demo mode - DB connection will persist real tasks",
      }
    );
    setSubmitting(false);
    setOpen(false);
    setForm({
      ...form,
      title: "",
      description: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isHe ? "הוספת משימה חדשה" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {isHe ? "צור משימה חדשה בפרויקט קיים" : "Create a new task in an existing project"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{isHe ? "כותרת המשימה" : "Task Title"} *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isHe ? "מה צריך לעשות?" : "What needs to be done?"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{isHe ? "תיאור" : "Description"}</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={isHe ? "פרטים נוספים (אופציונלי)" : "Additional details (optional)"}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="project">{isHe ? "פרויקט" : "Project"}</Label>
              <select
                id="project"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isHe ? p.name : p.nameEn || p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">{isHe ? "אחראי" : "Assignee"}</Label>
              <select
                id="assignee"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priority">{isHe ? "עדיפות" : "Priority"}</Label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="low">{isHe ? "נמוכה" : "Low"}</option>
                <option value="medium">{isHe ? "בינונית" : "Medium"}</option>
                <option value="high">{isHe ? "גבוהה" : "High"}</option>
                <option value="critical">{isHe ? "קריטית" : "Critical"}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{isHe ? "סטטוס" : "Status"}</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="not_started">{isHe ? "לא התחיל" : "Not started"}</option>
                <option value="in_progress">{isHe ? "בביצוע" : "In progress"}</option>
                <option value="review">{isHe ? "בבדיקה" : "Review"}</option>
                <option value="blocked">{isHe ? "חסום" : "Blocked"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plannedStart">{isHe ? "התחלה" : "Start"}</Label>
              <Input
                id="plannedStart"
                type="date"
                value={form.plannedStart}
                onChange={(e) => setForm({ ...form, plannedStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedEnd">{isHe ? "תאריך יעד" : "Due"}</Label>
              <Input
                id="plannedEnd"
                type="date"
                value={form.plannedEnd}
                onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimateHours">{isHe ? "שעות" : "Hours"}</Label>
              <Input
                id="estimateHours"
                type="number"
                min="0"
                value={form.estimateHours}
                onChange={(e) => setForm({ ...form, estimateHours: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {isHe ? "ביטול" : "Cancel"}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isHe ? "יוצר..." : "Creating...") : isHe ? "צור משימה" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
