"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, ShieldCheck, Tag, GitBranch, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { UsersManager } from "./users-manager";
import { RolesManager } from "./roles-manager";
import { TypesManager } from "./types-manager";
import { HierarchyManager } from "./hierarchy-manager";
import { UserPermissionsTable } from "./user-permissions-table";

type Tab = "users" | "roles" | "types" | "hierarchy" | "permissions";

export function AdminTabs({ locale }: { locale: string }) {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { key: Tab; labelHe: string; labelEn: string; icon: typeof Users; descHe: string; descEn: string }[] = [
    {
      key: "users", labelHe: "משתמשים", labelEn: "Users", icon: Users,
      descHe: "ניהול משתמשים - הוספה, עריכה, השעיה",
      descEn: "Manage users - add, edit, suspend",
    },
    {
      key: "roles", labelHe: "תפקידים והרשאות", labelEn: "Roles & Permissions", icon: ShieldCheck,
      descHe: "הגדרת תפקידים ומטריצת הרשאות",
      descEn: "Define roles and permissions matrix",
    },
    {
      key: "types", labelHe: "סוגי משימות ופרויקטים", labelEn: "Task & Project Types", icon: Tag,
      descHe: "סיווגים מותאמים לסוגי פריטים",
      descEn: "Custom categories for items",
    },
    {
      key: "hierarchy", labelHe: "שיוך היררכי", labelEn: "Hierarchy Assignment", icon: GitBranch,
      descHe: "שיוך פרויקטים ומשימות לפרוגרמה",
      descEn: "Assign projects and tasks to programs",
    },
    {
      key: "permissions", labelHe: "טבלת הרשאות", labelEn: "Permissions Table", icon: Table2,
      descHe: "מטריצת הרשאות בפועל לכל משתמש במערכת",
      descEn: "Actual permissions matrix for every user",
    },
  ];

  return (
    <Card>
      {/* Tab navigation */}
      <div className="border-b flex overflow-x-auto scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              <Icon className="size-4" />
              {txt(locale, { he: t.labelHe, en: t.labelEn })}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <div className="px-6 pt-4 pb-2 border-b bg-muted/20">
        <div className="text-xs text-muted-foreground">
          {(() => { const found = tabs.find((t) => t.key === tab); return found ? txt(locale, { he: found.descHe, en: found.descEn }) : ""; })()}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {tab === "users" && <UsersManager locale={locale} />}
        {tab === "roles" && <RolesManager locale={locale} />}
        {tab === "types" && <TypesManager locale={locale} />}
        {tab === "hierarchy" && <HierarchyManager locale={locale} />}
        {tab === "permissions" && <UserPermissionsTable locale={locale} />}
      </div>
    </Card>
  );
}
