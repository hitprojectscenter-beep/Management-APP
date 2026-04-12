import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { HelpProvider } from "@/components/help/help-provider";
import { WelcomeTour } from "@/components/help/welcome-tour";
import { HelpBot } from "@/components/help/help-bot";
import { HelpFloatingButton } from "@/components/help/help-trigger";
import { PersonalAssistant } from "@/components/assistant/personal-assistant";
import { RoleProvider } from "@/lib/auth/role-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
    <HelpProvider>
      <div className="min-h-screen flex bg-muted/20">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <WelcomeTour />
      <HelpBot />
      <HelpFloatingButton />
      <PersonalAssistant />
    </HelpProvider>
    </RoleProvider>
  );
}
