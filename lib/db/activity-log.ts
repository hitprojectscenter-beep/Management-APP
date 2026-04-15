/**
 * User Activity Log - tracks all user actions in the system.
 * In production this would be stored in the database.
 * For now, stored in-memory with seeded demo data.
 */

export interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  actionType: "login" | "create" | "update" | "delete" | "view" | "export" | "assistant";
  target?: string;
  targetType?: "task" | "project" | "user" | "automation" | "report" | "settings" | "system";
  details?: string;
  timestamp: string; // ISO date
  ipAddress?: string;
}

export interface UserStats {
  userId: string;
  loginCount: number;
  lastLogin: string;
  lastAction: string;
  lastActionTimestamp: string;
  totalActions: number;
  actionsThisWeek: number;
  tasksCreated: number;
  tasksUpdated: number;
  tasksCompleted: number;
}

// Seed activity data for demo
const now = new Date();
const ago = (days: number, hours = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};

export const mockActivityLog: ActivityEntry[] = [
  // u1 - מנהל פרוגרמת Salesforce (admin) - very active
  { id: "act-1", userId: "u1", action: "התחבר למערכת", actionType: "login", timestamp: ago(0, 1), ipAddress: "10.0.1.15" },
  { id: "act-2", userId: "u1", action: "צפה בדשבורד KPI", actionType: "view", target: "דשבורדים", targetType: "system", timestamp: ago(0, 1) },
  { id: "act-3", userId: "u1", action: "עדכן סטטוס משימה", actionType: "update", target: "בדיקת שרתי Salesforce", targetType: "task", timestamp: ago(0, 2) },
  { id: "act-4", userId: "u1", action: "יצר משימה חדשה", actionType: "create", target: "סקירת ביצועי מכירות Q2", targetType: "task", timestamp: ago(0, 3) },
  { id: "act-5", userId: "u1", action: "ייצא דוח PDF", actionType: "export", target: "דוח סטטוס שבועי", targetType: "report", timestamp: ago(0, 5) },
  { id: "act-6", userId: "u1", action: "עדכן הרשאות תפקיד", actionType: "update", target: "מנהל", targetType: "user", timestamp: ago(1, 0) },
  { id: "act-7", userId: "u1", action: "התחבר למערכת", actionType: "login", timestamp: ago(1, 0), ipAddress: "10.0.1.15" },
  { id: "act-8", userId: "u1", action: "יצר אוטומציה", actionType: "create", target: "התראה על איחור", targetType: "automation", timestamp: ago(1, 3) },
  { id: "act-9", userId: "u1", action: "שאל את העוזר האישי", actionType: "assistant", target: "מה הסיכונים?", details: "query_risks", timestamp: ago(1, 5) },
  { id: "act-10", userId: "u1", action: "התחבר למערכת", actionType: "login", timestamp: ago(2, 0), ipAddress: "10.0.1.15" },
  { id: "act-11", userId: "u1", action: "עדכן לוח גאנט", actionType: "update", target: "פרויקט שיווק", targetType: "project", timestamp: ago(2, 2) },
  { id: "act-12", userId: "u1", action: "התחבר למערכת", actionType: "login", timestamp: ago(3, 0), ipAddress: "10.0.1.15" },
  { id: "act-13", userId: "u1", action: "התחבר למערכת", actionType: "login", timestamp: ago(5, 0), ipAddress: "10.0.1.15" },
  { id: "act-14", userId: "u1", action: "התחבר למערכת", actionType: "login", timestamp: ago(6, 0), ipAddress: "10.0.1.15" },

  // u2 - מנהל כלל הפעילויות
  { id: "act-20", userId: "u2", action: "התחבר למערכת", actionType: "login", timestamp: ago(0, 2), ipAddress: "10.0.2.22" },
  { id: "act-21", userId: "u2", action: "צפה בדוחות", actionType: "view", target: "דוחות וניתוחים", targetType: "report", timestamp: ago(0, 2) },
  { id: "act-22", userId: "u2", action: "עדכן סטטוס משימה", actionType: "update", target: "תכנון תקציב שנתי", targetType: "task", timestamp: ago(0, 4) },
  { id: "act-23", userId: "u2", action: "התחבר למערכת", actionType: "login", timestamp: ago(1, 0), ipAddress: "10.0.2.22" },
  { id: "act-24", userId: "u2", action: "התחבר למערכת", actionType: "login", timestamp: ago(3, 0), ipAddress: "10.0.2.22" },
  { id: "act-25", userId: "u2", action: "צפה בניהול סיכונים", actionType: "view", target: "סיכונים", targetType: "system", timestamp: ago(3, 1) },

  // u3 - בעלים שיווק ומכירות
  { id: "act-30", userId: "u3", action: "התחבר למערכת", actionType: "login", timestamp: ago(0, 3), ipAddress: "10.0.3.18" },
  { id: "act-31", userId: "u3", action: "יצר משימה חדשה", actionType: "create", target: "הכנת מצגת מכירות", targetType: "task", timestamp: ago(0, 4) },
  { id: "act-32", userId: "u3", action: "עדכן משימה", actionType: "update", target: "ניתוח תחרותי", targetType: "task", timestamp: ago(1, 2) },
  { id: "act-33", userId: "u3", action: "התחבר למערכת", actionType: "login", timestamp: ago(2, 0), ipAddress: "10.0.3.18" },
  { id: "act-34", userId: "u3", action: "התחבר למערכת", actionType: "login", timestamp: ago(4, 0), ipAddress: "10.0.3.18" },

  // u4 - בעלים CRM
  { id: "act-40", userId: "u4", action: "התחבר למערכת", actionType: "login", timestamp: ago(0, 6), ipAddress: "10.0.4.30" },
  { id: "act-41", userId: "u4", action: "עדכן משימה", actionType: "update", target: "תחזוקת CRM רבעונית", targetType: "task", timestamp: ago(0, 7) },
  { id: "act-42", userId: "u4", action: "סימן משימה כהושלמה", actionType: "update", target: "בדיקת Apex triggers", targetType: "task", details: "status → done", timestamp: ago(1, 0) },
  { id: "act-43", userId: "u4", action: "התחבר למערכת", actionType: "login", timestamp: ago(2, 0), ipAddress: "10.0.4.30" },
  { id: "act-44", userId: "u4", action: "התחבר למערכת", actionType: "login", timestamp: ago(5, 0), ipAddress: "10.0.4.30" },

  // u5 - אחראית תכניות עבודה
  { id: "act-50", userId: "u5", action: "התחבר למערכת", actionType: "login", timestamp: ago(0, 1), ipAddress: "10.0.5.11" },
  { id: "act-51", userId: "u5", action: "ייצא דוח PDF", actionType: "export", target: "סיכום תכנית עבודה", targetType: "report", timestamp: ago(0, 2) },
  { id: "act-52", userId: "u5", action: "עדכן WBS", actionType: "update", target: "פירוק עבודה - שלב 3", targetType: "project", timestamp: ago(1, 0) },
  { id: "act-53", userId: "u5", action: "התחבר למערכת", actionType: "login", timestamp: ago(1, 0), ipAddress: "10.0.5.11" },
  { id: "act-54", userId: "u5", action: "התחבר למערכת", actionType: "login", timestamp: ago(2, 0), ipAddress: "10.0.5.11" },
  { id: "act-55", userId: "u5", action: "התחבר למערכת", actionType: "login", timestamp: ago(4, 0), ipAddress: "10.0.5.11" },

  // u6 - מנכ"ל
  { id: "act-60", userId: "u6", action: "התחבר למערכת", actionType: "login", timestamp: ago(1, 0), ipAddress: "10.0.6.5" },
  { id: "act-61", userId: "u6", action: "צפה בדשבורד PMO", actionType: "view", target: "דשבורדים", targetType: "system", timestamp: ago(1, 1) },
  { id: "act-62", userId: "u6", action: "התחבר למערכת", actionType: "login", timestamp: ago(4, 0), ipAddress: "10.0.6.5" },
  { id: "act-63", userId: "u6", action: "צפה בדוחות", actionType: "view", target: "דוחות וניתוחים", targetType: "report", timestamp: ago(4, 1) },
];

/** Compute per-user stats from activity log */
export function computeUserStats(userId: string): UserStats {
  const entries = mockActivityLog.filter((e) => e.userId === userId);
  const logins = entries.filter((e) => e.actionType === "login");
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const lastEntry = entries.length > 0
    ? entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  const lastLoginEntry = logins.length > 0
    ? logins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  return {
    userId,
    loginCount: logins.length,
    lastLogin: lastLoginEntry?.timestamp || "",
    lastAction: lastEntry?.action || "",
    lastActionTimestamp: lastEntry?.timestamp || "",
    totalActions: entries.length,
    actionsThisWeek: entries.filter((e) => new Date(e.timestamp) >= weekAgo).length,
    tasksCreated: entries.filter((e) => e.actionType === "create" && e.targetType === "task").length,
    tasksUpdated: entries.filter((e) => e.actionType === "update" && e.targetType === "task").length,
    tasksCompleted: entries.filter((e) => e.action.includes("הושלמה") || e.details?.includes("done")).length,
  };
}

/** Get recent activity for a specific user */
export function getUserActivity(userId: string, limit = 10): ActivityEntry[] {
  return mockActivityLog
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/** Get all activity sorted by time */
export function getAllActivity(limit = 50): ActivityEntry[] {
  return [...mockActivityLog]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
