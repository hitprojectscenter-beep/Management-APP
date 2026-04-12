import { setRequestLocale } from "next-intl/server";
import { AdminPageClient } from "@/components/admin/admin-guard";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPageClient />;
}
