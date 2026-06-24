import { NextResponse } from "next/server";
import { sendEmail, buildMailto, buildWhatsApp, getAppBaseUrl, type DeliveryStatus } from "@/lib/notify/transport";

/** Nodemailer needs the Node runtime (TCP sockets to Gmail). */
export const runtime = "nodejs";

/**
 * POST /api/tasks/notify
 *
 * Notify the people assigned to a task. Sends an email per assignee via
 * Gmail SMTP / Resend when configured; always returns mailto + WhatsApp
 * links so the client can offer a manual fallback when no transport is
 * set up. (Bug fix: assigning a member previously sent nothing.)
 */

interface Assignee {
  name?: string;
  email?: string;
  phone?: string;
}

interface NotifyBody {
  taskTitle?: string;
  taskDescription?: string;
  plannedStart?: string;
  plannedEnd?: string;
  assignees?: Assignee[];
  locale?: string;
}

function buildMessage(
  name: string,
  task: { title: string; description?: string; start?: string; end?: string },
  locale: string,
  appUrl: string,
): { subject: string; body: string } {
  const window = task.start && task.end ? `${task.start} → ${task.end}` : task.start || "";
  if (locale === "en") {
    return {
      subject: `New task assigned: ${task.title}`,
      body:
        `Hi ${name},\n\nYou've been assigned to a task in PMO++ (Survey of Israel):\n\n` +
        `• Task: ${task.title}\n` +
        (window ? `• Dates: ${window}\n` : "") +
        (task.description ? `• Details: ${task.description}\n` : "") +
        `\nOpen the app:\n${appUrl}\n\n—\nMapi PMO++`,
    };
  }
  return {
    subject: `שויכת למשימה חדשה: ${task.title}`,
    body:
      `שלום ${name},\n\nשויכת למשימה ביישום PMO++ (המרכז למיפוי ישראל):\n\n` +
      `• משימה: ${task.title}\n` +
      (window ? `• תאריכים: ${window}\n` : "") +
      (task.description ? `• פרטים: ${task.description}\n` : "") +
      `\nכניסה ליישום:\n${appUrl}\n\n—\nצוות PMO++ במפ"י`,
  };
}

export async function POST(req: Request) {
  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "he";
  const taskTitle = body.taskTitle?.trim();
  if (!taskTitle) return NextResponse.json({ error: "taskTitle required" }, { status: 400 });

  const assignees = (body.assignees || []).filter((a) => a && (a.email || a.phone));
  if (assignees.length === 0) {
    return NextResponse.json({ ok: true, results: [], note: "no assignees with contact info" });
  }

  const appUrl = getAppBaseUrl();
  const taskMeta = { title: taskTitle, description: body.taskDescription, start: body.plannedStart, end: body.plannedEnd };

  const results = await Promise.all(
    assignees.map(async (a) => {
      const name = a.name || (locale === "en" ? "there" : "");
      const { subject, body: msg } = buildMessage(name, taskMeta, locale, appUrl);
      let status: DeliveryStatus = "no_transport";
      let error: string | undefined;
      if (a.email) {
        const r = await sendEmail(a.email, subject, msg);
        status = r.status;
        error = r.error;
      }
      const mailto = a.email ? buildMailto(a.email, subject, msg) : undefined;
      const whatsapp = a.phone ? buildWhatsApp(a.phone, `${subject}\n\n${msg}`) : undefined;
      return { name: a.name, email: a.email, phone: a.phone, emailDeliveryStatus: status, error, mailto, whatsapp };
    }),
  );

  // Aggregate fallbacks: one mailto to all emails, WhatsApp to the first
  // assignee with a phone — so the client can offer a single click.
  const allEmails = assignees.map((a) => a.email).filter((e): e is string => !!e);
  const { subject: aggSubject, body: aggBody } = buildMessage(
    locale === "en" ? "team" : "צוות",
    taskMeta,
    locale,
    appUrl,
  );
  const mailtoAll = allEmails.length ? buildMailto(allEmails, aggSubject, aggBody) : undefined;
  const firstPhone = assignees.find((a) => a.phone)?.phone;
  const whatsappFirst = firstPhone ? buildWhatsApp(firstPhone, `${aggSubject}\n\n${aggBody}`) : undefined;

  return NextResponse.json({ ok: true, results, mailtoAll, whatsappFirst });
}
