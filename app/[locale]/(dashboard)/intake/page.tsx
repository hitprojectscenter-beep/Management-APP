import { setRequestLocale } from "next-intl/server";
import { IntakeWorkflow } from "@/components/intake/intake-workflow";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {locale === "he" ? "מרכז ייבוא משימות" : "Task Intake Center"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {locale === "he"
            ? "העלה קובץ, הדבק טקסט, או צרף הקלטת שמע — ה-AI יחלץ את כל המשימות שמופיעות במקור, ויציע אחראי, תאריך יעד והערכת מאמץ לכל אחת."
            : "Upload a document, paste text, or attach an audio recording — AI extracts every task with suggested assignee, deadline, and effort estimate."}
        </p>
      </div>

      <IntakeWorkflow />
    </div>
  );
}
