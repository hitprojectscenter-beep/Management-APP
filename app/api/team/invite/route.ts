import { NextResponse } from "next/server";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";

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

function buildInviteMessage(name: string, locale: string): { subject: string; body: string } {
  const inviterName = "מארק ישראל"; // CURRENT_USER until real auth lands
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pmo.example.com";
  if (locale === "en") {
    return {
      subject: `You're invited to PMO++ at Mapi`,
      body: `Hi ${name},\n\n${inviterName} invited you to join the PMO++ workspace at the Survey of Israel.\n\nClick to accept the invitation and set your password:\n${appUrl}\n\n—\nMapi PMO++`,
    };
  }
  return {
    subject: `הזמנה לפלטפורמת PMO++ במרכז למיפוי ישראל`,
    body: `שלום ${name},\n\n${inviterName} הזמין אותך להצטרף ליישום PMO++ של המרכז למיפוי ישראל.\n\nלחץ כאן כדי לאשר את ההזמנה ולהגדיר סיסמה:\n${appUrl}\n\n—\nצוות PMO++ במפ"י`,
  };
}

/**
 * Try to send via Resend. Returns null if no key is configured (the
 * normal mock-data path), the parsed result on success, or throws on
 * a real Resend error so the caller can surface it.
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

  // Build the invite message once; we'll either send it via Resend or
  // hand the client mailto/whatsapp links so the operator can send it
  // from their own client.
  const { subject, body: msgBody } = buildInviteMessage(fullName, locale);

  let emailDeliveryStatus: "sent" | "no_transport" | "failed" = "no_transport";
  let emailError: string | undefined;
  let providerMessageId: string | undefined;

  try {
    const result = await sendViaResend(
      email,
      process.env.RESEND_FROM_ADDRESS || "PMO++ <onboarding@resend.dev>",
      subject,
      msgBody,
    );
    if (result) {
      emailDeliveryStatus = "sent";
      providerMessageId = result.id;
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
    providerMessageId,
    mailto,
    whatsapp,
    sms,
  });
}
