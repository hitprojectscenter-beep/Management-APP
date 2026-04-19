import { setRequestLocale } from "next-intl/server";
import { GuidesClient } from "@/components/guides/guides-client";

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GuidesClient locale={locale} />;
}
