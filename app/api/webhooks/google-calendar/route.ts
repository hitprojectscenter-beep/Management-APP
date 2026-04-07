import { NextResponse } from "next/server";

/**
 * Google Calendar push notification webhook (stub).
 * שלב הפרודקשן: רישום ערוץ via google.calendar.events.watch,
 * וקבלת התראות בלייב + delta sync.
 */
export async function POST(req: Request) {
  const headers = Object.fromEntries(req.headers.entries());
  const channelId = headers["x-goog-channel-id"];
  const resourceId = headers["x-goog-resource-id"];
  const resourceState = headers["x-goog-resource-state"];

  console.log("[gcal-webhook]", { channelId, resourceId, resourceState });

  // TODO: lookup calendar_sync row by channelId
  // TODO: trigger delta sync via syncToken
  // TODO: update calendar_events table

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: "Google Calendar webhook stub - ready" });
}
