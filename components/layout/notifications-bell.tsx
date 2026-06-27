"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, MessageSquare, UserPlus } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

interface Notif {
  id: string;
  type: string;
  taskId: string | null;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  task_message: MessageSquare,
  task_assigned: UserPlus,
};

/**
 * Topbar notifications bell — real, DB-backed feed with an unread badge.
 * Polls /api/notifications every 20s. Clicking a notification marks it read and
 * deep-links to its task. Renders a plain (inert) bell in mock mode / when not
 * signed in, so the topbar layout is unchanged.
 */
export function NotificationsBell() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setItems(Array.isArray(d.notifications) ? d.notifications : []);
      setUnread(d.unreadCount || 0);
    } catch {
      /* keep prior */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      /* ignore */
    }
  };

  const openNotif = async (n: Notif) => {
    setOpen(false);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
    } catch {
      /* ignore */
    }
    if (n.taskId) router.push(`/tasks/${n.taskId}`);
    load();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="relative min-w-[44px] min-h-[44px]"
        title={txt(locale, { he: "התראות", en: "Notifications" }) as string}
        aria-label={txt(locale, { he: "התראות", en: "Notifications" }) as string}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute top-1 end-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-80 max-w-[92vw] rounded-lg bg-card border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 end-0">
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-semibold">{txt(locale, { he: "התראות", en: "Notifications" })}</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="size-3" />
                  {txt(locale, { he: "סמן הכל כנקרא", en: "Mark all read" })}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {txt(locale, { he: "אין התראות", en: "No notifications" })}
                </div>
              ) : (
                items.map((n) => {
                  const Icon = TYPE_ICON[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotif(n)}
                      className={cn(
                        "w-full text-start px-3 py-2.5 flex gap-2.5 border-b last:border-b-0 transition-colors hover:bg-accent",
                        !n.read && "bg-primary/5",
                      )}
                    >
                      <div className={cn("mt-0.5 shrink-0", n.read ? "text-muted-foreground" : "text-primary")}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs", n.read ? "font-medium" : "font-semibold")}>{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.createdAt, locale)}</div>
                      </div>
                      {!n.read && <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
