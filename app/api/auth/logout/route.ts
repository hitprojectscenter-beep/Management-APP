import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { readSessionCookie, revokeSessionToken, clearSessionCookie } from "@/lib/auth/server-session";
import { getCurrentUserId } from "@/lib/auth/server-session";
import { logAuthEvent } from "@/lib/auth/audit";

export const runtime = "nodejs";

/** POST /api/auth/logout — revoke the server session and clear the cookie. */
export async function POST(req: Request) {
  const token = await readSessionCookie();
  if (token && isDatabaseConfigured()) {
    try {
      const uid = await getCurrentUserId();
      await revokeSessionToken(token);
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      await logAuthEvent({ userId: uid, event: "logout", success: true, ip, userAgent: req.headers.get("user-agent") });
    } catch {
      // ignore — still clear the cookie below
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
