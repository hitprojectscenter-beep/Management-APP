"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Search, Sparkles, ArrowRight } from "lucide-react";
import { USER_GUIDES, type UserGuide } from "@/lib/guides/user-guides";
import { txt } from "@/lib/utils/locale-text";
import { cn } from "@/lib/utils";

export function GuidesClient({ locale }: { locale: string }) {
  const [selected, setSelected] = useState<UserGuide | null>(null);
  const [search, setSearch] = useState("");
  const isRtl = locale === "he";

  const filtered = USER_GUIDES.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (g.title[locale] || g.title.en).toLowerCase().includes(q) ||
      (g.summary[locale] || g.summary.en).toLowerCase().includes(q)
    );
  });

  const categoryLabels: Record<string, Record<string, string>> = {
    "getting-started": { he: "התחלה מהירה", en: "Getting Started", ru: "Начало", fr: "Démarrage", es: "Inicio" },
    tasks:             { he: "משימות",       en: "Tasks",            ru: "Задачи",  fr: "Tâches",    es: "Tareas" },
    projects:          { he: "פרויקטים",     en: "Projects",         ru: "Проекты", fr: "Projets",   es: "Proyectos" },
    risks:             { he: "סיכונים",      en: "Risks",            ru: "Риски",   fr: "Risques",   es: "Riesgos" },
    gantt:             { he: "גאנט",         en: "Gantt",            ru: "Ганта",   fr: "Gantt",     es: "Gantt" },
    admin:             { he: "ניהול",        en: "Admin",            ru: "Админ",   fr: "Admin",     es: "Admin" },
    ai:                { he: "AI",           en: "AI",               ru: "ИИ",      fr: "IA",        es: "IA" },
  };

  const categoryColors: Record<string, string> = {
    "getting-started": "bg-gradient-to-br from-blue-500 to-indigo-600",
    tasks:             "bg-gradient-to-br from-emerald-500 to-teal-600",
    projects:          "bg-gradient-to-br from-purple-500 to-fuchsia-600",
    risks:             "bg-gradient-to-br from-red-500 to-rose-600",
    gantt:             "bg-gradient-to-br from-amber-500 to-orange-600",
    admin:             "bg-gradient-to-br from-slate-500 to-slate-700",
    ai:                "bg-gradient-to-br from-violet-500 to-purple-600",
  };

  if (selected) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => setSelected(null)} className="min-h-[44px]">
          {isRtl ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {txt(locale, { he: "חזרה למדריכים", en: "Back to guides", ru: "К руководствам", fr: "Retour", es: "Volver" })}
        </Button>

        <Card className="overflow-hidden">
          <div className={cn("h-2", categoryColors[selected.category])} />
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("size-14 rounded-xl flex items-center justify-center text-3xl shadow-lg", categoryColors[selected.category])}>
                {selected.icon}
              </div>
              <div>
                <Badge variant="outline" className="mb-1">{categoryLabels[selected.category]?.[locale] || selected.category}</Badge>
                <h1 className="text-2xl sm:text-3xl font-bold">{selected.title[locale] || selected.title.en}</h1>
              </div>
            </div>
            <p className="text-muted-foreground mt-2">{selected.summary[locale] || selected.summary.en}</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selected.steps.map((step, idx) => (
            <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2">{step.title[locale] || step.title.en}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {step.body[locale] || step.body.en}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Related actions */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 text-indigo-600" />
              <span className="font-semibold text-sm">{txt(locale, { he: "צריך עזרה נוספת?", en: "Need more help?", ru: "Нужна помощь?", fr: "Besoin d'aide ?", es: "¿Ayuda?" })}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {txt(locale, {
                he: "שאל את העוזר האישי ✨ (כפתור סגול) או את בוט העזרה ❓ (ירוק) — שניהם מכירים את המדריכים האלה ויכולים לענות על שאלות ספציפיות.",
                en: "Ask the Personal Assistant ✨ (purple button) or the Help Bot ❓ (green) — both know these guides and can answer specific questions.",
                ru: "Спросите Личного помощника ✨ или Бота помощи ❓.",
                fr: "Demandez à l'Assistant ✨ ou au Bot d'aide ❓.",
                es: "Pregunta al Asistente ✨ o al Bot ❓.",
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <BookOpen className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {txt(locale, { he: "מדריכי משתמש", en: "User Guides", ru: "Руководства", fr: "Guides", es: "Guías" })}
          </h1>
          <p className="text-muted-foreground">
            {txt(locale, { he: "מדריכי הפעלה מלאים ל-PMO++ ב-5 שפות", en: "Complete PMO++ guides in 5 languages", ru: "Руководства PMO++ на 5 языках", fr: "Guides PMO++ en 5 langues", es: "Guías PMO++ en 5 idiomas" })}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={txt(locale, { he: "חיפוש במדריכים...", en: "Search guides...", ru: "Поиск...", fr: "Rechercher...", es: "Buscar..." })}
          className="w-full ps-10 pe-3 py-2 min-h-[44px] rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Guides grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((guide) => (
          <button
            key={guide.id}
            onClick={() => setSelected(guide)}
            className="text-start"
          >
            <Card className="h-full overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
              <div className={cn("h-1.5", categoryColors[guide.category])} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("size-12 rounded-xl flex items-center justify-center text-2xl shadow-md", categoryColors[guide.category])}>
                    {guide.icon}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {categoryLabels[guide.category]?.[locale] || guide.category}
                  </Badge>
                </div>
                <h3 className="font-bold text-base mb-1">{guide.title[locale] || guide.title.en}</h3>
                <p className="text-xs text-muted-foreground mb-3">{guide.summary[locale] || guide.summary.en}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {guide.steps.length} {txt(locale, { he: "שלבים", en: "steps", ru: "шагов", fr: "étapes", es: "pasos" })}
                  </span>
                  <span className="flex items-center gap-1 text-primary font-semibold group-hover:gap-2 transition-all">
                    {txt(locale, { he: "פתח", en: "Open", ru: "Открыть", fr: "Ouvrir", es: "Abrir" })}
                    {isRtl ? <ChevronLeft className="size-3.5" /> : <ArrowRight className="size-3.5" />}
                  </span>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {txt(locale, { he: "לא נמצאו מדריכים", en: "No guides found", ru: "Не найдено", fr: "Aucun guide", es: "Sin resultados" })}
        </div>
      )}
    </div>
  );
}
