import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { sendEmail, OPS_CONTACT_EMAIL } from "@/lib/notify/transport";

export const runtime = "nodejs";

/**
 * POST /api/contact — a signed-in user sends a question / improvement
 * suggestion to the PMO ops mailbox (OPS_CONTACT_EMAIL = pmoplusops@gmail.com).
 * Body: { subject?, message }. The user's identity is taken from the session,
 * and Reply-To is the ops mailbox so a reply reaches the user via that inbox.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 150) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (!message) return NextResponse.json({ error: "message_required" }, { status: 400 });

  const mailSubject = `[PMO++ צור קשר] ${subject || "פנייה ממשתמש"} — ${user.name || user.email}`;
  const mailBody = [
    "פנייה חדשה מתוך היישום (צור קשר):",
    "",
    `שם: ${user.name || "—"}`,
    `מייל: ${user.email}`,
    `תפקיד: ${user.title || "—"}`,
    `טלפון: ${user.phone || "—"}`,
    ...(subject ? [`נושא: ${subject}`] : []),
    "",
    "תוכן הפנייה:",
    message,
  ].join("\n");

  const res = await sendEmail(OPS_CONTACT_EMAIL, mailSubject, mailBody);
  if (res.status === "failed") {
    return NextResponse.json({ error: "send_failed", detail: res.error }, { status: 502 });
  }
  // "sent" (prod) or "no_transport" (local dev without mail creds) — both accepted from the user's view.
  return NextResponse.json({ ok: true, delivery: res.status });
}
