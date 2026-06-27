"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, CheckCheck, Eye, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { mockUsers } from "@/lib/db/mock-data";

interface ThreadData {
  messages: { id: string; authorId: string; body: string; createdAt: string }[];
  receipts: { userId: string; seenAt: string; acknowledgedAt: string | null }[];
  participants: string[];
  creatorId: string | null;
  isCreatedTask: boolean;
  me: string;
}

function userName(id: string): string {
  return mockUsers.find((u) => u.id === id)?.name || id;
}
function userImg(id: string): string | undefined {
  return mockUsers.find((u) => u.id === id)?.image;
}

/**
 * Per-task internal chat + delivery/acknowledgment receipts. Self-contained:
 * resolves the participant set + access server-side, hides itself when the
 * viewer has no access or no DB is configured. Polls every 12s for near-live
 * updates across users. Drops into any task-detail screen as <TaskThread/>.
 */
export function TaskThread({ taskId, locale }: { taskId: string; locale: string }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [hidden, setHidden] = useState(false);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [acking, setAcking] = useState(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="size-4" />
          {txt(locale, { he: "צ'אט ועדכוני משימה", en: "Task chat & updates" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ---- Delivery / acknowledgment receipts ---- */}
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

        {/* ---- Chat ---- */}
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
  );
}
