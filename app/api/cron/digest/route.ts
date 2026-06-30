import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { runWeeklyDigest } from "@/lib/db/task-activity-repo";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/digest — weekly Vercel Cron. Sends each manager a digest of the
 * AT-RISK tasks (overdue / due-soon / frozen) in their reporting subtree.
 * Auth (never public): `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron) or
 * an authenticated ADMIN session for manual runs.
 */
export async function GET(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const isVercelCron = !!secret && auth === `Bearer ${secret}`;

  let isAdmin = false;
  if (!isVercelCron) {
    const user = await requireUser();
    isAdmin = !!user && user.role === "admin";
  }
  if (!isVercelCron && !isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await runWeeklyDigest();
  return NextResponse.json({ ok: true, managers: result.managers, notified: result.sent.length, sent: result.sent });
}
