"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare, Send, CheckCheck, Eye, Clock, Loader2, History,
  CircleDot, CheckCircle2, CalendarClock, ThumbsUp, ThumbsDown, X, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime, formatDateDDMMYYYY } from "@/lib/utils";
import { txt, STATUS_LABELS_ML, MEMBER_ROLE_LABELS_ML, MEMBER_ROLE_KEYS } from "@/lib/utils/locale-text";
import { STATUS_COLORS, WORKFLOW_STATUSES, type TaskStatus } from "@/lib/db/types";
import { mockUsers } from "@/lib/db/mock-data";

interface HistoryRow {
  id: string;
  actorId: string;
  kind: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}
interface MemberRow {
  userId: string;
  done: boolean;
  note: string | null;
  updatedAt: string;
}
interface Activity {
  status: string;
  plannedEnd: string;
  team: string[];
  completionMembers: string[];
  memberRoles: Record<string, { type: string; detail?: string }>;
  history: HistoryRow[];
  members: MemberRow[];
}
interface ThreadData {
  messages: { id: string; authorId: string; body: string; createdAt: string }[];
  receipts: { userId: string; seenAt: string; acknowledgedAt: string | null }[];
  activity: Activity | null;
  participants: string[];
  creatorId: string | null;
  isCreatedTask: boolean;
  me: string;
  meRole?: string;
}

/** The modal can collect a note, and (for extensions) a date too. */
type Prompt =
  | { type: "status"; status: string }
  | { type: "member"; done: boolean }
  | { type: "extension" }
  | { type: "decide"; requestId: string; approve: boolean; newDueDate: string };

function userName(id: string): string {
  return mockUsers.find((u) => u.id === id)?.name || id;
}
function userImg(id: string): string | undefined {
  return mockUsers.find((u) => u.id === id)?.image;
}
function statusLabel(s: string, locale: string): string {
  return (STATUS_LABELS_ML[s] && txt(locale, STATUS_LABELS_ML[s])) as string || s;
}
function statusColor(s: string): string {
  return STATUS_COLORS[s as TaskStatus] || "hsl(220,9%,46%)";
}
function roleLabel(type: string, locale: string): string {
  return (MEMBER_ROLE_LABELS_ML[type] && txt(locale, MEMBER_ROLE_LABELS_ML[type])) as string || type;
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Per-task workflow + internal chat. Two cards:
 *  1. Status & workflow — change status (mandatory note), per-member "בוצע"
 *     sign-off (auto-completes the task when all done), due-date extension
 *     requests + creator approval, and a full change-history timeline.
 *  2. Chat & delivery receipts (the original).
 * Every change is logged and the team is notified. Polls every 12s. Self-hides
 * when the viewer has no access or no DB is configured. Workflow sections only
 * render for created tasks (seeded tasks have no workflow state).
 */
export function TaskThread({ taskId, locale }: { taskId: string; locale: string }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [hidden, setHidden] = useState(false);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [acking, setAcking] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [note, setNote] = useState("");
  const [extDate, setExtDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingRoles, setEditingRoles] = useState(false);
  const [rolesDraft, setRolesDraft] = useState<Record<string, { type: string; detail?: string }>>({});
  const [savingRoles, setSavingRoles] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/thread`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 503) {
        setHidden(true);
        return;
      }
      if (!res.ok) return;
      setData(await res.json());
      setHidden(false);
    } catch {
      /* keep prior state */
    }
  }, [taskId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 12_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length]);

  if (hidden) return null;

  const me = data?.me;
  const isCreator = !!data && data.creatorId === me;
  const nonCreatorParticipants = (data?.participants || []).filter((p) => p !== data?.creatorId);
  const myReceipt = data?.receipts.find((r) => r.userId === me);
  const iAcked = !!myReceipt?.acknowledgedAt;
  const iAmParticipant = !!data && !!me && data.participants.includes(me) && !isCreator;
  const showReceipts = !!data?.isCreatedTask && nonCreatorParticipants.length > 0;

  const activity = data?.activity || null;
  const isParticipant = !!data && !!me && (data.participants.includes(me) || isCreator);

  // Pending extension requests = requests with no later decision referencing them.
  const decidedReqIds = new Set(
    (activity?.history || [])
      .filter((h) => h.kind === "extension_approved" || h.kind === "extension_rejected")
      .map((h) => String((h.meta as Record<string, unknown> | null)?.requestId ?? "")),
  );
  const pendingRequests = (activity?.history || []).filter(
    (h) => h.kind === "extension_request" && !decidedReqIds.has(h.id),
  );

  const doneCount = activity
    ? activity.completionMembers.filter((id) => activity.members.find((m) => m.userId === id)?.done).length
    : 0;
  const iAmCompletionMember = !!me && !!activity && activity.completionMembers.includes(me);
  const myDone = !!activity?.members.find((m) => m.userId === me)?.done;
  // Only the task creator (or an admin) assigns/edits responsibilities.
  const canEditRoles = !!activity && activity.completionMembers.length > 0 && (isCreator || data?.meRole === "admin");

  // ---- actions --------------------------------------------------------------
  const startEditRoles = () => {
    if (!activity) return;
    const draft: Record<string, { type: string; detail?: string }> = {};
    for (const uid of activity.completionMembers) draft[uid] = activity.memberRoles[uid] || { type: "execute" };
    setRolesDraft(draft);
    setEditingRoles(true);
  };
  const setDraftRole = (uid: string, patch: { type?: string; detail?: string }) =>
    setRolesDraft((prev) => {
      const cur = prev[uid] || { type: "execute" };
      return { ...prev, [uid]: { ...cur, ...patch } };
    });
  const saveRoles = async () => {
    setSavingRoles(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/member-roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberRoles: rolesDraft }),
      });
      if (res.ok) {
        toast.success(txt(locale, { he: "התפקידים עודכנו ונשלחו לצוות", en: "Roles updated & sent to the team" }) as string);
        setEditingRoles(false);
        await load();
      } else {
        const e = await res.json().catch(() => ({}));
        toast.error(txt(locale, e?.error === "only_creator"
          ? { he: "רק יוצר המשימה יכול לערוך תפקידים", en: "Only the creator can edit roles" }
          : { he: "עדכון התפקידים נכשל", en: "Failed to update roles" }) as string);
      }
    } finally {
      setSavingRoles(false);
    }
  };
  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        setInput("");
        await load();
      } else {
        toast.error(txt(locale, { he: "שליחת ההודעה נכשלה", en: "Failed to send" }) as string);
      }
    } finally {
      setPosting(false);
    }
  };

  const ack = async () => {
    setAcking(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/ack`, { method: "POST" });
      if (res.ok) {
        toast.success(txt(locale, { he: "אישרת את קבלת המשימה", en: "Receipt acknowledged" }) as string);
        await load();
      }
    } finally {
      setAcking(false);
    }
  };

  const openPrompt = (p: Prompt) => {
    setPrompt(p);
    setNote("");
    setExtDate(p.type === "extension" ? (activity?.plannedEnd || todayISO()) : "");
  };

  const submitPrompt = async () => {
    if (!prompt) return;
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error(txt(locale, { he: "חובה למלא הסבר", en: "Explanation is required" }) as string);
      return;
    }
    if (prompt.type === "extension" && !extDate) {
      toast.error(txt(locale, { he: "חובה לבחור תאריך יעד חדש", en: "Pick a new due date" }) as string);
      return;
    }
    setSubmitting(true);
    try {
      let res: Response;
      if (prompt.type === "status") {
        res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: prompt.status, note: trimmed }),
        });
      } else if (prompt.type === "member") {
        res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/member-status`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: prompt.done, note: trimmed }),
        });
      } else if (prompt.type === "extension") {
        res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/extension`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newDueDate: extDate, note: trimmed }),
        });
      } else {
        res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/extension`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: prompt.requestId, approve: prompt.approve, note: trimmed }),
        });
      }
      if (res.ok) {
        const out = await res.json().catch(() => ({}));
        if (prompt.type === "member" && out.autoCompleted) {
          toast.success(txt(locale, { he: "כל הצוות סיים — המשימה הושלמה! 🎉", en: "All done — task completed! 🎉" }) as string);
        } else {
          toast.success(txt(locale, { he: "העדכון נשמר ונשלח לצוות", en: "Saved and sent to the team" }) as string);
        }
        setPrompt(null);
        setNote("");
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        const map: Record<string, { he: string; en: string }> = {
          note_required: { he: "חובה למלא הסבר", en: "Explanation required" },
          bad_date: { he: "תאריך לא תקין", en: "Invalid date" },
          only_creator: { he: "רק יוצר המשימה יכול לאשר/לדחות", en: "Only the creator can decide" },
          request_not_found: { he: "הבקשה לא נמצאה", en: "Request not found" },
        };
        toast.error(txt(locale, map[err?.error] || { he: "הפעולה נכשלה", en: "Action failed" }) as string);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const historyDesc = (h: HistoryRow): string => {
    const m = (h.meta as Record<string, unknown> | null) || {};
    switch (h.kind) {
      case "created":
        return txt(locale, { he: "המשימה נוצרה", en: "Task created" }) as string;
      case "status_change":
        if (m.auto) return txt(locale, { he: "הושלמה אוטומטית — כל הצוות סיים", en: "Auto-completed — all done" }) as string;
        return `${txt(locale, { he: "סטטוס", en: "Status" })}: ${statusLabel(h.fromStatus || "", locale)} ← ${statusLabel(h.toStatus || "", locale)}`;
      case "member_done":
        return txt(locale, { he: "סימן/ה 'בוצע'", en: "Marked done" }) as string;
      case "member_undone":
        return txt(locale, { he: "ביטל/ה 'בוצע'", en: "Unmarked done" }) as string;
      case "extension_request":
        return `${txt(locale, { he: "ביקש/ה לעדכן יעד ל", en: "Requested new due date" })}-${formatDateDDMMYYYY(String(m.newDueDate || ""))}`;
      case "extension_approved":
        return `${txt(locale, { he: "אישר/ה עדכון יעד ל", en: "Approved new due date" })}-${formatDateDDMMYYYY(String(m.newDueDate || ""))}`;
      case "extension_rejected":
        return txt(locale, { he: "דחה/תה בקשת עדכון יעד", en: "Rejected due-date request" }) as string;
      case "roles_updated":
        return txt(locale, { he: "עודכנו תפקידי הצוות", en: "Updated team roles" }) as string;
      default:
        return h.kind;
    }
  };

  return (
    <div className="space-y-6">
      {/* ============ Card 1: Status & workflow ============ */}
      {activity && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="size-4" />
              {txt(locale, { he: "סטטוס וזרימת עבודה", en: "Status & workflow" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Current status + changer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{txt(locale, { he: "סטטוס נוכחי:", en: "Current status:" })}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold">
                  <span className="size-2 rounded-full" style={{ backgroundColor: statusColor(activity.status) }} />
                  {statusLabel(activity.status, locale)}
                </span>
              </div>
              {isParticipant && (
                <>
                  <div className="text-xs text-muted-foreground">{txt(locale, { he: "שנה סטטוס (יידרש הסבר):", en: "Change status (note required):" })}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {WORKFLOW_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => s !== activity.status && openPrompt({ type: "status", status: s })}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          s === activity.status ? "ring-2 ring-primary bg-primary/5 font-semibold cursor-default" : "hover:bg-muted",
                        )}
                      >
                        <span className="inline-block size-2 rounded-full me-1 align-middle" style={{ backgroundColor: statusColor(s) }} />
                        {statusLabel(s, locale)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Per-member sign-off */}
            {activity.completionMembers.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {txt(locale, { he: "ביצוע חברי הצוות (מי אחראי על מה)", en: "Team completion (who does what)" })}
                  </span>
                  <div className="flex items-center gap-2">
                    {canEditRoles && !editingRoles && (
                      <button type="button" onClick={startEditRoles} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        <Pencil className="size-3" />
                        {txt(locale, { he: "ערוך תפקידים", en: "Edit roles" })}
                      </button>
                    )}
                    <Badge variant={doneCount === activity.completionMembers.length ? "success" : "secondary"}>
                      {doneCount}/{activity.completionMembers.length} {txt(locale, { he: "בוצע", en: "done" })}
                    </Badge>
                  </div>
                </div>

                {editingRoles ? (
                  <div className="space-y-2">
                    {activity.completionMembers.map((uid) => {
                      const role = rolesDraft[uid] || { type: "execute" };
                      return (
                        <div key={uid} className="grid grid-cols-1 sm:grid-cols-[6rem_8rem_1fr] gap-2 sm:items-center">
                          <span className="text-sm font-medium truncate">{userName(uid)}</span>
                          <select
                            value={role.type}
                            onChange={(e) => setDraftRole(uid, { type: e.target.value })}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {MEMBER_ROLE_KEYS.map((k) => (
                              <option key={k} value={k}>{txt(locale, MEMBER_ROLE_LABELS_ML[k]) as string}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={role.detail || ""}
                            onChange={(e) => setDraftRole(uid, { detail: e.target.value })}
                            placeholder={txt(locale, { he: "פירוט: על מה / עם מי / מה התוצר", en: "Detail: on what / with whom / deliverable" }) as string}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                            style={{ fontSize: "16px" }}
                            maxLength={120}
                          />
                        </div>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={saveRoles} disabled={savingRoles}>
                        {savingRoles && <Loader2 className="size-3.5 animate-spin me-1" />}
                        {txt(locale, { he: "שמור תפקידים", en: "Save roles" })}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingRoles(false)} disabled={savingRoles}>
                        {txt(locale, { he: "ביטול", en: "Cancel" })}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      {activity.completionMembers.map((uid) => {
                        const mDone = !!activity.members.find((m) => m.userId === uid)?.done;
                        return (
                          <div key={uid} className="flex items-center justify-between text-sm gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <Avatar src={userImg(uid)} fallback={userName(uid)[0]} className="size-6 shrink-0" />
                              <span className="min-w-0">
                                <span className="block truncate">{userName(uid)}</span>
                                {activity.memberRoles[uid] && (
                                  <span className="block text-[11px] text-muted-foreground truncate">
                                    {roleLabel(activity.memberRoles[uid].type, locale)}
                                    {activity.memberRoles[uid].detail ? ` · ${activity.memberRoles[uid].detail}` : ""}
                                  </span>
                                )}
                              </span>
                            </span>
                            {mDone ? (
                              <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" />{txt(locale, { he: "בוצע", en: "Done" })}</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-muted-foreground"><Clock className="size-3" />{txt(locale, { he: "ממתין", en: "Pending" })}</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {iAmCompletionMember && (
                      <Button
                        size="sm"
                        variant={myDone ? "outline" : "default"}
                        className="w-full mt-1"
                        onClick={() => openPrompt({ type: "member", done: !myDone })}
                      >
                        <CheckCircle2 className="size-4 me-1.5" />
                        {myDone
                          ? txt(locale, { he: "בטל סימון 'בוצע'", en: "Undo 'done'" })
                          : txt(locale, { he: "סמן את חלקי כ'בוצע'", en: "Mark my part done" })}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Due date + extension */}
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  {txt(locale, { he: "תאריך יעד", en: "Due date" })}
                </span>
                <span className="text-sm font-medium">{activity.plannedEnd ? formatDateDDMMYYYY(activity.plannedEnd) : "—"}</span>
              </div>
              {isParticipant && !isCreator && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => openPrompt({ type: "extension" })}>
                  <CalendarClock className="size-4 me-1.5" />
                  {txt(locale, { he: "בקש עדכון תאריך יעד", en: "Request due-date change" })}
                </Button>
              )}
              {/* Pending requests */}
              {pendingRequests.map((r) => {
                const m = (r.meta as Record<string, unknown> | null) || {};
                return (
                  <div key={r.id} className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-2.5 text-sm space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                      <CalendarClock className="size-3.5" />
                      {userName(r.actorId)} · {txt(locale, { he: "בקשה ל", en: "requests" })}-{formatDateDDMMYYYY(String(m.newDueDate || ""))}
                    </div>
                    <div className="text-muted-foreground text-xs">{r.note}</div>
                    {(isCreator || data?.me === data?.creatorId) && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="default" className="h-7" onClick={() => openPrompt({ type: "decide", requestId: r.id, approve: true, newDueDate: String(m.newDueDate || "") })}>
                          <ThumbsUp className="size-3.5 me-1" />{txt(locale, { he: "אשר", en: "Approve" })}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => openPrompt({ type: "decide", requestId: r.id, approve: false, newDueDate: String(m.newDueDate || "") })}>
                          <ThumbsDown className="size-3.5 me-1" />{txt(locale, { he: "דחה", en: "Reject" })}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* History timeline */}
            {activity.history.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <History className="size-3.5" />
                  {txt(locale, { he: "היסטוריית המשימה", en: "Task history" })}
                </div>
                <ol className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                  {[...activity.history].reverse().map((h) => (
                    <li key={h.id} className="flex gap-2 text-sm">
                      <Avatar src={userImg(h.actorId)} fallback={userName(h.actorId)[0]} className="size-6 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{userName(h.actorId)}</span> · {formatDateTime(h.createdAt, locale)}
                        </div>
                        <div className="font-medium">{historyDesc(h)}</div>
                        {h.note && h.note !== "—" && <div className="text-muted-foreground text-[13px] whitespace-pre-wrap">“{h.note}”</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ Card 2: Chat & receipts ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4" />
            {txt(locale, { he: "צ'אט ועדכוני משימה", en: "Task chat & updates" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delivery / acknowledgment receipts */}
          {showReceipts && (
            <div className="space-y-2 pb-3 border-b">
              <div className="text-xs font-semibold text-muted-foreground">
                {txt(locale, { he: "סטטוס קבלה", en: "Delivery status" })}
              </div>

              {isCreator ? (
                <div className="flex flex-col gap-1.5">
                  {nonCreatorParticipants.map((pid) => {
                    const rec = data!.receipts.find((r) => r.userId === pid);
                    const st = rec?.acknowledgedAt ? "ack" : rec?.seenAt ? "seen" : "pending";
                    return (
                      <div key={pid} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Avatar src={userImg(pid)} fallback={userName(pid)[0]} className="size-6" />
                          {userName(pid)}
                        </span>
                        {st === "ack" ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCheck className="size-3" />
                            {txt(locale, { he: "אישר/ה קבלה", en: "Acknowledged" })}
                          </Badge>
                        ) : st === "seen" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Eye className="size-3" />
                            {txt(locale, { he: "נצפה", en: "Seen" })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Clock className="size-3" />
                            {txt(locale, { he: "ממתין", en: "Pending" })}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : iAmParticipant ? (
                <div className="flex items-center gap-2">
                  {iAcked ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCheck className="size-3" />
                      {txt(locale, { he: "אישרת קבלה", en: "You acknowledged" })}
                    </Badge>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {txt(locale, { he: "המשימה שויכה אליך.", en: "This task was assigned to you." })}
                      </span>
                      <Button size="sm" onClick={ack} disabled={acking}>
                        {acking && <Loader2 className="size-3.5 animate-spin me-1" />}
                        {txt(locale, { he: "אשר קבלה", en: "Acknowledge" })}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Chat */}
          <div className="space-y-3">
            <div className="space-y-3 max-h-80 overflow-y-auto pe-1">
              {data && data.messages.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {txt(locale, { he: "אין הודעות עדיין — התחילו שיחה.", en: "No messages yet — start the conversation." })}
                </div>
              )}
              {data?.messages.map((m) => {
                const mine = m.authorId === me;
                return (
                  <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                    <Avatar src={userImg(m.authorId)} fallback={userName(m.authorId)[0]} className="size-8 shrink-0" />
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 max-w-[78%]",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      <div className={cn("text-[10px] mb-0.5", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {userName(m.authorId)} · {formatDateTime(m.createdAt, locale)}
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={txt(locale, { he: "כתוב הודעה לצוות המשימה…", en: "Message the task team…" }) as string}
                className="flex-1 min-h-[44px] max-h-32 resize-y rounded-md border bg-background px-3 py-2 text-sm"
                style={{ fontSize: "16px" }}
              />
              <Button onClick={send} disabled={posting || !input.trim()} className="min-h-[44px]">
                {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ Note prompt modal ============ */}
      {prompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !submitting && setPrompt(null)}>
          <div className="w-full max-w-md rounded-xl bg-background shadow-xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-sm">
                {prompt.type === "status" && `${txt(locale, { he: "שינוי סטטוס ל", en: "Change status to" })}: ${statusLabel(prompt.status, locale)}`}
                {prompt.type === "member" && (prompt.done
                  ? txt(locale, { he: "סימון 'בוצע'", en: "Mark done" })
                  : txt(locale, { he: "ביטול 'בוצע'", en: "Undo done" }))}
                {prompt.type === "extension" && txt(locale, { he: "בקשת עדכון תאריך יעד", en: "Request due-date change" })}
                {prompt.type === "decide" && (prompt.approve
                  ? txt(locale, { he: "אישור בקשת יעד", en: "Approve request" })
                  : txt(locale, { he: "דחיית בקשת יעד", en: "Reject request" }))}
              </h3>
              <button onClick={() => !submitting && setPrompt(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {prompt.type === "extension" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{txt(locale, { he: "תאריך יעד חדש *", en: "New due date *" })}</label>
                  <input
                    type="date"
                    value={extDate}
                    onChange={(e) => setExtDate(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    style={{ fontSize: "16px" }}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {txt(locale, { he: "הסבר * (חובה)", en: "Explanation * (required)" })}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder={txt(locale, { he: "מדוע? פרט/י בקצרה…", en: "Why? Briefly…" }) as string}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <Button variant="outline" size="sm" onClick={() => setPrompt(null)} disabled={submitting}>
                {txt(locale, { he: "ביטול", en: "Cancel" })}
              </Button>
              <Button size="sm" onClick={submitPrompt} disabled={submitting || !note.trim()}>
                {submitting && <Loader2 className="size-3.5 animate-spin me-1" />}
                {txt(locale, { he: "שמור ושלח", en: "Save & send" })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
