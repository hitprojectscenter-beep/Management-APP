"use client";

import { Avatar } from "@/components/ui/avatar";
import { txt } from "@/lib/utils/locale-text";
import { useRole } from "@/lib/auth/role-context";
import type { MockUser } from "@/lib/db/mock-data";

/**
 * Client-side greeting that follows the active-user switcher.
 *
 * The dashboard home page is a server component using the static
 * CURRENT_USER_ID constant (u1 = Mark). That means even after the
 * /accept-invite flow switches the active user, the home page's
 * welcome line stayed "שלום, מארק". This component fixes that
 * mismatch: it accepts the server-rendered fallback (so SSR & first
 * paint show *something*), then on hydration takes over with whoever
 * the role context says is currently active.
 *
 * Body content like the task list is still server-rendered against
 * CURRENT_USER_ID — that's a deeper refactor for another time.
 * Fixing the greeting alone removes the most jarring "Hello, Mark"
 * surprise after accepting an invite.
 */
export function ActiveUserGreeting({
  locale,
  fallbackUser,
}: {
  locale: string;
  fallbackUser: MockUser | undefined;
}) {
  const { currentUser } = useRole();
  // Prefer the role-context user (reflects post-accept-invite state).
  // Fall back to the server-rendered user during SSR or before
  // hydration to avoid an empty avatar/name flash.
  const user = currentUser || fallbackUser;
  if (!user) return null;
  const firstName = user.name?.split(" ")[0] || user.name;

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Avatar
        src={user.image}
        fallback={user.name[0]}
        className="size-12 sm:size-14 ring-2 ring-primary/20"
      />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {txt(locale, { he: "שלום", en: "Hello", ru: "Здравствуйте", fr: "Bonjour", es: "Hola" })}, {firstName} 👋
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {txt(locale, {
            he: "כל המשימות שעדיין לא נסגרו - מסודרות לפי דחיפות",
            en: "All tasks that are still open - sorted by urgency",
            ru: "Все незакрытые задачи — по срочности",
            fr: "Toutes les tâches ouvertes — par urgence",
            es: "Todas las tareas abiertas — por urgencia",
          })}
        </p>
      </div>
    </div>
  );
}
