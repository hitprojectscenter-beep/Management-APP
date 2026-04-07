import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, UserPlus, Crown } from "lucide-react";
import { mockUsers, mockTasks } from "@/lib/db/mock-data";
import { ROLE_LABELS } from "@/lib/rbac/abilities";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {locale === "he" ? "צוות" : "Team"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mockUsers.length} {locale === "he" ? "חברי צוות" : "team members"}
          </p>
        </div>
        <Button>
          <UserPlus className="size-4" />
          {locale === "he" ? "הזמן חבר" : "Invite member"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockUsers.map((user) => {
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
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="size-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {ROLE_LABELS[user.role][locale as "he" | "en"]}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-600">{open}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {locale === "he" ? "פתוחות" : "Open"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600">{done}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {locale === "he" ? "הושלמו" : "Done"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
