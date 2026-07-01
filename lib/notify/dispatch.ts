/**
 * Central notification dispatch (server-only). Given a set of recipient user
 * ids, writes an in-app bell notification for each AND sends email (Gmail SMTP)
 * + WhatsApp (provider webhook) to those with contact details. Best-effort:
 * never throws, so a notification failure can't break the triggering action.
 */

import "server-only";
import { inArray, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createNotifications } from "@/lib/db/notifications-repo";
import { sendEmail, sendWhatsApp, getAppBaseUrl } from "./transport";

export interface DispatchInput {
  /** Recipients (the caller should already have excluded the actor). */
  recipientIds: string[];
  type: string; // task_message | task_assigned | ...
  taskId?: string;
  title: string; // bell title + email subject
  body?: string; // bell body + email/WhatsApp body
  actorId?: string;
  locale?: string;
  /** Only write the in-app bell — skip email + WhatsApp (e.g. when those were
   *  already sent by another path, like the assignment dialog). */
  bellOnly?: boolean;
}

export async function dispatchToUsers(input: DispatchInput): Promise<void> {
  const ids = [...new Set(input.recipientIds.filter(Boolean))];
  if (ids.length === 0) return;

  // 1) In-app bell — always (the reliable channel).
  try {
    await createNotifications(
      ids.map((uid) => ({
        userId: uid,
        type: input.type,
        taskId: input.taskId ?? null,
        title: input.title,
        body: input.body ?? null,
        actorId: input.actorId ?? null,
      })),
    );
  } catch {
    /* best-effort */
  }

  // Kill-switch: NOTIFY_DISABLED=1 keeps the in-app bell but skips outbound
  // email/WhatsApp (maintenance windows, staging, and safe test runs).
  const externalDisabled = process.env.NOTIFY_DISABLED === "1" || process.env.NOTIFY_DISABLED === "true";
  if (input.bellOnly || externalDisabled) return;

  // 2) Email + WhatsApp — resolve contact details from the users table.
  let contacts: { id: string; email: string | null; phone: string | null }[] = [];
  try {
    contacts = await getDb()
      .select({ id: users.id, email: users.email, phone: users.phone })
      .from(users)
      .where(inArray(users.id, ids));
  } catch {
    contacts = [];
  }

  const appUrl = getAppBaseUrl();
  const locale = input.locale === "en" ? "en" : "he";
  const link = input.taskId ? `${appUrl}/${locale}/tasks/${encodeURIComponent(input.taskId)}` : appUrl;
  const openLine = locale === "en" ? "Open in the app:" : "פתח/י ביישום:";
  const signature = locale === "en" ? "—\nPMO++ (Survey of Israel)" : '—\nPMO++ מפ"י';

  // Resolve the actor's (sender's) name so the email states who triggered it,
  // in addition to the existing content.
  let actorName = "";
  if (input.actorId) {
    try {
      const a = await getDb().select({ name: users.name }).from(users).where(eq(users.id, input.actorId)).limit(1);
      actorName = a[0]?.name || "";
    } catch {
      /* best-effort */
    }
  }
  const fromLine = actorName ? (locale === "en" ? `From: ${actorName}\n\n` : `מאת: ${actorName}\n\n`) : "";
  const text = `${fromLine}${input.body ? input.body + "\n\n" : ""}${openLine}\n${link}\n\n${signature}`;

  await Promise.all(
    contacts.map(async (c) => {
      if (c.email) {
        try {
          await sendEmail(c.email, input.title, text);
        } catch {
          /* best-effort */
        }
      }
      if (c.phone) {
        try {
          await sendWhatsApp(c.phone, `${input.title}\n${input.body || ""}\n${link}`);
        } catch {
          /* best-effort */
        }
      }
    }),
  );
}
