import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { authenticate } from "@/lib/auth/auth-service";
import { setSessionCookie } from "@/lib/auth/server-session";

// bcrypt + pg + cookies need the Node runtime.
export const runtime = "nodejs";

/**
 * POST /api/auth/login  { email, password }
 *
 * Real DB-backed login. Inert (503) until DATABASE_URL is configured — the
 * app keeps using the demo login until then, so this route can ship dark.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "auth_db_not_configured" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const email = body?.email?.trim();
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "missing_credentials" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent");

  const res = await authenticate({ email, password, ip, userAgent });
  if (!res.ok) {
    let error: string;
    let retryAfterMinutes: number | undefined;
    if (res.reason === "locked") {
      const ms = res.lockedUntil ? res.lockedUntil.getTime() - Date.now() : 2 * 60 * 1000;
      retryAfterMinutes = Math.max(1, Math.ceil(ms / 60000));
      error =
        `החשבון ננעל זמנית לאחר 5 ניסיונות התחברות כושלים (אמצעי אבטחה). ` +
        `אפשר לנסות שוב בעוד כ-${retryAfterMinutes} דקות, או לפנות למנהל המערכת (מארק ישראל, PMO) לשחרור מיידי.`;
    } else if (res.reason === "disabled") {
      error = "החשבון מושבת. פנה/י למנהל המערכת (מארק ישראל, PMO).";
    } else {
      error = "פרטי התחברות שגויים. בדוק/י את כתובת המייל ואת הסיסמה (אין הבדל בין אותיות גדולות לקטנות במייל).";
    }
    // 423 Locked for lockout, 401 otherwise.
    return NextResponse.json(
      { ok: false, reason: res.reason, error, retryAfterMinutes },
      { status: res.reason === "locked" ? 423 : 401 },
    );
  }

  await setSessionCookie(res.token, res.expiresAt);
  return NextResponse.json({ ok: true, user: res.user, mustChangePassword: res.mustChangePassword });
}
