import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { mockUsers } from "@/lib/db/mock-data";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { TeamGrid } from "@/components/team/team-grid";
import { txt, COMMON_LABELS } from "@/lib/utils/locale-text";
import { RoleGate } from "@/components/auth/role-gate";

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
            {txt(locale, COMMON_LABELS.team)}
          </h1>
          {/* Count is rendered inside <TeamGrid> so it stays in sync with
              members added live in this session (no refresh). */}
        </div>
        <RoleGate permission="manage_team">
          <InviteMemberDialog locale={locale}>
            <Button className="min-h-[44px]">
              <UserPlus className="size-4" />
              {txt(locale, COMMON_LABELS.invite)}
            </Button>
          </InviteMemberDialog>
        </RoleGate>
      </div>

      <TeamGrid initialUsers={mockUsers} locale={locale} />
    </div>
  );
}
