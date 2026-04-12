"use client";
import { useRole } from "@/lib/auth/role-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield } from "lucide-react";
import { useLocale } from "next-intl";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { AdminTabs } from "./admin-tabs";
import { mockUsers, mockItemTypes, mockWbsNodes } from "@/lib/db/mock-data";

export function AdminPageClient() {
  const locale = useLocale();
  const isHe = locale === "he";
  const { currentUser, role } = useRole();

  // RBAC guard - only admin can access
  if (role !== "admin") {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">
              {isHe ? "אין הרשאה" : "Access Denied"}
            </h2>
            <p className="text-muted-foreground">
              {isHe
                ? "רק משתמשים בתפקיד 'מנהל מערכת' יכולים לגשת לדף הניהול."
                : "Only users with the 'Administrator' role can access the admin page."}
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              {isHe ? "התפקיד הנוכחי שלך: " : "Your current role: "}
              <Badge variant="outline">{ROLE_LABELS[role]?.[locale] || role}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="size-11 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Shield className="size-6 text-white" />
            </div>
            {isHe ? "ניהול מערכת" : "System Administration"}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {isHe
              ? "ניהול משתמשים, תפקידים, סוגי פריטים, ושיוך פרויקטים לפרוגרמות"
              : "Manage users, roles, item types, and project-to-program assignments"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Shield className="size-3 me-1" />
            {isHe ? "מנהל מערכת" : "Admin"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {currentUser.name}
          </Badge>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">{isHe ? "משתמשים" : "Users"}</div>
            <div className="text-2xl font-bold mt-1">{mockUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">{isHe ? "תפקידים" : "Roles"}</div>
            <div className="text-2xl font-bold mt-1">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">{isHe ? "סוגי פריטים" : "Item Types"}</div>
            <div className="text-2xl font-bold mt-1">{mockItemTypes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">{isHe ? "פרויקטים" : "Projects"}</div>
            <div className="text-2xl font-bold mt-1">
              {mockWbsNodes.filter((n) => n.level === "project").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <AdminTabs locale={locale} />
    </div>
  );
}
