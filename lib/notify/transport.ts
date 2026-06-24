/**
 * Shared notification transport — Gmail SMTP (primary) with Resend
 * fallback, plus mailto/WhatsApp/SMS link builders. Used by the team-
 * invite and task-assignment notification routes so both behave the
 * same way and there's one place to wire real delivery.
 *
 * Node runtime only (Nodemailer opens TCP sockets to Gmail).
 */

import nodemailer from "nodemailer";

export type DeliveryStatus = "sent" | "no_transport" | "failed";

export interface DeliveryResult {
  status: DeliveryStatus;
  provider?: "gmail" | "resend";
  messageId?: string;
  error?: string;
}

/** Gmail SMTP via Nodemailer + App Password. Null when not configured. */
async function sendViaGmail(toEmail: string, subject: string, body: string): Promise<{ id: string } | null> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  const info = await transporter.sendMail({
    from: `"PMO++ — מפ\"י" <${user}>`,
    to: toEmail,
    subject,
    text: body,
  });
  return { id: info.messageId };
}

/** Resend fallback. Null when not configured. */
async function sendViaResend(toEmail: string, subject: string, body: string): Promise<{ id: string } | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const from = process.env.RESEND_FROM_ADDRESS || "PMO++ <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [toEmail], subject, text: body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${errText.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string };
}

/** Try Gmail, then Resend. Honest about whether anything actually sent. */
export async function sendEmail(toEmail: string, subject: string, body: string): Promise<DeliveryResult> {
  try {
    const gmail = await sendViaGmail(toEmail, subject, body);
    if (gmail) return { status: "sent", provider: "gmail", messageId: gmail.id };
    const resend = await sendViaResend(toEmail, subject, body);
    if (resend) return { status: "sent", provider: "resend", messageId: resend.id };
    return { status: "no_transport" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** mailto: link to one or many recipients. */
export function buildMailto(emails: string | string[], subject: string, body: string): string {
  const to = Array.isArray(emails) ? emails.join(",") : emails;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** WhatsApp deep link. Israeli local numbers (leading 0) → +972. */
export function buildWhatsApp(phone: string, message: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const waNumber = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

/** sms: link (first few lines of the message). */
export function buildSms(phone: string, message: string): string {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

/** Resolve the public app URL (custom domain → production → preview → dev). */
export function getAppBaseUrl(): string {
  const overrideUrl = process.env.NEXT_PUBLIC_APP_URL;
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const deploymentUrl = process.env.VERCEL_URL;
  const overrideIsLocalhost = overrideUrl ? /localhost|127\.0\.0\.1/.test(overrideUrl) : false;
  if (overrideUrl && !overrideIsLocalhost) return overrideUrl.replace(/\/$/, "");
  if (productionUrl) return `https://${productionUrl}`;
  if (deploymentUrl) return `https://${deploymentUrl}`;
  if (overrideUrl) return overrideUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}
