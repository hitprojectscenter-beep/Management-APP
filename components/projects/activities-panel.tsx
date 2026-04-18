"use client";

import { useState, useMemo } from "react";
import {
  mockTasks,
  mockUsers,
  getTasksByProject,
  type MockTask,
} from "@/lib/db/mock-data";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { txt } from "@/lib/utils/locale-text";
import { toast } from "sonner";
import { Activity, Plus, Trash2, Edit, Calendar, User, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

// ============================================
// Activity types and statuses
// ============================================
type ActivityStatus = "new" | "in_progress" | "done" | "frozen" | "late";
type ActivityPriority = "low" | "medium" | "high" | "critical";

interface ProjectActivity {
  id: string;
  name: string;
  linkedTaskId: string;
  priority: ActivityPriority;
  plannedStart: string;
  plannedEnd: string;
  assigneeId: string;
  status: ActivityStatus;
}

// ============================================
// Status config
// ============================================
const STATUS_CONFIG: Record<ActivityStatus, { he: string; en: string; color: string }> = {
  new: { he: "חדשה", en: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  in_progress: { he: "בביצוע", en: "In Progress", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  done: { he: "הסתיימה", en: "Done", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  frozen: { he: "הקפאה", en: "Frozen", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200" },
  late: { he: "איחור", en: "Late", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const PRIORITY_CONFIG: Record<ActivityPriority, { he: string; en: string; color: string }> = {
  low: { he: "נמוכה", en: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  medium: { he: "בינונית", en: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  high: { he: "גבוהה", en: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  critical: { he: "קריטית", en: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

// ============================================
// Bilingual labels
// ============================================
const LABELS = {
  title: { he: "פעילויות הפרויקט", en: "Project Activities" },
  addActivity: { he: "הוסף פעילות", en: "Add Activity" },
  editActivity: { he: "עריכת פעילות", en: "Edit Activity" },
  deleteSuccess: { he: "הפעילות נמחקה בהצלחה", en: "Activity deleted" },
  addSuccess: { he: "פעילות חדשה נוספה", en: "New activity added" },
  editSuccess: { he: "הפעילות עודכנה", en: "Activity updated" },
  name: { he: "שם הפעילות", en: "Activity Name" },
  linkedTask: { he: "משימה מקושרת", en: "Linked Task" },
  priority: { he: "עדיפות", en: "Priority" },
  plannedStart: { he: "תחילה מתוכננת", en: "Planned Start" },
  plannedEnd: { he: "סיום מתוכנן", en: "Planned End" },
  assignee: { he: "אחראי", en: "Assignee" },
  status: { he: "סטטוס", en: "Status" },
  cancel: { he: "ביטול", en: "Cancel" },
  save: { he: "שמור", en: "Save" },
  add: { he: "הוסף", en: "Add" },
  noActivities: { he: "אין פעילויות עדיין", en: "No activities yet" },
  all: { he: "הכל", en: "All" },
  selectTask: { he: "בחר משימה", en: "Select Task" },
  selectAssignee: { he: "בחר אחראי", en: "Select Assignee" },
  activities: { he: "פעילויות", en: "activities" },
  none: { he: "ללא", en: "None" },
  dates: { he: "תאריכים", en: "Dates" },
};

// ============================================
// Seed activities from project tasks
// ============================================
function seedActivities(projectId: string): ProjectActivity[] {
  const tasks = getTasksByProject(projectId);
  return tasks.map((task) => {
    let status: ActivityStatus = "new";
    if (task.status === "done") status = "done";
    else if (task.status === "in_progress" || task.status === "review") status = "in_progress";
    else if (task.status === "blocked") status = "frozen";
    else if (task.status === "not_started" && new Date(task.plannedEnd) < new Date()) status = "late";

    let priority: ActivityPriority = "medium";
    if (task.priority === "low") priority = "low";
    else if (task.priority === "high") priority = "high";
    else if (task.priority === "critical") priority = "critical";

    return {
      id: `act-${task.id}`,
      name: task.title,
      linkedTaskId: task.id,
      priority,
      plannedStart: task.plannedStart.split("T")[0],
      plannedEnd: task.plannedEnd.split("T")[0],
      assigneeId: task.assigneeId || "",
      status,
    };
  });
}

// ============================================
// Component
// ============================================
export function ActivitiesPanel({ projectId, locale }: { projectId: string; locale: string }) {
  const projectTasks = useMemo(() => getTasksByProject(projectId), [projectId]);

  const [activities, setActivities] = useState<ProjectActivity[]>(() => seedActivities(projectId));
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | "all">("all");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLinkedTask, setNewLinkedTask] = useState("");
  const [newPriority, setNewPriority] = useState<ActivityPriority>("medium");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newStatus, setNewStatus] = useState<ActivityStatus>("new");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLinkedTask, setEditLinkedTask] = useState("");
  const [editPriority, setEditPriority] = useState<ActivityPriority>("medium");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editStatus, setEditStatus] = useState<ActivityStatus>("new");

  // Filtered list
  const filtered = filterStatus === "all" ? activities : activities.filter((a) => a.status === filterStatus);

  // Tab counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: activities.length };
    for (const s of Object.keys(STATUS_CONFIG)) {
      c[s] = activities.filter((a) => a.status === s).length;
    }
    return c;
  }, [activities]);

  // ---- Handlers ----
  const handleAdd = () => {
    if (!newName.trim()) return;
    const activity: ProjectActivity = {
      id: `act-new-${Date.now()}`,
      name: newName.trim(),
      linkedTaskId: newLinkedTask,
      priority: newPriority,
      plannedStart: newStart,
      plannedEnd: newEnd,
      assigneeId: newAssignee,
      status: newStatus,
    };
    setActivities((prev) => [...prev, activity]);
    toast.success(txt(locale, LABELS.addSuccess));
    setAddOpen(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewName("");
    setNewLinkedTask("");
    setNewPriority("medium");
    setNewStart("");
    setNewEnd("");
    setNewAssignee("");
    setNewStatus("new");
  };

  const handleDelete = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    toast.success(txt(locale, LABELS.deleteSuccess));
  };

  const openEdit = (activity: ProjectActivity) => {
    setEditId(activity.id);
    setEditName(activity.name);
    setEditLinkedTask(activity.linkedTaskId);
    setEditPriority(activity.priority);
    setEditStart(activity.plannedStart);
    setEditEnd(activity.plannedEnd);
    setEditAssignee(activity.assigneeId);
    setEditStatus(activity.status);
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editId || !editName.trim()) return;
    setActivities((prev) =>
      prev.map((a) =>
        a.id === editId
          ? {
              ...a,
              name: editName.trim(),
              linkedTaskId: editLinkedTask,
              priority: editPriority,
              plannedStart: editStart,
              plannedEnd: editEnd,
              assigneeId: editAssignee,
              status: editStatus,
            }
          : a
      )
    );
    toast.success(txt(locale, LABELS.editSuccess));
    setEditOpen(false);
    setEditId(null);
  };

  // Resolve user from userId
  const getUser = (userId: string) => mockUsers.find((u) => u.id === userId);

  // ============================================
  // Shared form fields renderer
  // ============================================
  const renderFormFields = (
    values: {
      name: string;
      linkedTask: string;
      priority: ActivityPriority;
      start: string;
      end: string;
      assignee: string;
      status: ActivityStatus;
    },
    setters: {
      setName: (v: string) => void;
      setLinkedTask: (v: string) => void;
      setPriority: (v: ActivityPriority) => void;
      setStart: (v: string) => void;
      setEnd: (v: string) => void;
      setAssignee: (v: string) => void;
      setStatus: (v: ActivityStatus) => void;
    }
  ) => (
    <div className="flex flex-col gap-4 py-2">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label>{txt(locale, LABELS.name)} *</Label>
        <Input value={values.name} onChange={(e) => setters.setName(e.target.value)} />
      </div>

      {/* Linked task */}
      <div className="flex flex-col gap-1.5">
        <Label>{txt(locale, LABELS.linkedTask)}</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={values.linkedTask}
          onChange={(e) => setters.setLinkedTask(e.target.value)}
        >
          <option value="">{txt(locale, LABELS.none)}</option>
          {projectTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {locale !== "en" ? t.title : t.titleEn || t.title}
            </option>
          ))}
        </select>
      </div>

      {/* Priority + Status row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{txt(locale, LABELS.priority)}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={values.priority}
            onChange={(e) => setters.setPriority(e.target.value as ActivityPriority)}
          >
            {(Object.keys(PRIORITY_CONFIG) as ActivityPriority[]).map((p) => (
              <option key={p} value={p}>
                {locale !== "en" ? PRIORITY_CONFIG[p].he : PRIORITY_CONFIG[p].en}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{txt(locale, LABELS.status)}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={values.status}
            onChange={(e) => setters.setStatus(e.target.value as ActivityStatus)}
          >
            {(Object.keys(STATUS_CONFIG) as ActivityStatus[]).map((s) => (
              <option key={s} value={s}>
                {locale !== "en" ? STATUS_CONFIG[s].he : STATUS_CONFIG[s].en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{txt(locale, LABELS.plannedStart)}</Label>
          <Input type="date" value={values.start} onChange={(e) => setters.setStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{txt(locale, LABELS.plannedEnd)}</Label>
          <Input type="date" value={values.end} onChange={(e) => setters.setEnd(e.target.value)} />
        </div>
      </div>

      {/* Assignee */}
      <div className="flex flex-col gap-1.5">
        <Label>{txt(locale, LABELS.assignee)}</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={values.assignee}
          onChange={(e) => setters.setAssignee(e.target.value)}
        >
          <option value="">{txt(locale, LABELS.none)}</option>
          {mockUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // ============================================
  // Status filter tabs
  // ============================================
  const tabs: { key: ActivityStatus | "all"; label: { he: string; en: string } }[] = [
    { key: "all", label: LABELS.all },
    { key: "new", label: { he: STATUS_CONFIG.new.he, en: STATUS_CONFIG.new.en } },
    { key: "in_progress", label: { he: STATUS_CONFIG.in_progress.he, en: STATUS_CONFIG.in_progress.en } },
    { key: "done", label: { he: STATUS_CONFIG.done.he, en: STATUS_CONFIG.done.en } },
    { key: "frozen", label: { he: STATUS_CONFIG.frozen.he, en: STATUS_CONFIG.frozen.en } },
    { key: "late", label: { he: STATUS_CONFIG.late.he, en: STATUS_CONFIG.late.en } },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-amber-600" />
          <CardTitle className="text-base">
            {txt(locale, LABELS.title)}{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({activities.length} {txt(locale, LABELS.activities)})
            </span>
          </CardTitle>
        </div>

        {/* Add Activity Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">{txt(locale, LABELS.addActivity)}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{txt(locale, LABELS.addActivity)}</DialogTitle>
            </DialogHeader>
            {renderFormFields(
              {
                name: newName,
                linkedTask: newLinkedTask,
                priority: newPriority,
                start: newStart,
                end: newEnd,
                assignee: newAssignee,
                status: newStatus,
              },
              {
                setName: setNewName,
                setLinkedTask: setNewLinkedTask,
                setPriority: setNewPriority,
                setStart: setNewStart,
                setEnd: setNewEnd,
                setAssignee: setNewAssignee,
                setStatus: setNewStatus,
              }
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                {txt(locale, LABELS.cancel)}
              </Button>
              <Button onClick={handleAdd} disabled={!newName.trim()}>
                {txt(locale, LABELS.add)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                filterStatus === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {txt(locale, tab.label)}
              <span className="ms-1 opacity-70">({counts[tab.key] || 0})</span>
            </button>
          ))}
        </div>

        {/* Activity list */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {txt(locale, LABELS.noActivities)}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((activity) => {
              const user = getUser(activity.assigneeId);
              const sc = STATUS_CONFIG[activity.status];
              const pc = PRIORITY_CONFIG[activity.priority];

              return (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  {/* Status badge */}
                  <Badge className={`shrink-0 text-[10px] border-0 ${sc.color}`}>
                    {locale !== "en" ? sc.he : sc.en}
                  </Badge>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.name}</p>
                    {/* Dates */}
                    {(activity.plannedStart || activity.plannedEnd) && (
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                        <Calendar className="size-3" />
                        {activity.plannedStart && formatDate(activity.plannedStart, locale)}
                        {activity.plannedStart && activity.plannedEnd && " - "}
                        {activity.plannedEnd && formatDate(activity.plannedEnd, locale)}
                      </div>
                    )}
                  </div>

                  {/* Priority badge */}
                  <Badge className={`shrink-0 text-[10px] border-0 ${pc.color}`}>
                    {locale !== "en" ? pc.he : pc.en}
                  </Badge>

                  {/* Assignee avatar */}
                  <div className="shrink-0">
                    {user ? (
                      <div className="flex items-center gap-1.5" title={user.name}>
                        <Avatar src={user.image} fallback={user.name[0]} className="size-6" />
                        <span className="text-xs hidden md:inline">{user.name.split(" ")[0]}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="size-3.5" />
                        <span className="hidden md:inline">--</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0 ms-auto sm:ms-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title={txt(locale, LABELS.editActivity)}
                      onClick={() => openEdit(activity)}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      title={txt(locale, LABELS.deleteSuccess)}
                      onClick={() => handleDelete(activity.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Edit Activity Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt(locale, LABELS.editActivity)}</DialogTitle>
          </DialogHeader>
          {renderFormFields(
            {
              name: editName,
              linkedTask: editLinkedTask,
              priority: editPriority,
              start: editStart,
              end: editEnd,
              assignee: editAssignee,
              status: editStatus,
            },
            {
              setName: setEditName,
              setLinkedTask: setEditLinkedTask,
              setPriority: setEditPriority,
              setStart: setEditStart,
              setEnd: setEditEnd,
              setAssignee: setEditAssignee,
              setStatus: setEditStatus,
            }
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {txt(locale, LABELS.cancel)}
            </Button>
            <Button onClick={handleEditSave} disabled={!editName.trim()}>
              {txt(locale, LABELS.save)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
