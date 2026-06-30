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

/** An email attachment (e.g. the onboarding guide PDF). */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * Ops/contact address — ALL correspondence with users routes here: it's the
 * Reply-To on every outgoing email (so user replies land here) and the
 * recipient of the in-app "צור קשר" (Contact us) form. Override via env.
 */
export const OPS_CONTACT_EMAIL = process.env.MAIL_OPS_CONTACT || "pmoplusops@gmail.com";

/** Gmail SMTP via Nodemailer + App Password. Null when not configured. */
async function sendViaGmail(toEmail: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<{ id: string } | null> {
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
    replyTo: OPS_CONTACT_EMAIL,
    subject,
    text: body,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
  return { id: info.messageId };
}

/** Resend fallback. Null when not configured. */
async function sendViaResend(toEmail: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<{ id: string } | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const from = process.env.RESEND_FROM_ADDRESS || "PMO++ <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [toEmail],
      reply_to: OPS_CONTACT_EMAIL,
      subject,
      text: body,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${errText.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string };
}

/** Try Gmail, then Resend. Honest about whether anything actually sent. */
export async function sendEmail(toEmail: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<DeliveryResult> {
  try {
    const gmail = await sendViaGmail(toEmail, subject, body, attachments);
    if (gmail) return { status: "sent", provider: "gmail", messageId: gmail.id };
    const resend = await sendViaResend(toEmail, subject, body, attachments);
    if (resend) return { status: "sent", provider: "resend", messageId: resend.id };
    return { status: "no_transport" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Normalize a phone to bare international digits (Israeli 0NN → 972NN). */
function normalizePhone(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits; // assume it already carries a country code
}

/** Twilio WhatsApp (Messages API). Free trial + sandbox for testing. */
async function sendViaTwilio(to: string, message: string): Promise<DeliveryResult | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886" (sandbox) or your number
  if (!sid || !token || !from) return null;
  const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from.startsWith("+") ? from : "+" + from.replace(/\D/g, "")}`;
  const params = new URLSearchParams({ From: fromAddr, To: `whatsapp:+${to}`, Body: message });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { status: "failed", error: `twilio ${res.status}: ${t.slice(0, 160)}` };
    }
    const data = (await res.json().catch(() => ({}))) as { sid?: string };
    return { status: "sent", messageId: data.sid };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Meta WhatsApp Cloud API. Free tier; business-initiated text needs the 24h
 *  window or an approved template. */
async function sendViaMeta(to: string, message: string): Promise<DeliveryResult | null> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { status: "failed", error: `meta ${res.status}: ${t.slice(0, 160)}` };
    }
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Generic webhook ({ to, message }) — any custom provider. */
async function sendViaWaWebhook(to: string, message: string): Promise<DeliveryResult | null> {
  const webhook = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhook) return null;
  const token = process.env.WHATSAPP_API_TOKEN;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ to, message }),
    });
    if (!res.ok) return { status: "failed", error: `whatsapp ${res.status}` };
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send a WhatsApp message via the first configured provider: Twilio →
 * Meta Cloud API → generic webhook. Returns "no_transport" when none is
 * configured (wa.me deep links remain the manual fallback). Real WhatsApp
 * auto-send requires an approved Business sender — a WhatsApp platform rule.
 */
export async function sendWhatsApp(phone: string, message: string): Promise<DeliveryResult> {
  const to = normalizePhone(phone);
  if (!to) return { status: "no_transport" };
  return (
    (await sendViaTwilio(to, message)) ??
    (await sendViaMeta(to, message)) ??
    (await sendViaWaWebhook(to, message)) ?? { status: "no_transport" }
  );
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
