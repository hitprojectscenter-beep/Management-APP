import { NextResponse } from "next/server";
import { inArray, eq } from "drizzle-orm";
import { isDatabaseConfigured, getDb } from "@/lib/db/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/server-session";
import { sendEmail, sendWhatsApp, getAppBaseUrl, type EmailAttachment } from "@/lib/notify/transport";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const INITIAL_PW = "Mapi-Start#2026";
const APP_LINK = "https://management-app-hitprojectscenter-6566s-projects.vercel.app";
/** The 7 users to onboard (עידית, אלכס, חן, אלעד, סופיה, אפי, ניר). */
const ONBOARD_IDS = ["u68", "u30", "u28", "u3", "u74", "u4", "u2"];
const ADMIN_SUMMARY_EMAIL = "hitprojectscenter@gmail.com";

const SUBJECT = "הזמנה להצטרף ליישום ניהול משימות PMO++ — המרכז למיפוי ישראל";

// WhatsApp connection (Twilio Sandbox). The join phrase is account-specific —
// set WHATSAPP_SANDBOX_JOIN_CODE in env to produce a one-tap join link.
const WA_NUMBER_DISPLAY = "+1 415 523 8886";
const WA_NUMBER_DIGITS = "14155238886";
const WA_JOIN_CODE = (process.env.WHATSAPP_SANDBOX_JOIN_CODE || "elephant-bread").trim();

function whatsappConnectLines(): string[] {
  const head = ["", "📱 חיבור וואטסאפ (חד-פעמי, לקבלת התראות גם בוואטסאפ):"];
  if (WA_JOIN_CODE) {
    return [
      ...head,
      `• שלח/י הודעת WhatsApp עם הטקסט "join ${WA_JOIN_CODE}" למספר ${WA_NUMBER_DISPLAY}`,
      `• חיבור בלחיצה אחת: https://wa.me/${WA_NUMBER_DIGITS}?text=join%20${encodeURIComponent(WA_JOIN_CODE)}`,
    ];
  }
  return [...head, `• שמור/י את המספר ${WA_NUMBER_DISPLAY} ושלח/י אליו הודעת WhatsApp לפי ההנחיות במדריך המצורף.`];
}

function inviteBody(): string {
  return [
    "שלום רב,",
    "הנך מוזמן/ת להצטרף ליישום ניהול משימות של המרכז למיפוי ישראל — PMO++.",
    `להלן הקישור ליישום: ${APP_LINK}`,
    `בכניסה יש להזין את המייל הארגוני וסיסמה ראשונית: ${INITIAL_PW}`,
    "הנך מתבקש/ת לקרוא בעיון את ההנחיות למשתמש (מצורף קובץ PDF).",
    ...whatsappConnectLines(),
    "",
    "לכל שאלה על היישום, אנא פנה/י למארק ישראל, PMO של המרכז למיפוי ישראל.",
  ].join("\n");
}
function waBody(): string {
  return [
    'שלום, הוזמנת ליישום ניהול המשימות של מפ"י — PMO++.',
    `קישור ליישום: ${APP_LINK}`,
    `כניסה: המייל הארגוני + סיסמה ראשונית ${INITIAL_PW} (תתבקש/י להחליף בכניסה הראשונה).`,
    "לשאלות: מארק ישראל, PMO של המרכז למיפוי ישראל.",
  ].join("\n");
}

/**
 * POST /api/admin/onboard — one-time onboarding of a fixed user set: set the
 * shared initial password (force-change on first login), email each the
 * invitation with the user-guide PDF attached, and send a WhatsApp invite.
 * Sends a summary to the PMO. Auth: admin session OR Bearer CRON_SECRET.
 * Body: { dryRun?: boolean, ids?: string[] } — dryRun resolves recipients +
 * the PDF without sending or mutating anything.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const viaSecret = !!secret && auth === `Bearer ${secret}`;
  if (!viaSecret) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const ids: string[] = Array.isArray(body?.ids) && body.ids.length ? body.ids : ONBOARD_IDS;

  const db = getDb();
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(inArray(users.id, ids));

  // Fetch the public guide PDF once (so it can be attached to every email).
  let pdf: Buffer | null = null;
  try {
    const res = await fetch(`${getAppBaseUrl()}/onboarding-guide.pdf`);
    if (res.ok) pdf = Buffer.from(await res.arrayBuffer());
  } catch { /* best-effort */ }
  const attachments: EmailAttachment[] | undefined = pdf ? [{ filename: "מדריך-למשתמש-PMO.pdf", content: pdf, contentType: "application/pdf" }] : undefined;

  const hash = dryRun ? "" : await hashPassword(INITIAL_PW);
  const results: Record<string, unknown>[] = [];
  for (const u of rows) {
    const r: Record<string, unknown> = { id: u.id, name: u.name, emailAddr: u.email, phone: u.phone, passwordSet: false, email: "skipped", whatsapp: "skipped" };
    if (!dryRun) {
      try {
        await db.update(users).set({ passwordHash: hash, passwordChangedAt: new Date(), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, u.id));
        await revokeAllUserSessions(u.id);
        r.passwordSet = true;
        await logAuthEvent({ userId: u.id, email: u.email, event: "password_set", success: true, detail: "onboarding initial password (force-change)" });
      } catch (e) { r.passwordError = e instanceof Error ? e.message : String(e); }

      if (u.email) {
        const em = await sendEmail(u.email, SUBJECT, inviteBody(), attachments);
        r.email = em.status; r.emailProvider = em.provider; if (em.error) r.emailError = em.error;
      } else r.email = "no_email";

      if (u.phone) {
        const wa = await sendWhatsApp(u.phone, waBody());
        r.whatsapp = wa.status; if (wa.error) r.whatsappError = wa.error;
      } else r.whatsapp = "no_phone";
    }
    results.push(r);
  }

  // Summary to the PMO (מארק).
  let summary = "skipped";
  if (!dryRun) {
    const lines = results.map((r) => `• ${r.name} (${r.emailAddr}) — מייל: ${r.email}, ווטסאפ: ${r.whatsapp}`).join("\n");
    const sumBody = [
      "שלום מארק,",
      `נשלחו הזמנות הצטרפות ל-${results.length} משתמשים ב-PMO++ (כולל איפוס סיסמה ראשונית + צירוף מדריך המשתמש).`,
      "",
      "סטטוס שליחה:",
      lines,
      "",
      `קישור ליישום: ${APP_LINK}`,
      `סיסמה ראשונית לכולם: ${INITIAL_PW} (החלפה מאולצת בכניסה).`,
    ].join("\n");
    const sres = await sendEmail(ADMIN_SUMMARY_EMAIL, "סיכום שליחת הזמנות — PMO++", sumBody, attachments);
    summary = sres.status;
  }

  return NextResponse.json({ ok: true, dryRun, count: results.length, pdfAttached: !!pdf, adminSummary: summary, results });
}
