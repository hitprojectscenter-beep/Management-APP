import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";

/**
 * Nodemailer needs a Node runtime; the default Edge runtime can't
 * open TCP sockets to Gmail's SMTP servers. Pinning here keeps this
 * route on the Node lambda even if global config changes.
 */
export const runtime = "nodejs";

/**
 * POST /api/team/invite
 *
 * Creates a new team member in the (mock) user store and returns
 * payloads the client can use to open the user's mail/SMS client.
 *
 * Why no real email is sent: the project has no SMTP/Resend/SendGrid
 * credentials configured. Until those exist, the "invite" pipeline has
 * to honestly report "no transport configured" instead of pretending
 * the message went out. The client-side then opens a `mailto:` link so
 * the invite actually reaches the inbox — via the operator's own mail
 * client (Outlook/Gmail/Apple Mail) — instead of vanishing into a
 * silent toast.
 *
 * Server side does:
 *   1. validate the form
 *   2. dedupe on email (avoid creating the same user twice if the
 *      operator hits Send twice or the network glitches)
 *   3. push to mockUsers so the new member shows up in /team, /admin,
 *      and is selectable as an assignee on tasks
 *   4. return { user, emailDeliveryStatus, mailto, sms, whatsapp }
 *      so the client can both (a) tell the user truthfully whether a
 *      message went out and (b) hand them a one-click way to send it.
 */

interface InviteBody {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  division?: string;
  department?: string;
  locale?: string;
}

/**
 * Resolve the canonical public URL of this deployment. Priority:
 *   1. NEXT_PUBLIC_APP_URL — operator-controlled override (set this in
 *      Vercel to a custom domain like https://pmo.mapi.gov.il).
 *   2. VERCEL_URL — auto-injected by Vercel on every deployment as
 *      the *.vercel.app host (without protocol).
 *   3. localhost fallback — only meaningful in dev; if it ever appears
 *      in a production email, the operator forgot to set the env vars.
 *
 * Important: the previous version unconditionally trusted
 * NEXT_PUBLIC_APP_URL even when it pointed at localhost. That meant a
 * Vercel deployment whose local .env.local was checked in with
 * localhost:3000 would mail localhost links to recipients. We now skip
 * any localhost value when VERCEL_URL is available, so production
 * never sends a localhost link by accident.
 */
function getAppBaseUrl(): string {
  const overrideUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const overrideIsLocalhost = overrideUrl ? /localhost|127\.0\.0\.1/.test(overrideUrl) : false;
  if (overrideUrl && !overrideIsLocalhost) return overrideUrl.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;
  if (overrideUrl) return overrideUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * Build the per-invite token that lets /accept-invite reconstruct the
 * invited user even when the in-memory mockUsers array got wiped
 * between the POST that created them and the GET that lands on the
 * accept page. Plain base64-encoded JSON — no signature.
 *
 * Why we encode the WHOLE user record (not just the id): mockUsers is
 * an in-memory module variable. In dev, Fast Refresh resets it on
 * every code change. In Vercel production, every cold-start lambda
 * gets a fresh copy with only the seeded 6 users. Either way, the
 * "u7" pushed by the invite POST is gone by the time the recipient
 * clicks the link. Encoding the full record in the token lets the
 * client rebuild the user purely from the URL — no server state
 * required.
 *
 * Why no signature: mock-mode users are public, mockUsers has no
 * secrets, and there's no way to "log in as someone else" in this
 * demo (the role switcher already exposes all users). When this app
 * moves to real auth + DB, the token should become an HMAC-signed
 * JWT with an expiry and the payload should shrink back to just uid.
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
    iat: Date.now(),
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

function buildInviteMessage(name: string, locale: string, acceptUrl: string): { subject: string; body: string } {
  const inviterName = "מארק ישראל"; // CURRENT_USER until real auth lands
  if (locale === "en") {
    return {
      subject: `You're invited to PMO++ at Mapi`,
      body: `Hi ${name},\n\n${inviterName} invited you to join the PMO++ workspace at the Survey of Israel.\n\nClick to accept the invitation and activate your account:\n${acceptUrl}\n\n—\nMapi PMO++`,
    };
  }
  return {
    subject: `הזמנה לפלטפורמת PMO++ במרכז למיפוי ישראל`,
    body: `שלום ${name},\n\n${inviterName} הזמין אותך להצטרף ליישום PMO++ של המרכז למיפוי ישראל.\n\nלחץ כאן כדי לאשר את ההזמנה ולהיכנס למערכת:\n${acceptUrl}\n\n—\nצוות PMO++ במפ"י`,
  };
}

/**
 * Try to send via Gmail SMTP using Nodemailer + an App Password.
 *
 * Why Gmail SMTP and not Gmail API: SMTP needs only an App Password
 * (no OAuth, no Google Cloud Console project, no consent screen).
 * The operator turns on 2FA, creates a 16-char password at
 * myaccount.google.com/apppasswords, and pastes it into Vercel as
 * GMAIL_APP_PASSWORD. That's it — no domain verification required
 * (the trade-off being that every invite shows the operator's own
 * Gmail as the sender).
 *
 * Returns null when no credentials are configured (so callers can
 * fall through to the next transport), the messageId on success,
 * or throws on real SMTP errors so the caller can surface them.
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
 * Fallback transport: Resend. Returns null if no key is configured,
 * the parsed result on success, or throws on a real Resend error.
 * Kept for operators who later migrate to a verified domain.
 */
async function sendViaResend(toEmail: string, fromAddress: string, subject: string, body: string): Promise<{ id: string } | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject,
      text: body,
    }),
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

  // Dedupe — if the email already exists, return the existing user so
  // the UI can tell the operator "already on the team" instead of
  // silently creating a duplicate.
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

  // Generate a stable id. Real auth will replace this with a UUID from
  // Postgres, but for mock mode "uN" is consistent with the existing
  // catalog (u1..u6).
  const nextNum = mockUsers.length + 1;
  const newUser: MockUser = {
    id: `u${nextNum}`,
    name: fullName,
    email,
    phone,
    title: body.role || undefined,
    image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    locale: locale === "en" ? "en" : "he",
    // New invites default to "member" — admins/managers are promoted
    // explicitly from the admin panel.
    role: "member",
    skills: [],
    performanceScore: 80,
    hourlyCapacity: 40,
  };
  mockUsers.push(newUser);

  // Build the invite acceptance link. The token tells /accept-invite
  // which user the recipient is, so the page can switch the active
  // user to them instead of dropping them into the default u1 session.
  const token = buildInviteToken(newUser);
  const acceptUrl = `${getAppBaseUrl()}/${locale}/accept-invite?token=${token}`;

  // Build the invite message once; we'll either send it via Resend or
  // hand the client mailto/whatsapp links so the operator can send it
  // from their own client.
  const { subject, body: msgBody } = buildInviteMessage(fullName, locale, acceptUrl);

  let emailDeliveryStatus: "sent" | "no_transport" | "failed" = "no_transport";
  let emailError: string | undefined;
  let providerMessageId: string | undefined;
  let provider: "gmail" | "resend" | undefined;

  // Try Gmail SMTP first (the operator's chosen primary transport —
  // no domain verification needed). Fall back to Resend only if Gmail
  // isn't configured. If both throw, we keep the last error and let
  // the client surface the mailto fallback so the message still
  // reaches the recipient.
  try {
    const gmailResult = await sendViaGmail(email, subject, msgBody);
    if (gmailResult) {
      emailDeliveryStatus = "sent";
      providerMessageId = gmailResult.id;
      provider = "gmail";
    } else {
      // Gmail not configured → try Resend.
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

  // Always return mailto + whatsapp + sms URIs so the client can hand
  // the operator a one-click "open my mail client" fallback even when
  // server-side delivery succeeded (some teams want both).
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msgBody)}`;
  const phoneDigits = phone.replace(/\D/g, "");
  // WhatsApp expects E.164 without +. Assume Israel (+972) for local
  // numbers starting with 0; otherwise pass digits through.
  const waNumber = phoneDigits.startsWith("0")
    ? "972" + phoneDigits.slice(1)
    : phoneDigits;
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
