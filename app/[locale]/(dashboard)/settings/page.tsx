import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Globe, Palette, Shield, Bell, Database, Sparkles, Calendar } from "lucide-react";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");

  const sections = [
    {
      icon: Globe,
      title: t("language"),
      description: locale === "he" ? "שפה ואזור" : "Language & region",
      value: locale === "he" ? "עברית (ישראל)" : "English (US)",
    },
    {
      icon: Palette,
      title: t("appearance"),
      description: locale === "he" ? "ערכת נושא ומראה" : "Theme & appearance",
      value: locale === "he" ? "מערכת" : "System",
    },
    {
      icon: Shield,
      title: t("permissions"),
      description: locale === "he" ? "ניהול תפקידים והרשאות" : "Roles & permissions",
      value: "RBAC · CASL",
    },
    {
      icon: Bell,
      title: t("notifications"),
      description: locale === "he" ? "התראות במייל ובאפליקציה" : "Email & in-app notifications",
      value: locale === "he" ? "מופעל" : "Enabled",
    },
    {
      icon: Database,
      title: locale === "he" ? "מסד נתונים" : "Database",
      description: locale === "he" ? "Postgres + Drizzle ORM" : "Postgres + Drizzle ORM",
      value: locale === "he" ? "מצב הדגמה" : "Demo mode",
    },
    {
      icon: Sparkles,
      title: locale === "he" ? "AI" : "AI",
      description: locale === "he" ? "Claude API integration" : "Claude API integration",
      value: locale === "he" ? "מוכן (דורש מפתח)" : "Ready (needs key)",
    },
    {
      icon: Calendar,
      title: locale === "he" ? "Google Calendar" : "Google Calendar",
      description: locale === "he" ? "סנכרון 2-כיווני" : "2-way sync",
      value: locale === "he" ? "מוכן (דורש OAuth)" : "Ready (needs OAuth)",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="size-7" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {locale === "he" ? "נהל את ההעדפות שלך ואת תצורת המערכת" : "Manage preferences and system configuration"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="card-hover cursor-pointer">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{section.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                  <Badge variant="outline" className="mt-2">
                    {section.value}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
