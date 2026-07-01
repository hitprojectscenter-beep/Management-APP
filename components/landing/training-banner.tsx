import { Link } from "@/lib/i18n/routing";
import { GraduationCap, PlayCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { txt } from "@/lib/utils/locale-text";

/**
 * Prominent entry point to the training center (מרכז הדרכה), placed high on the
 * home page so every user can find the voice-narrated walkthrough of the system.
 */
export function TrainingBanner({ locale }: { locale: string }) {
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href="/training"
      className="group block rounded-2xl overflow-hidden border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 text-white shadow-card hover:shadow-pop transition-all hover:-translate-y-0.5"
    >
      <div className="relative p-5 sm:p-6 flex items-center gap-4">
        {/* soft decorative glow */}
        <div className="pointer-events-none absolute -top-8 -start-8 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative shrink-0 inline-flex items-center justify-center size-14 sm:size-16 rounded-2xl bg-white/15 ring-1 ring-white/30">
          <GraduationCap className="size-7 sm:size-8" />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/80">
            <PlayCircle className="size-3.5" />
            {txt(locale, { he: "חדש · הדרכה קולית", en: "New · Voice-guided", ru: "Новое · Аудиогид", fr: "Nouveau · Guide vocal", es: "Nuevo · Guía por voz" })}
          </div>
          <h2 className="text-lg sm:text-xl font-bold mt-0.5">
            {txt(locale, { he: "מרכז הדרכה — לומדים את המערכת", en: "Training Center — learn the system", ru: "Центр обучения", fr: "Centre de formation", es: "Centro de formación" })}
          </h2>
          <p className="text-sm text-white/85 mt-0.5 line-clamp-2">
            {txt(locale, {
              he: "סדרת הדרכות מונחית־קול על כל יכולות המערכת וההיגיון שמאחוריהן — משימות, פרויקטים, דוחות, הרשאות ועוד. אפשר לצפות, להשהות ולעבור בין הנושאים.",
              en: "A voice-guided series covering every capability and the logic behind it — tasks, projects, reports, permissions and more.",
              ru: "Аудиокурс по всем возможностям системы.",
              fr: "Une série guidée par la voix couvrant toutes les fonctionnalités.",
              es: "Una serie guiada por voz que cubre todas las funciones.",
            })}
          </p>
        </div>
        <div className="relative shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/30 px-4 py-2 text-sm font-semibold group-hover:bg-white/25 transition-colors">
          {txt(locale, { he: "כניסה למרכז", en: "Open center", ru: "Открыть", fr: "Ouvrir", es: "Abrir" })}
          <Arrow className="size-4 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
