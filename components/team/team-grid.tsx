"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { mockTasks, type MockUser } from "@/lib/db/mock-data";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { txt, COMMON_LABELS } from "@/lib/utils/locale-text";

/**
 * Renders the team-page user grid on the client so that invited users
 * (stored in localStorage by /accept-invite, not in server-rendered
 * mockUsers) show up alongside the seeded members.
 *
 * Why this isn't in the server component: the server doesn't see
 * localStorage and the in-memory mockUsers push from /api/team/invite
 * doesn't survive cold starts. Until the app moves to a real DB, the
 * localStorage payload is the only thing that persists invited users
 * across page loads in the recipient's session.
 */
export function TeamGrid({
  initialUsers,
  locale,
}: {
  initialUsers: MockUser[];
  locale: string;
}) {
  const [users, setUsers] = useState<MockUser[]>(initialUsers);

  useEffect(() => {
    try {
      const payloadRaw = window.localStorage.getItem("pmo_invited_user_payload");
      if (!payloadRaw) return;
      const payload = JSON.parse(payloadRaw) as MockUser;
      if (!payload?.id) return;
      // Dedupe — server may already include the user once we ship a
      // real persistence layer, in which case we don't want to render
      // them twice.
      if (initialUsers.some((u) => u.id === payload.id)) return;
      setUsers([...initialUsers, payload]);
    } catch {
      // Quietly ignore — falling back to server-rendered list is fine.
    }
  }, [initialUsers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => {
        const userTasks = mockTasks.filter((t) => t.assigneeId === user.id);
        const open = userTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
        const done = userTasks.filter((t) => t.status === "done").length;
        return (
          <Card key={user.id} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Avatar src={user.image} fallback={user.name[0]} className="size-14" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{user.name}</h3>
                    {user.role === "admin" && <Crown className="size-3.5 text-amber-500" />}
                  </div>
                  {user.title && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.title}</p>
                  )}
                  {user.phone && (
                    <a
                      href={`tel:${user.phone.replace(/[^\d+]/g, "")}`}
                      className="text-xs text-primary mt-1 inline-block hover:underline"
                      dir="ltr"
                    >
                      {user.phone}
                    </a>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {ROLE_LABELS[user.role]?.[locale as keyof (typeof ROLE_LABELS)[typeof user.role]] || user.role}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t text-center">
                <div>
                  <div className="text-xl font-bold text-blue-600">{open}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {txt(locale, COMMON_LABELS.open)}
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-emerald-600">{done}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {txt(locale, COMMON_LABELS.done)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
