import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getCurrentUserId } from "@/lib/auth/server-session";
import { getPublicUserById } from "@/lib/auth/auth-service";

export const runtime = "nodejs";

/**
 * GET /api/auth/me — the currently authenticated user (or null).
 * Returns null (not an error) when no DB / no session, so the client can
 * fall back to demo mode cleanly.
 */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ user: null, dbConfigured: false });
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ user: null, dbConfigured: true });
  const user = await getPublicUserById(uid);
  return NextResponse.json({ user, dbConfigured: true });
}
