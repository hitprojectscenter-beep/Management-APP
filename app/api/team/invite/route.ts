import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";

/**
 * Nodemailer needs a Node runtime; the default Edge runtime can't
 * open TCP sockets to Gmail's SMTP servers.
 */
export const runtime = "nodejs";

/**
 * POST /api/team/invite
 *
 * Demo-mode user creation.
 *
 * The "invite" is really just a team-member create + an optional
 * notification email. There's no real authentication system here, so
 * we deliberately do NOT generate an activation token or a magic
 * acceptance link. The member exists the moment this endpoint returns.
 *
 * What the server does:
 *   1. validate the form
 *   2. dedupe on email
 *   3. push to mockUsers so the new member shows up in /team, /admin,
 *      and is selectable as an assignee on tasks
 *   4. compose a short "you've been added" notice
 *   5. optionally deliver it via Gmail SMTP (or Resend) if credentials
 *      are present; otherwise return mailto + WhatsApp URLs so the
 *      operator can send a notification from their own client
 *
 * What we removed (intentionally):
 *   • The base64-encoded user-payload token. There's nothing for the
 *     recipient to "accept" — they're already a member.
 *   • The /accept-invite landing page. With no auth there's no
 *     activation step.
 *   • Any URL that points back into the app from the email. The
 *     notification just says "you've been added; here's the link to
 *     the app" — links go to the production root, no special path,
 *     so the recipient never hits Vercel preview-protection.
 */

interface InviteBody {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  division?: string;
  department?: string;
  managerId?: string;
  locale?: string;
}

/**
 * Resolve the canonical public URL of this deployment. Priority:
 *   1. NEXT_PUBLIC_APP_URL — operator-controlled override (set this in
 *      Vercel to a custom domain like https://pmo.mapi.gov.il).
 *   2. VERCEL_PROJECT_PRODUCTION_URL — auto-injected by Vercel, points
 *      at the stable production *.vercel.app domain. Public.
 *   3. VERCEL_URL — per-deployment URL with a random hash. Protected
 *      by Vercel Auth on previews, but correct on preview branches
 *      where the operator is just testing locally.
 *   4. localhost fallback — dev only.
 */
function getAppBaseUrl(): string {
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

/**
 * Encode the member into a base64url token carried on the app-root URL
 * (`/he?invite=<token>`). When the recipient opens that link the client
 * decodes it, adds the member to its in-memory store, and switches the
 * active user to them — so they "log in" as themselves instead of
 * landing as the default user (u1 = Mark).
 *
 * Why the whole record, not just an id: mockUsers is in-memory and is
 * wiped on every Vercel cold start, so by the time the link is clicked
 * the server no longer has the member. The token carries everything the
 * client needs to reconstruct them. No signature — there are no secrets
 * in mock mode and the role switcher already exposes every user. Real
 * auth would replace this with a signed, expiring JWT.
 */
function buildInviteToken(user: MockUser): string {
  const payload = JSON.stringify({
    uid: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    title: user.title,
    image: user.image,
    locale: user.locale,
    role: user.role,
    managerId: user.managerId,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

function buildInviteMessage(name: string, locale: string, appUrl: string): { subject: string; body: string } {
  const inviterName = "מארק ישראל"; // CURRENT_USER until real auth lands
  if (locale === "en") {
    return {
      subject: `You've been added to PMO++ at Mapi`,
      body: `Hi ${name},\n\n${inviterName} added you to the PMO++ workspace at the Survey of Israel. Your account is active.\n\nClick to open the app as yourself:\n${appUrl}\n\n—\nMapi PMO++`,
    };
  }
  return {
    subject: `נוספת לפלטפורמת PMO++ במרכז למיפוי ישראל`,
    body: `שלום ${name},\n\n${inviterName} הוסיף אותך ליישום PMO++ של המרכז למיפוי ישראל. החשבון שלך פעיל.\n\nלחץ כדי להיכנס ליישום בזהותך:\n${appUrl}\n\n—\nצוות PMO++ במפ"י`,
  };
}

/**
 * Try to send via Gmail SMTP using Nodemailer + an App Password.
 * Returns null when no credentials are configured, the messageId on
 * success, or throws on real SMTP errors.
 */
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

/**
 * Fallback transport: Resend. Returns null if no key is configured.
 * Kept for operators who later migrate to a verified domain.
 */
async function sendViaResend(toEmail: string, fromAddress: string, subject: string, body: string): Promise<{ id: string } | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress, to: [toEmail], subject, text: body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${errText.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string };
}

export async function POST(req: Request) {
  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.fullName?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const locale = body.locale === "en" ? "en" : "he";

  if (!fullName) return NextResponse.json({ error: "fullName required" }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  // Dedupe on email — if the member already exists, return them so the
  // UI can tell the operator "already on the team" instead of creating
  // a silent duplicate.
  const existing = mockUsers.find((u) => u.email.toLowerCase() === email);
  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      duplicate: true,
      user: existing,
      message: locale === "en"
        ? `${existing.name} is already a member.`
        : `${existing.name} כבר רשום ביישום.`,
    });
  }

  const nextNum = mockUsers.length + 1;
  const newUser: MockUser = {
    id: `u${nextNum}`,
    name: fullName,
    email,
    phone,
    title: body.role || undefined,
    image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    locale: locale === "en" ? "en" : "he",
    role: "member",
    // Direct manager (org hierarchy) — only keep a valid, known id.
    managerId: body.managerId && mockUsers.some((u) => u.id === body.managerId)
      ? body.managerId
      : undefined,
    skills: [],
    performanceScore: 80,
    hourlyCapacity: 40,
  };
  mockUsers.push(newUser);

  // Notification: a message pointing at the app root WITH an ?invite=
  // token so the recipient enters as themselves. Root path (not a
  // dedicated page) keeps it off Vercel preview-protection and needs no
  // Suspense boundary.
  const inviteToken = buildInviteToken(newUser);
  const appUrl = `${getAppBaseUrl()}/${locale}?invite=${inviteToken}`;
  const { subject, body: msgBody } = buildInviteMessage(fullName, locale, appUrl);

  let emailDeliveryStatus: "sent" | "no_transport" | "failed" = "no_transport";
  let emailError: string | undefined;
  let providerMessageId: string | undefined;
  let provider: "gmail" | "resend" | undefined;

  try {
    const gmailResult = await sendViaGmail(email, subject, msgBody);
    if (gmailResult) {
      emailDeliveryStatus = "sent";
      providerMessageId = gmailResult.id;
      provider = "gmail";
    } else {
      const resendResult = await sendViaResend(
        email,
        process.env.RESEND_FROM_ADDRESS || "PMO++ <onboarding@resend.dev>",
        subject,
        msgBody,
      );
      if (resendResult) {
        emailDeliveryStatus = "sent";
        providerMessageId = resendResult.id;
        provider = "resend";
      }
    }
  } catch (err) {
    emailDeliveryStatus = "failed";
    emailError = err instanceof Error ? err.message : String(err);
    console.warn("[invite] email delivery failed:", emailError);
  }

  // mailto + WhatsApp + sms — always returned, so even when the server
  // sent the email itself the operator can still ping the new member
  // through another channel without composing a new message.
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msgBody)}`;
  const phoneDigits = phone.replace(/\D/g, "");
  const waNumber = phoneDigits.startsWith("0") ? "972" + phoneDigits.slice(1) : phoneDigits;
  const whatsapp = `https://wa.me/${waNumber}?text=${encodeURIComponent(`${subject}\n\n${msgBody}`)}`;
  const sms = `sms:${phone}?body=${encodeURIComponent(`${subject} — ${msgBody.split("\n").slice(0, 3).join(" ")}`)}`;

  return NextResponse.json({
    ok: true,
    created: true,
    user: newUser,
    emailDeliveryStatus,
    emailError,
    provider,
    providerMessageId,
    mailto,
    whatsapp,
    sms,
  });
}
