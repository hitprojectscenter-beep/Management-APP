import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { runEscalations } from "@/lib/db/task-activity-repo";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/escalate — daily Vercel Cron. Scans all created tasks and
 * escalates the OVERDUE (≥3 days) / STUCK (frozen|waiting ≥7 days) ones up the
 * assignee's management chain (to the division head) + the creator. Idempotent
 * via a 7-day per-task cooldown, so the daily run won't spam.
 *
 * Auth (never public):
 *   • Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET
 *     is set in the project env — accepted.
 *   • An authenticated ADMIN session may also trigger it manually (for testing
 *     / on-demand runs).
 * If CRON_SECRET is unset, only an admin session is allowed.
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
  if (!isVercelCron && !isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runEscalations();
  return NextResponse.json({
    ok: true,
    scanned: result.scanned,
    escalatedCount: result.escalated.length,
    escalated: result.escalated,
  });
}
