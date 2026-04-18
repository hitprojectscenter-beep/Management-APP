import { setRequestLocale } from "next-intl/server";
import { RiskDashboard } from "@/components/risks/risk-dashboard";

export default async function RisksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RiskDashboard locale={locale} />;
}
