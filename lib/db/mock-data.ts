/**
 * Mock data store - לפיתוח ללא DB אמיתי.
 * משמש כברירת מחדל כש USE_MOCK_DATA=true.
 * כשנחבר Postgres אמיתי, ה-API יחליף את הקריאות כאן בשאילתות Drizzle.
 */

import type { TaskStatus, TaskPriority, WbsLevel, RiskSeverity, UserRole } from "./types";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  /** Israeli mobile in 0NN-NNNNNNN form. Used by the Team and Admin pages
   *  for "click-to-call" links and by invite flows. */
  phone?: string;
  /** Job title used in the UI when the team page wants to show "role" next
   *  to the personal name without losing either. */
  title?: string;
  image: string;
  locale: "he" | "en";
  role: UserRole;
  /** Direct manager (org hierarchy). Points at another user's id; undefined
   *  for the top of the org (CEO). Set on the seeded team and chosen in the
   *  "add team member" dialog so the org chart / reporting line is explicit. */
  managerId?: string;
  /** Per-user login password (demo identity layer). When set, login requires
   *  THIS password (the shared demo password still works as an operator master
   *  key). Invited users without one fall back to the shared demo password. */
  password?: string;
  skills?: string[]; // for AI auto-routing and reassignment matching
  performanceScore?: number; // 0-100 derived from history (on-time delivery rate)
  hourlyCapacity?: number; // hours per week available (default 40)
}

export interface MockWbsNode {
  id: string;
  parentId: string | null;
  level: WbsLevel;
  name: string;
  nameEn?: string;
  description?: string;
  deliverable?: string;
  methodology?: string;
  position: number;
}

/**
 * One attached source-file on a task. Captures enough metadata that the
 * user can see what was attached and (when blobUrl is present) download it.
 * Populated by the intake center when a task is created from a document/
 * audio/text source — every such task carries the original file back to
 * the source for full provenance.
 */
export interface MockTaskAttachment {
  name: string;
  size: number;
  type: string;
  /** Direct download URL — set when the file was uploaded via Vercel Blob.
   *  Optional for local-mock attachments where we only have the File object
   *  in memory. */
  blobUrl?: string;
  /** Free-text label describing where this file came from, e.g.
   *  "סיכום פגישה — Salesforce · 2026-06-27". Useful when the filename
   *  alone isn't self-explanatory. */
  source?: string;
}

export interface MockTask {
  id: string;
  wbsNodeId: string;
  parentTaskId: string | null;
  title: string;
  titleEn?: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  /** Full team on the task (user ids). assigneeId is typically team[0]; every
   *  member is a participant in the task chat + receipts and sees the task. */
  team?: string[];
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  estimateHours: number;
  actualHours: number;
  progressPercent: number;
  tags: string[];
  dependencies: string[];
  /** Required resources / effort categories for the task (e.g. כוח אדם,
   *  תקציב, רישוי תוכנה). Multi-select on the create form. */
  resources?: string[];
  /** Files attached when the task was created — typically the source
   *  document/recording for tasks extracted via the intake center. */
  attachments?: MockTaskAttachment[];
  /** Provenance: the task's source — a source file, or a source-type label
   *  (e.g. "החלטת מנהל"). Shown as "מקור המשימה" on the task detail. */
  sourceFile?: { name: string; size?: number; type?: string; blobUrl?: string; source?: string };
  /** Per-member responsibility within the task: userId → { type, detail }.
   *  e.g. { u3: { type: "report", detail: "דו\"ח התקדמות שבועי" } }. */
  memberRoles?: Record<string, { type: string; detail?: string }>;
}

export interface MockRisk {
  id: string;
  taskId: string;
  severity: RiskSeverity;
  type: string;
  message: string;
  messageEn?: string;
  suggestion: string;
  detectedAt: string;
  dismissed: boolean;
}

export interface MockComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface MockAutomation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  action: string;
}

export interface MockProjectMember {
  id: string;
  wbsNodeId: string;
  userId: string;
  roleInProject: string;
  roleInProjectEn?: string;
  ftePercent: number; // 1-100
  joinedAt: string;
}

/**
 * The currently logged-in user (for demo mode).
 * בייצור זה יגיע מה-session של Auth.js.
 * מוגדר ל-"u1" (מארק ישראל - מנהל פרוגרמת Salesforce ומנהל פרויקטים טכני).
 */
export const CURRENT_USER_ID = "u1";

// ============================================
// Users
// ============================================
/*
 * Real team members from the מרכז למיפוי ישראל Salesforce program.
 * Personal names + job titles + placeholder Israeli mobile numbers.
 * NOTE on phones: the previous user-removal step lost the original phone
 * digits — the numbers below are realistic Israeli prefixes (050/052/054)
 * but should be updated with the actual numbers when known. Emails are
 * the originals from the early mock-data.
 */
export const mockUsers: MockUser[] = [
  {
    id: "u1",
    name: "מארק ישראל",
    title: "מנהל פרוגרמת Salesforce ומנהל פרויקטים טכני",
    email: "hitprojectscenter@gmail.com",
    phone: "050-5714100",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Mark%20Israel",
    locale: "he",
    role: "admin",
    managerId: "u6", // מדווח ישירות לחגי רונן (מנכ"ל) — חריג, לא תחת ניר
    password: "Mark@4100",
    skills: ["salesforce", "pmo", "technical-pm", "architecture", "strategy", "integration"],
    performanceScore: 92,
    hourlyCapacity: 40,
  },
  {
    id: "u2",
    name: "ניר ברלוביץ'",
    title: "מנהל כלל הפעילויות",
    email: "nirb@mapi.gov.il",
    phone: "050-6208408",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Nir%20Berlowitz",
    locale: "he",
    role: "manager",
    managerId: "u6", // מדווח לחגי רונן (מנכ"ל)
    password: "Nir2026",
    skills: ["operations", "pmo", "management", "strategy", "planning"],
    performanceScore: 90,
    hourlyCapacity: 40,
  },
  {
    id: "u3",
    name: "אלעד אסרף",
    title: "בעלים – Salesforce שיווק ומכירות",
    email: "elada@mapi.gov.il",
    phone: "050-4767060",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Elad%20Asraf",
    locale: "he",
    role: "manager",
    managerId: "u2", // מדווח לניר ברלוביץ' (מנהל כלל הפעילויות)
    password: "Elad2026",
    skills: ["salesforce", "marketing", "sales", "crm", "rfp", "procurement"],
    performanceScore: 87,
    hourlyCapacity: 40,
  },
  {
    id: "u4",
    name: "אפרים ג'יאן",
    title: "בעלים – Salesforce CRM",
    email: "efi@mapi.gov.il",
    phone: "054-6728498",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Ephraim%20Gian",
    locale: "he",
    role: "manager",
    managerId: "u2", // מדווח לניר ברלוביץ' (מנהל כלל הפעילויות)
    password: "Ephraim2026",
    skills: ["salesforce", "crm", "apex", "lightning", "maintenance", "support"],
    performanceScore: 89,
    hourlyCapacity: 40,
  },
  {
    id: "u5",
    name: "אסתר מהרטו",
    title: "אחראית תכניות עבודה",
    email: "esterm@mapi.gov.il",
    phone: "055-6690994",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Esther%20Maharato",
    locale: "he",
    role: "manager",
    managerId: "u2", // מדווחת לניר ברלוביץ' (מנהל כלל הפעילויות)
    password: "Esther2026",
    skills: ["pmo", "planning", "work-plans", "compliance", "reporting", "government"],
    performanceScore: 91,
    hourlyCapacity: 40,
  },
  {
    id: "u6",
    name: "חגי רונן",
    title: "מנכ\"ל המרכז למיפוי ישראל",
    email: "hagi@mapi.gov.il",
    phone: "050-6225471",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Hagai%20Ronen",
    locale: "he",
    role: "manager",
    // חגי רונן — מנכ"ל, בראש ההיררכיה (אין מנהל ישיר)
    password: "Hagi2026",
    skills: ["leadership", "strategy", "stakeholder-management", "executive"],
    performanceScore: 95,
    hourlyCapacity: 40,
  },
  // ===== המרכז למיפוי ישראל — מצבת עובדים מלאה (מהקבצים שהועלו) =====
  { id: "u7", name: "אבי חסון", title: "ראש צוות מדידות", email: "avih@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%91%D7%99%20%D7%97%D7%A1%D7%95%D7%9F", locale: "he", role: "manager", managerId: "u32" },
  { id: "u8", name: "מנשה רותם גיאת", title: "צוות מדידות", email: "menashe-giat@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9E%D7%A0%D7%A9%D7%94%20%D7%A8%D7%95%D7%AA%D7%9D%20%D7%92%D7%99%D7%90%D7%AA", locale: "he", role: "member", managerId: "u32" },
  { id: "u9", name: "אבי קדמי", title: "אגף מדידות גיאודטיות", email: "avik@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%91%D7%99%20%D7%A7%D7%93%D7%9E%D7%99", locale: "he", role: "member", managerId: "u32" },
  { id: "u10", name: "תמר פישרמן", title: "צוות מדידות", email: "tamar@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%AA%D7%9E%D7%A8%20%D7%A4%D7%99%D7%A9%D7%A8%D7%9E%D7%9F", locale: "he", role: "member", managerId: "u32" },
  { id: "u11", name: "דרור קרני", title: "צוות מדידות", email: "dror@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%D7%A8%D7%95%D7%A8%20%D7%A7%D7%A8%D7%A0%D7%99", locale: "he", role: "member", managerId: "u32" },
  { id: "u12", name: "גנדי ברזילבסקי", title: "צוות מדידות", email: "genadi@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%92%D7%A0%D7%93%D7%99%20%D7%91%D7%A8%D7%96%D7%99%D7%9C%D7%91%D7%A1%D7%A7%D7%99", locale: "he", role: "member", managerId: "u32" },
  { id: "u13", name: "אלון מלצר", title: "צוות מדידות", email: "alonm@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%9C%D7%95%D7%9F%20%D7%9E%D7%9C%D7%A6%D7%A8", locale: "he", role: "member", managerId: "u32" },
  { id: "u14", name: "אוקסנה לטושקין", title: "אגף חישובים גיאודטיים", email: "oksana@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%95%D7%A7%D7%A1%D7%A0%D7%94%20%D7%9C%D7%98%D7%95%D7%A9%D7%A7%D7%99%D7%9F", locale: "he", role: "member", managerId: "u32" },
  { id: "u15", name: "אורן רז", title: "מנהל אגף קרטוגרפיה", email: "oren@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%95%D7%A8%D7%9F%20%D7%A8%D7%96", locale: "he", role: "member", managerId: "u31" },
  { id: "u16", name: "בן פז", title: "מרכז חישובים גאודטיים", email: "benp@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%91%D7%9F%20%D7%A4%D7%96", locale: "he", role: "member", managerId: "u32" },
  { id: "u17", name: "חנן סבג", title: "עובד אגף מדידות גיאודטיות ואכיפה", email: "hanans@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%97%D7%A0%D7%9F%20%D7%A1%D7%91%D7%92", locale: "he", role: "member", managerId: "u32" },
  { id: "u18", name: "לובה גרינשפון", title: "ראש תחום", email: "lubag2@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9C%D7%95%D7%91%D7%94%20%D7%92%D7%A8%D7%99%D7%A0%D7%A9%D7%A4%D7%95%D7%9F", locale: "he", role: "manager", managerId: "u32" },
  { id: "u19", name: "מרינה פנסקי", title: "מרכז בכיר", email: "marinap2@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9E%D7%A8%D7%99%D7%A0%D7%94%20%D7%A4%D7%A0%D7%A1%D7%A7%D7%99", locale: "he", role: "member", managerId: "u32" },
  { id: "u20", name: "עמוס גוטמן", title: "מנהל תחום רשתות בקרה תלת-מימד", email: "amos@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A2%D7%9E%D7%95%D7%A1%20%D7%92%D7%95%D7%98%D7%9E%D7%9F", locale: "he", role: "manager", managerId: "u32" },
  { id: "u21", name: "הייתם שאהין", title: "מנהל מרחב חיפה", email: "haitham@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%94%D7%99%D7%99%D7%AA%D7%9D%20%D7%A9%D7%90%D7%94%D7%99%D7%9F", locale: "he", role: "member", managerId: "u29" },
  { id: "u22", name: "אירינה פורסנקו", title: "מנהלת תחום ביקורת תת\"ג", email: "irinaf@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%99%D7%A8%D7%99%D7%A0%D7%94%20%D7%A4%D7%95%D7%A8%D7%A1%D7%A0%D7%A7%D7%95", locale: "he", role: "member", managerId: "u29" },
  { id: "u23", name: "חנה זגורויקו", title: "ראש תחום מדידות גאודטיות וקדסטר", email: "annaz@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%97%D7%A0%D7%94%20%D7%96%D7%92%D7%95%D7%A8%D7%95%D7%99%D7%A7%D7%95", locale: "he", role: "manager", managerId: "u32" },
  { id: "u24", name: "שרה קן תור", title: "עובד אגף חדשנות ו-GOVMAP", email: "kantor@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A9%D7%A8%D7%94%20%D7%A7%D7%9F%20%D7%AA%D7%95%D7%A8", locale: "he", role: "member", managerId: "u30" },
  { id: "u25", name: "קרן רוזן", title: "עובד אגף חדשנות ו-GOVMAP", email: "keren@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A7%D7%A8%D7%9F%20%D7%A8%D7%95%D7%96%D7%9F", locale: "he", role: "member", managerId: "u30" },
  { id: "u26", name: "ח'וסאם ח'יר", title: "מנהל מחוז יו\"ש", email: "hosamk@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%97'%D7%95%D7%A1%D7%90%D7%9D%20%D7%97'%D7%99%D7%A8", locale: "he", role: "member", managerId: "u29" },
  { id: "u27", name: "גילי קירשנר", title: "מנהל חטיבת הלשכה המשפטית", email: "gilik@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%92%D7%99%D7%9C%D7%99%20%D7%A7%D7%99%D7%A8%D7%A9%D7%A0%D7%A8", locale: "he", role: "manager", managerId: "u6" },
  { id: "u28", name: "חן דנוך", title: "סמנכ\"לית שת\"פ", email: "henda@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%97%D7%9F%20%D7%93%D7%A0%D7%95%D7%9A", locale: "he", role: "manager", managerId: "u6" },
  { id: "u29", name: "שמעון ברזני", title: "סמנכ\"ל קדסטר", email: "shimon@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A9%D7%9E%D7%A2%D7%95%D7%9F%20%D7%91%D7%A8%D7%96%D7%A0%D7%99", locale: "he", role: "manager", managerId: "u6" },
  { id: "u30", name: "אלכס קורן", title: "מנמ\"ר מפ\"י", email: "AK@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%9C%D7%9B%D7%A1%20%D7%A7%D7%95%D7%A8%D7%9F", locale: "he", role: "manager", managerId: "u6" },
  { id: "u31", name: "ד\"ר בשיר חאג' יחיא", title: "סמנכ\"ל מיפוי וממ\"ג", email: "bashir@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%22%D7%A8%20%D7%91%D7%A9%D7%99%D7%A8%20%D7%97%D7%90%D7%92'%20%D7%99%D7%97%D7%99%D7%90", locale: "he", role: "manager", managerId: "u6" },
  { id: "u32", name: "אירית בקר", title: "סמנכ\"לית גאודזיה ואכיפה", email: "iritb@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%99%D7%A8%D7%99%D7%AA%20%D7%91%D7%A7%D7%A8", locale: "he", role: "manager", managerId: "u6" },
  { id: "u33", name: "ערן קינן", title: "סמנכ\"ל ניהול פיתוח עסקי", email: "eran@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A2%D7%A8%D7%9F%20%D7%A7%D7%99%D7%A0%D7%9F", locale: "he", role: "manager", managerId: "u6" },
  { id: "u34", name: "יוסף שגיא", title: "מנהל פרויקטים", email: "yosefs@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%99%D7%95%D7%A1%D7%A3%20%D7%A9%D7%92%D7%99%D7%90", locale: "he", role: "manager", managerId: "u6" },
  { id: "u35", name: "גאולה טייר", title: "סמנכ\"לית משא\"נ", email: "geula@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%92%D7%90%D7%95%D7%9C%D7%94%20%D7%98%D7%99%D7%99%D7%A8", locale: "he", role: "manager", managerId: "u6" },
  { id: "u36", name: "יאסו טזזו", title: "מנהל תחום משכורת", email: "yasso@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%99%D7%90%D7%A1%D7%95%20%D7%98%D7%96%D7%96%D7%95", locale: "he", role: "manager", managerId: "u6" },
  { id: "u37", name: "ניקולא ג'מילה", title: "מנהל אגף תצ\"ר", email: "nicola@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A0%D7%99%D7%A7%D7%95%D7%9C%D7%90%20%D7%92'%D7%9E%D7%99%D7%9C%D7%94", locale: "he", role: "manager", managerId: "u29" },
  { id: "u38", name: "דני רייסקי", title: "מנהל אגף הסדר קרקעות", email: "dannyr@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%D7%A0%D7%99%20%D7%A8%D7%99%D7%99%D7%A1%D7%A7%D7%99", locale: "he", role: "manager", managerId: "u29" },
  { id: "u39", name: "אירנה איטקיס", title: "מנהלת אגף קמ\"ק", email: "irina@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%99%D7%A8%D7%A0%D7%94%20%D7%90%D7%99%D7%98%D7%A7%D7%99%D7%A1", locale: "he", role: "manager", managerId: "u29" },
  { id: "u40", name: "קסניה חנסשין", title: "מנהלת תחום קדסטר תלת-מימדי", email: "ksenia@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A7%D7%A1%D7%A0%D7%99%D7%94%20%D7%97%D7%A0%D7%A1%D7%A9%D7%99%D7%9F", locale: "he", role: "manager", managerId: "u29" },
  { id: "u41", name: "איריס ציחה", title: "מנהלת דלפק קידמי תצ\"רים", email: "carto@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%99%D7%A8%D7%99%D7%A1%20%D7%A6%D7%99%D7%97%D7%94", locale: "he", role: "manager", managerId: "u29" },
  { id: "u42", name: "יואב טל", title: "מנהל אגף פיתוח", email: "tal@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%99%D7%95%D7%90%D7%91%20%D7%98%D7%9C", locale: "he", role: "manager", managerId: "u30" },
  { id: "u43", name: "ניר אלוש", title: "מנהל אגף אינטרנט", email: "nir@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A0%D7%99%D7%A8%20%D7%90%D7%9C%D7%95%D7%A9", locale: "he", role: "manager", managerId: "u30" },
  { id: "u44", name: "אורי דרוז'קו", title: "מנהל ישומים", email: "dor@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%95%D7%A8%D7%99%20%D7%93%D7%A8%D7%95%D7%96'%D7%A7%D7%95", locale: "he", role: "manager", managerId: "u30" },
  { id: "u45", name: "לימור פיסטרייך", title: "מנהלת יישומי אבטחת מידע", email: "limor_pst@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9C%D7%99%D7%9E%D7%95%D7%A8%20%D7%A4%D7%99%D7%A1%D7%98%D7%A8%D7%99%D7%99%D7%9A", locale: "he", role: "manager", managerId: "u30" },
  { id: "u46", name: "שירלי גולדנר", title: "מנהלת אגף קרטוגרפיה", email: "shirly@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A9%D7%99%D7%A8%D7%9C%D7%99%20%D7%92%D7%95%D7%9C%D7%93%D7%A0%D7%A8", locale: "he", role: "manager", managerId: "u31" },
  { id: "u47", name: "רוני שדה", title: "מנהל אגף מיפוי ימי", email: "roni@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A8%D7%95%D7%A0%D7%99%20%D7%A9%D7%93%D7%94", locale: "he", role: "manager", managerId: "u31" },
  { id: "u48", name: "דניאל ברודי", title: "מנהל אגף מיפוי וממ\"ג", email: "danielb@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%D7%A0%D7%99%D7%90%D7%9C%20%D7%91%D7%A8%D7%95%D7%93%D7%99", locale: "he", role: "manager", managerId: "u31" },
  { id: "u49", name: "אלנה רוחלין", title: "מנהלת אגף בנק\"ל וארכיון", email: "elena@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%9C%D7%A0%D7%94%20%D7%A8%D7%95%D7%97%D7%9C%D7%99%D7%9F", locale: "he", role: "manager", managerId: "u31" },
  { id: "u50", name: "נעם שוורץ", title: "מנהל אגף פוטוגרמטריה", email: "noam@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A0%D7%A2%D7%9D%20%D7%A9%D7%95%D7%95%D7%A8%D7%A5", locale: "he", role: "manager", managerId: "u31" },
  { id: "u51", name: "עומר בר", title: "מנהל אגף חישובים גאודטים מחקר ומדידות", email: "omer@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A2%D7%95%D7%9E%D7%A8%20%D7%91%D7%A8", locale: "he", role: "manager", managerId: "u32" },
  { id: "u52", name: "אוהד שמואלי", title: "מנהל אגף גבולות", email: "ohad@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%95%D7%94%D7%93%20%D7%A9%D7%9E%D7%95%D7%90%D7%9C%D7%99", locale: "he", role: "manager", managerId: "u32" },
  { id: "u53", name: "לילך טינסקי", title: "מנהלת אגף מדידות גאודטיות ואכיפה", email: "lilach@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9C%D7%99%D7%9C%D7%9A%20%D7%98%D7%99%D7%A0%D7%A1%D7%A7%D7%99", locale: "he", role: "manager", managerId: "u32" },
  { id: "u54", name: "דריאל ראן-פוני", title: "ראש אגף טכנולוגיות מיפוי ותמיכה בצרכנים", email: "dariel@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%D7%A8%D7%99%D7%90%D7%9C%20%D7%A8%D7%90%D7%9F-%D7%A4%D7%95%D7%A0%D7%99", locale: "he", role: "manager", managerId: "u33" },
  { id: "u55", name: "גילה דרושקביץ", title: "מנהלת אגף אינטרנט", email: "gila@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%92%D7%99%D7%9C%D7%94%20%D7%93%D7%A8%D7%95%D7%A9%D7%A7%D7%91%D7%99%D7%A5", locale: "he", role: "manager", managerId: "u33" },
  { id: "u56", name: "רחל סרנגה", title: "ראש תחום מעקב ובקרה", email: "saranga@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A8%D7%97%D7%9C%20%D7%A1%D7%A8%D7%A0%D7%92%D7%94", locale: "he", role: "manager", managerId: "u33" },
  { id: "u57", name: "דני מלכא", title: "מנהל אגף רכש נכסים ולוגיסטיקה", email: "danim@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%D7%A0%D7%99%20%D7%9E%D7%9C%D7%9B%D7%90", locale: "he", role: "member", managerId: "u35" },
  { id: "u58", name: "מוטי ארבל", title: "קב\"ט", email: "arbel@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9E%D7%95%D7%98%D7%99%20%D7%90%D7%A8%D7%91%D7%9C", locale: "he", role: "manager", managerId: "u35" },
  { id: "u59", name: "קובי סנדקה", title: "מנהל תחום תמרוץ ותגמול", email: "kobis@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A7%D7%95%D7%91%D7%99%20%D7%A1%D7%A0%D7%93%D7%A7%D7%94", locale: "he", role: "manager", managerId: "u35" },
  { id: "u60", name: "ורד בלום", title: "ממונה ניהול רשומות ומידע", email: "vered@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%95%D7%A8%D7%93%20%D7%91%D7%9C%D7%95%D7%9D", locale: "he", role: "member", managerId: "u4" },
  { id: "u61", name: "ליובה קיציס", title: "ראש אגף הפצה ושירות לצרכני מידע גאומרחבי", email: "lubaki@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9C%D7%99%D7%95%D7%91%D7%94%20%D7%A7%D7%99%D7%A6%D7%99%D7%A1", locale: "he", role: "member", managerId: "u4" },
  { id: "u62", name: "ליטל בר-יוסף", title: "ראש ענף מיפוי - בודקת ומבקרת נתוני בנט\"ל", email: "lital@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9C%D7%99%D7%98%D7%9C%20%D7%91%D7%A8-%D7%99%D7%95%D7%A1%D7%A3", locale: "he", role: "manager", managerId: "u31" },
  { id: "u63", name: "דוד גלידאי", title: "ראש תחום צילום אויר וארכיון", email: "glidai@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%93%D7%95%D7%93%20%D7%92%D7%9C%D7%99%D7%93%D7%90%D7%99", locale: "he", role: "manager", managerId: "u31" },
  { id: "u64", name: "לימור דור", title: "מרכזת בכירה מכירת מוצרי מיפוי דיגיטליים", email: "limord@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9C%D7%99%D7%9E%D7%95%D7%A8%20%D7%93%D7%95%D7%A8", locale: "he", role: "member", managerId: "u31" },
  { id: "u65", name: "סרגי זלצמן", title: "ממנהל מחוז באר שבע והדרום", email: "sergey_z@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A1%D7%A8%D7%92%D7%99%20%D7%96%D7%9C%D7%A6%D7%9E%D7%9F", locale: "he", role: "member", managerId: "u29" },
  { id: "u66", name: "משה חודש", title: "רכז בכיר", email: "moshe_h@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%9E%D7%A9%D7%94%20%D7%97%D7%95%D7%93%D7%A9", locale: "he", role: "member", managerId: "u31" },
  { id: "u67", name: "רון חזקיהו", title: "מידען", email: "ron@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A8%D7%95%D7%9F%20%D7%97%D7%96%D7%A7%D7%99%D7%94%D7%95", locale: "he", role: "member", managerId: "u37" },
  { id: "u68", name: "עידית יוגב", title: "יועץ בכיר למנכ\"ל", email: "iditL@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A2%D7%99%D7%93%D7%99%D7%AA%20%D7%99%D7%95%D7%92%D7%91", locale: "he", role: "member", managerId: "u6" },
  { id: "u69", name: "יוסף יוסף", title: "מנהל מרחב הגליל", email: "yosefy@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%99%D7%95%D7%A1%D7%A3%20%D7%99%D7%95%D7%A1%D7%A3", locale: "he", role: "member", managerId: "u29" },
  { id: "u70", name: "סבטלנה כץ", title: "מרכזת בכירה אגף טכנולוגיות מיפוי", email: "svetlana@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A1%D7%91%D7%98%D7%9C%D7%A0%D7%94%20%D7%9B%D7%A5", locale: "he", role: "member", managerId: "u54" },
  { id: "u71", name: "אתי כתריאל", title: "ראש ענף תפעול קדסטרי", email: "etik@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%AA%D7%99%20%D7%9B%D7%AA%D7%A8%D7%99%D7%90%D7%9C", locale: "he", role: "manager", managerId: "u29" },
  { id: "u72", name: "חגי לייבושור", title: "מנהל מחוז יו\"ש", email: "hagail@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%97%D7%92%D7%99%20%D7%9C%D7%99%D7%99%D7%91%D7%95%D7%A9%D7%95%D7%A8", locale: "he", role: "member", managerId: "u29" },
  { id: "u73", name: "יובב סנדרס", title: "אנליטיקאי נתונים בכיר", email: "yovav@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%99%D7%95%D7%91%D7%91%20%D7%A1%D7%A0%D7%93%D7%A8%D7%A1", locale: "he", role: "member", managerId: "u6" },
  { id: "u74", name: "סופיה וסרמן", title: "מנהלת לשכת מנכ\"ל", email: "sofia@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A1%D7%95%D7%A4%D7%99%D7%94%20%D7%95%D7%A1%D7%A8%D7%9E%D7%9F", locale: "he", role: "member", managerId: "u6" },
  { id: "u75", name: "רועי סיני", title: "עובד תחום תשתיות", email: "rois@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A8%D7%95%D7%A2%D7%99%20%D7%A1%D7%99%D7%A0%D7%99", locale: "he", role: "member", managerId: "u6" },
  { id: "u76", name: "פנחס ביליג", title: "מידען", email: "pinhas@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%A4%D7%A0%D7%97%D7%A1%20%D7%91%D7%99%D7%9C%D7%99%D7%92", locale: "he", role: "member", managerId: "u30" },
  { id: "u77", name: "אביחי", title: "אייזק שורץ", email: "avihai@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%90%D7%91%D7%99%D7%97%D7%99", locale: "he", role: "member", managerId: "u48" },
  { id: "u78", name: "גליה", title: "גרצ'ניקוב", email: "galiag@mapi.gov.il", image: "https://api.dicebear.com/7.x/initials/svg?seed=%D7%92%D7%9C%D7%99%D7%94", locale: "he", role: "member", managerId: "u30" },
];

// ============================================
// Task & Project Types - configurable categories
// (admin can define custom types)
// ============================================
export interface MockItemType {
  id: string;
  scope: "task" | "project";
  nameHe: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  isSystem: boolean; // system types cannot be deleted
}

export const mockItemTypes: MockItemType[] = [
  // Task types
  { id: "tt-bug", scope: "task", nameHe: "באג", nameEn: "Bug", icon: "🐛",
    color: "#EF4444", description: "תקלה במערכת או באפליקציה", isSystem: true },
  { id: "tt-feature", scope: "task", nameHe: "תכונה חדשה", nameEn: "Feature", icon: "✨",
    color: "#3B82F6", description: "תוספת חדשה למערכת", isSystem: true },
  { id: "tt-improvement", scope: "task", nameHe: "שיפור", nameEn: "Improvement", icon: "📈",
    color: "#10B981", description: "שיפור של פונקציונליות קיימת", isSystem: true },
  { id: "tt-research", scope: "task", nameHe: "מחקר", nameEn: "Research", icon: "🔬",
    color: "#8B5CF6", description: "POC, ניתוח או אפיון", isSystem: true },
  { id: "tt-doc", scope: "task", nameHe: "תיעוד", nameEn: "Documentation", icon: "📝",
    color: "#64748B", description: "מסמכים, מדריכים, ותיעוד טכני", isSystem: true },
  { id: "tt-meeting", scope: "task", nameHe: "פגישה", nameEn: "Meeting", icon: "📅",
    color: "#F59E0B", description: "ישיבה, סקירה, או הצגה", isSystem: false },
  { id: "tt-procurement", scope: "task", nameHe: "רכש", nameEn: "Procurement", icon: "🛒",
    color: "#06B6D4", description: "תהליך רכישה ופרסום מכרזים", isSystem: false },
  { id: "tt-meeting-summary", scope: "task", nameHe: "סיכום פגישה", nameEn: "Meeting Summary", icon: "📋",
    color: "#7C3AED", description: "סיכום פגישה כולל החלטות ופעולות לביצוע", isSystem: false },
  { id: "tt-meeting-prep", scope: "task", nameHe: "הכנה לפגישה", nameEn: "Meeting Preparation", icon: "📎",
    color: "#059669", description: "הכנת חומרים ונקודות דיון לקראת פגישה", isSystem: false },
  { id: "tt-meeting-followup", scope: "task", nameHe: "פעולה בהמשך לפגישה", nameEn: "Meeting Follow-up", icon: "✅",
    color: "#0891B2", description: "פעולה שנדרשת בעקבות החלטה בפגישה", isSystem: false },
  { id: "tt-create-doc", scope: "task", nameHe: "יצירת מסמך", nameEn: "Create Document", icon: "📄",
    color: "#6366F1", description: "כתיבה או עריכה של מסמך", isSystem: false },
  { id: "tt-respond", scope: "task", nameHe: "מענה על פניה", nameEn: "Respond to Request", icon: "💬",
    color: "#EC4899", description: "מענה על פניה או שאלה שנתקבלה", isSystem: false },
  { id: "tt-other", scope: "task", nameHe: "אחר", nameEn: "Other", icon: "📌",
    color: "#94A3B8", description: "סוג משימה מותאם אישית", isSystem: false },

  // Project types
  { id: "pt-dev", scope: "project", nameHe: "פיתוח", nameEn: "Development", icon: "💻",
    color: "#3B82F6", description: "פרויקט פיתוח תוכנה", isSystem: true },
  { id: "pt-infra", scope: "project", nameHe: "תשתיות", nameEn: "Infrastructure", icon: "🏗️",
    color: "#64748B", description: "פרויקט תשתיות וענן", isSystem: true },
  { id: "pt-marketing", scope: "project", nameHe: "שיווק", nameEn: "Marketing", icon: "📣",
    color: "#EC4899", description: "פרויקט שיווק או מכירות", isSystem: false },
  { id: "pt-research", scope: "project", nameHe: "מחקר", nameEn: "Research", icon: "🔬",
    color: "#8B5CF6", description: "פרויקט מחקר ופיתוח", isSystem: false },
  { id: "pt-maintenance", scope: "project", nameHe: "תחזוקה", nameEn: "Maintenance", icon: "🔧",
    color: "#10B981", description: "פרויקט תחזוקה שוטפת", isSystem: false },
  { id: "pt-procurement", scope: "project", nameHe: "רכש", nameEn: "Procurement", icon: "📋",
    color: "#06B6D4", description: "פרויקט רכש ומכרזים ממשלתיים", isSystem: false },
  { id: "pt-implementation", scope: "project", nameHe: "הטמעה", nameEn: "Implementation", icon: "🚀",
    color: "#F59E0B", description: "פרויקט הטמעה של מערכת חדשה", isSystem: false },
];

export function getTaskTypes(): MockItemType[] {
  return mockItemTypes.filter((t) => t.scope === "task");
}

export function getProjectTypes(): MockItemType[] {
  return mockItemTypes.filter((t) => t.scope === "project");
}

// ============================================
// WBS Hierarchy
// ============================================
export const mockWbsNodes: MockWbsNode[] = [
  // Portfolio
  {
    id: "wbs-portfolio-1",
    parentId: null,
    level: "portfolio",
    name: "פורטפוליו טרנספורמציה דיגיטלית 2026",
    nameEn: "Digital Transformation Portfolio 2026",
    description: "כלל יוזמות הטרנספורמציה הדיגיטלית של הארגון לשנת 2026",
    position: 0,
  },
  // Programs
  {
    id: "wbs-program-1",
    parentId: "wbs-portfolio-1",
    level: "program",
    name: "תוכנית ענן ותשתיות",
    nameEn: "Cloud & Infrastructure Program",
    position: 0,
  },
  {
    id: "wbs-program-2",
    parentId: "wbs-portfolio-1",
    level: "program",
    name: "תוכנית AI ואוטומציה",
    nameEn: "AI & Automation Program",
    position: 1,
  },
  // Projects
  {
    id: "wbs-project-1",
    parentId: "wbs-program-1",
    level: "project",
    name: "מעבר ל-AWS",
    nameEn: "AWS Migration",
    description: "מעבר כל המערכות הליבה לסביבת AWS עם אפס downtime",
    methodology: "waterfall",
    position: 0,
  },
  {
    id: "wbs-project-2",
    parentId: "wbs-program-2",
    level: "project",
    name: "פלטפורמת AI פנימית",
    nameEn: "Internal AI Platform",
    methodology: "waterfall",
    position: 0,
  },
  // Goals
  {
    id: "wbs-goal-1",
    parentId: "wbs-project-1",
    level: "goal",
    name: "תשתית AWS מוכנה לפרודקשן",
    nameEn: "Production-ready AWS infrastructure",
    deliverable: "VPC, EKS cluster, RDS, monitoring, CI/CD pipelines",
    position: 0,
  },
  // Milestones
  {
    id: "wbs-milestone-1",
    parentId: "wbs-goal-1",
    level: "milestone",
    name: "סקירת אבטחה ראשונית",
    nameEn: "Initial security review",
    position: 0,
  },
  {
    id: "wbs-milestone-2",
    parentId: "wbs-goal-1",
    level: "milestone",
    name: "Pilot Migration הושלם",
    nameEn: "Pilot Migration completed",
    position: 1,
  },
  // Activities
  {
    id: "wbs-activity-1",
    parentId: "wbs-milestone-1",
    level: "activity",
    name: "ניתוח ציר אחריות אבטחתי",
    nameEn: "Security responsibility analysis",
    deliverable: "מסמך סקירה חתום על ידי CISO",
    position: 0,
  },
  {
    id: "wbs-activity-2",
    parentId: "wbs-milestone-2",
    level: "activity",
    name: "מעבר שירות התשלומים",
    nameEn: "Payment service migration",
    deliverable: "שירות בייצור על EKS עם traffic מלא",
    position: 0,
  },

  // ============================================
  // Salesforce Program (מרכז למיפוי ישראל)
  // ============================================
  {
    id: "wbs-program-sf",
    parentId: "wbs-portfolio-1",
    level: "program",
    name: "יישומי Salesforce במרכז למיפוי ישראל",
    nameEn: "Salesforce Applications - Israel Mapping Center",
    description:
      "תוכנית הטמעה ופיתוח של מערכות מבוססות Salesforce במרכז הממשלתי למיפוי ישראל",
    position: 2,
  },
  // Project 1: CRM (in maintenance, ended with 3 month overrun)
  {
    id: "wbs-project-sf-crm",
    parentId: "wbs-program-sf",
    level: "project",
    name: "CRM מבוסס Salesforce",
    nameEn: "Salesforce CRM",
    description:
      "מערכת ניהול קשרי לקוחות למרכז למיפוי ישראל. הסתיים ב-20/03/2026 עם חריגה של 3 חודשים. כעת בסטטוס תחזוקה.",
    methodology: "waterfall",
    position: 0,
  },
  // Project 2: Marketing, Sales & Revenue on Salesforce (real data from Excel)
  {
    id: "wbs-project-sf-marketing",
    parentId: "wbs-program-sf",
    level: "project",
    name: "יישומי שיווק מכירות והכנסות בפלטפורמת Salesforce",
    nameEn: "Salesforce Marketing, Sales & Revenue Applications",
    description:
      "ביצוע יישומים בפלטפורמת סיילספורס לטובת אגף שיווק, מכירות והכנסות. 14 מסלולי מכירה ב-4 סשנים + שלב תחזוקה. צפוי להסתיים 07/2028.",
    methodology: "agile",
    position: 1,
  },
  // Phase 1: Brief publication
  {
    id: "wbs-milestone-sf-brief",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "פרסום הבריף",
    nameEn: "Brief Publication (RFP)",
    deliverable: "מסמך בריף (RFP) שפורסם לקבלת הצעות מחיר",
    position: 0,
  },
  // Phase 2: Vendor selection
  {
    id: "wbs-milestone-sf-vendor",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "בחירת ספק זוכה",
    nameEn: "Vendor Selection",
    deliverable: "בחירת הספק הזוכה לאחר כנס ספקים וראיונות",
    position: 1,
  },
  // Phase 3-6: Implementation sessions
  {
    id: "wbs-milestone-sf-session1",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "אפיון ויישום סשן 1 (3 מתוך 14 מסלולים)",
    nameEn: "Session 1 Implementation (3 of 14 tracks)",
    deliverable: "3 מסלולי מכירה ראשונים באוויר",
    position: 2,
  },
  {
    id: "wbs-milestone-sf-session2",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "אפיון ויישום סשן 2 (3 מתוך 11 מסלולים)",
    nameEn: "Session 2 Implementation (3 of 11 tracks)",
    deliverable: "3 מסלולי מכירה נוספים באוויר",
    position: 3,
  },
  {
    id: "wbs-milestone-sf-session3",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "אפיון ויישום סשן 3 (4 מתוך 8 מסלולים)",
    nameEn: "Session 3 Implementation (4 of 8 tracks)",
    deliverable: "4 מסלולי מכירה נוספים באוויר",
    position: 4,
  },
  {
    id: "wbs-milestone-sf-session4",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "אפיון ויישום סשן 4 (3 מסלולים אחרונים)",
    nameEn: "Session 4 Implementation (final 3 tracks)",
    deliverable: "כל 14 מסלולי המכירה באוויר",
    position: 5,
  },
  // Phase 7: Project completion
  {
    id: "wbs-milestone-sf-completion",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "סיום הפרויקט",
    nameEn: "Project Completion",
    deliverable: "שו\"שים, תיקונים והתאמות - מערכת מושלמת",
    position: 6,
  },
  // Phase 8: Maintenance
  {
    id: "wbs-milestone-sf-maintenance",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "שלב תחזוקה",
    nameEn: "Maintenance Phase",
    deliverable: "מענה טכני שוטף",
    position: 7,
  },
  // Project 3 (sub-project): Task management - delayed!
  {
    id: "wbs-project-sf-tasks",
    parentId: "wbs-program-sf",
    level: "project",
    name: "יישום ניהול משימות מבוסס Salesforce",
    nameEn: "Salesforce-based Task Management Implementation",
    description:
      "תת-פרויקט להטמעת מערכת ניהול משימות פנימית מבוססת Salesforce. החל ב-01/08/2025, היה צפוי להסתיים ב-26/02/2026 וטרם הסתיים.",
    methodology: "kanban",
    position: 2,
  },
];

// ============================================
// Tasks
// ============================================
const today = new Date();
const daysFromNow = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const mockTasks: MockTask[] = [];

// ============================================
// AI Risks
// ============================================
export const mockRisks: MockRisk[] = [];

// ============================================
// Comments
// ============================================
export const mockComments: MockComment[] = [];

// ============================================
// Project Members - מי משתתף בכל פרויקט/תוכנית/פורטפוליו
// כולל תפקיד ואחוז משרה (FTE)
// ============================================
export const mockProjectMembers: MockProjectMember[] = [
  // ============================================
  // Portfolio: Digital Transformation 2026
  // ============================================
  {
    id: "pm-1",
    wbsNodeId: "wbs-portfolio-1",
    userId: "u6", // מנכ״ל - CEO
    roleInProject: "חסות בכירה (מנכ״ל)",
    roleInProjectEn: "Executive Sponsor (CEO)",
    ftePercent: 10,
    joinedAt: "2026-01-01",
  },
  {
    id: "pm-2",
    wbsNodeId: "wbs-portfolio-1",
    userId: "u2", // מנהל כלל הפעילויות
    roleInProject: "מנהל כלל הפעילויות",
    roleInProjectEn: "Head of Operations",
    ftePercent: 25,
    joinedAt: "2026-01-01",
  },
  {
    id: "pm-3",
    wbsNodeId: "wbs-portfolio-1",
    userId: "u5", // אחראית תכניות עבודה
    roleInProject: "אחראית תכניות עבודה",
    roleInProjectEn: "Work Plans Lead",
    ftePercent: 30,
    joinedAt: "2026-01-01",
  },

  // ============================================
  // Program: Cloud & Infrastructure (legacy)
  // ============================================
  {
    id: "pm-4",
    wbsNodeId: "wbs-program-1",
    userId: "u2", // ניר - מנהל כלל הפעילויות
    roleInProject: "מנהל תוכנית",
    roleInProjectEn: "Program Manager",
    ftePercent: 20,
    joinedAt: "2026-01-10",
  },

  // Program: AI & Automation (legacy)
  {
    id: "pm-5",
    wbsNodeId: "wbs-program-2",
    userId: "u2", // ניר
    roleInProject: "מנהל תוכנית",
    roleInProjectEn: "Program Manager",
    ftePercent: 15,
    joinedAt: "2026-02-01",
  },

  // Project: AWS Migration (legacy - kept for historical tasks)
  {
    id: "pm-6",
    wbsNodeId: "wbs-project-1",
    userId: "u2", // ניר
    roleInProject: "מנהל פרויקט",
    roleInProjectEn: "Project Manager",
    ftePercent: 20,
    joinedAt: "2026-02-15",
  },
  {
    id: "pm-7",
    wbsNodeId: "wbs-project-1",
    userId: "u5", // אסתר
    roleInProject: "תכניות עבודה ותיעוד",
    roleInProjectEn: "Planning & Documentation",
    ftePercent: 10,
    joinedAt: "2026-02-15",
  },

  // Project: Internal AI Platform (legacy)
  {
    id: "pm-8",
    wbsNodeId: "wbs-project-2",
    userId: "u2",
    roleInProject: "מנהל פרויקט",
    roleInProjectEn: "Project Manager",
    ftePercent: 10,
    joinedAt: "2026-02-25",
  },

  // ============================================
  // Salesforce Program (המוקד הארגוני העיקרי)
  // מנהל פרוגרמת Salesforce - מנהל פרוגרמה ומנהל פרויקטים טכני
  // ============================================
  {
    id: "pm-sf-1",
    wbsNodeId: "wbs-program-sf",
    userId: "u1", // מנהל פרוגרמת Salesforce
    roleInProject: "מנהל פרוגרמת Salesforce",
    roleInProjectEn: "Salesforce Program Manager",
    ftePercent: 50,
    joinedAt: "2025-08-01",
  },
  {
    id: "pm-sf-2",
    wbsNodeId: "wbs-program-sf",
    userId: "u6", // מנכ״ל
    roleInProject: "חסות מנכ״ל",
    roleInProjectEn: "CEO Sponsor",
    ftePercent: 5,
    joinedAt: "2025-08-01",
  },
  {
    id: "pm-sf-3",
    wbsNodeId: "wbs-program-sf",
    userId: "u2", // מנהל כלל הפעילויות
    roleInProject: "פיקוח תפעולי",
    roleInProjectEn: "Operations Oversight",
    ftePercent: 10,
    joinedAt: "2025-08-01",
  },
  {
    id: "pm-sf-4",
    wbsNodeId: "wbs-program-sf",
    userId: "u5", // אחראית תכניות עבודה
    roleInProject: "תכניות עבודה",
    roleInProjectEn: "Work Plans",
    ftePercent: 15,
    joinedAt: "2025-08-01",
  },

  // ============================================
  // Project: CRM מבוסס Salesforce - בעלים: בעלים - CRM
  // ============================================
  {
    id: "pm-sf-crm-1",
    wbsNodeId: "wbs-project-sf-crm",
    userId: "u4", // בעלים - CRM
    roleInProject: "בעלים - CRM",
    roleInProjectEn: "CRM Product Owner",
    ftePercent: 40,
    joinedAt: "2025-04-15",
  },
  {
    id: "pm-sf-crm-2",
    wbsNodeId: "wbs-project-sf-crm",
    userId: "u1", // מנהל פרוגרמת Salesforce
    roleInProject: "מנהל פרויקטים טכני",
    roleInProjectEn: "Technical Project Manager",
    ftePercent: 15,
    joinedAt: "2025-04-15",
  },
  {
    id: "pm-sf-crm-3",
    wbsNodeId: "wbs-project-sf-crm",
    userId: "u5", // אחראית תכניות עבודה
    roleInProject: "תיעוד ותכניות",
    roleInProjectEn: "Documentation & Plans",
    ftePercent: 10,
    joinedAt: "2026-03-01",
  },

  // ============================================
  // Project: יישומי שיווק מכירות והכנסות - from Excel
  // FTEs vary by phase (using average/peak from data)
  // ============================================
  {
    id: "pm-sf-mkt-1",
    wbsNodeId: "wbs-project-sf-marketing",
    userId: "u1", // מנהל פרוגרמת Salesforce - 50-70% across phases
    roleInProject: "מנהל פרויקטים טכני",
    roleInProjectEn: "Technical Project Manager",
    ftePercent: 50,
    joinedAt: "2025-09-01",
  },
  {
    id: "pm-sf-mkt-2",
    wbsNodeId: "wbs-project-sf-marketing",
    userId: "u3", // בעלים - שיווק ומכירות - 20-50% across phases
    roleInProject: "בעלים - שיווק מכירות והכנסות",
    roleInProjectEn: "Marketing, Sales & Revenue Owner",
    ftePercent: 30,
    joinedAt: "2025-09-01",
  },
  {
    id: "pm-sf-mkt-3",
    wbsNodeId: "wbs-project-sf-marketing",
    userId: "u2", // מנהל כלל הפעילויות - 10-20%
    roleInProject: "פיקוח תפעולי",
    roleInProjectEn: "Operations Oversight",
    ftePercent: 10,
    joinedAt: "2025-09-01",
  },

  // ============================================
  // Project: יישום ניהול משימות (sub-project)
  // מנהל פרוגרמת Salesforce כ-Owner + Technical PM
  // ============================================
  {
    id: "pm-sf-tsk-1",
    wbsNodeId: "wbs-project-sf-tasks",
    userId: "u1", // מנהל פרוגרמת Salesforce
    roleInProject: "בעלים + מנהל פרויקטים טכני",
    roleInProjectEn: "Owner + Technical Project Manager",
    ftePercent: 15,
    joinedAt: "2025-08-01",
  },
  {
    id: "pm-sf-tsk-2",
    wbsNodeId: "wbs-project-sf-tasks",
    userId: "u5", // אחראית תכניות עבודה
    roleInProject: "תיעוד ותכניות",
    roleInProjectEn: "Documentation & Plans",
    ftePercent: 10,
    joinedAt: "2025-08-01",
  },
];

// ============================================
// Automations
// ============================================
export const mockAutomations: MockAutomation[] = [
  {
    id: "a1",
    name: "התראה כשמשימה חורגת מ-SLA",
    enabled: true,
    trigger: "task.sla_exceeded",
    action: "notify.assignee + notify.manager",
  },
  {
    id: "a2",
    name: "סגירה אוטומטית של תת-משימות כאשר משימת אב מסתיימת",
    enabled: true,
    trigger: "task.status_changed_to_done",
    action: "subtasks.set_status_to_done",
  },
  {
    id: "a3",
    name: "יצירת תת-משימות אוטומטית מתיאור פרויקט",
    enabled: false,
    trigger: "project.created",
    action: "ai.generate_subtasks",
  },
];

// ============================================
// Helper functions (mock query layer)
// ============================================
export function getTasksByWbsNode(wbsNodeId: string): MockTask[] {
  return mockTasks.filter((t) => t.wbsNodeId === wbsNodeId);
}

export function getTasksByProject(projectId: string): MockTask[] {
  // Walk descendants of this project
  const descendantNodeIds = new Set<string>([projectId]);
  let queue = [projectId];
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      const children = mockWbsNodes.filter((n) => n.parentId === id).map((n) => n.id);
      children.forEach((c) => {
        descendantNodeIds.add(c);
        next.push(c);
      });
    }
    queue = next;
  }
  return mockTasks.filter((t) => descendantNodeIds.has(t.wbsNodeId));
}

export function getAllTasks(): MockTask[] {
  return [...mockTasks];
}

export function getRisksByTask(taskId: string): MockRisk[] {
  return mockRisks.filter((r) => r.taskId === taskId && !r.dismissed);
}

export function getAllActiveRisks(): MockRisk[] {
  return mockRisks.filter((r) => !r.dismissed);
}

export function getCommentsByTask(taskId: string): MockComment[] {
  return mockComments.filter((c) => c.taskId === taskId);
}

export function getUserById(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getWbsNodeById(id: string): MockWbsNode | undefined {
  return mockWbsNodes.find((n) => n.id === id);
}

export function getWbsChildren(parentId: string | null): MockWbsNode[] {
  return mockWbsNodes.filter((n) => n.parentId === parentId);
}

export function getTaskById(id: string): MockTask | undefined {
  return mockTasks.find((t) => t.id === id);
}

export function getProjects(): MockWbsNode[] {
  return mockWbsNodes.filter((n) => n.level === "project");
}

export function getPortfolios(): MockWbsNode[] {
  return mockWbsNodes.filter((n) => n.level === "portfolio");
}

export function getPrograms(): MockWbsNode[] {
  return mockWbsNodes.filter((n) => n.level === "program");
}

// ============================================
// Project Members helpers
// ============================================

/** משתתפים ישירים על node ספציפי */
export function getMembersOfNode(wbsNodeId: string): MockProjectMember[] {
  return mockProjectMembers.filter((m) => m.wbsNodeId === wbsNodeId);
}

/** כל המשתתפים על node + ה-ancestors שלו (היררכי) */
export function getAllMembersOfNodeRecursive(wbsNodeId: string): MockProjectMember[] {
  const nodeIds = new Set<string>([wbsNodeId]);
  // Walk descendants
  let queue = [wbsNodeId];
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      const children = mockWbsNodes.filter((n) => n.parentId === id).map((n) => n.id);
      children.forEach((c) => {
        nodeIds.add(c);
        next.push(c);
      });
    }
    queue = next;
  }
  const members = mockProjectMembers.filter((m) => nodeIds.has(m.wbsNodeId));
  // Dedupe by userId, prefer the one closest to the requested node
  const seen = new Set<string>();
  return members.filter((m) => {
    if (seen.has(m.userId)) return false;
    seen.add(m.userId);
    return true;
  });
}

/** כל ה-WBS nodes שמשתמש מסוים מעורב בהם */
export function getNodesForUser(userId: string): MockWbsNode[] {
  const memberNodeIds = new Set(
    mockProjectMembers.filter((m) => m.userId === userId).map((m) => m.wbsNodeId)
  );
  return mockWbsNodes.filter((n) => memberNodeIds.has(n.id));
}

/** כל המשימות הפתוחות של משתמש (לא done/cancelled) */
export function getOpenTasksForUser(userId: string): MockTask[] {
  return mockTasks.filter(
    (t) =>
      t.assigneeId === userId &&
      t.status !== "done" &&
      t.status !== "cancelled"
  );
}

/** כל המשימות של משתמש (כולל הושלמו) */
export function getAllTasksForUser(userId: string): MockTask[] {
  return mockTasks.filter((t) => t.assigneeId === userId);
}

/** חישוב זמן נותר במשימה עד plannedEnd */
export function getTimeRemaining(plannedEnd: string): {
  days: number;
  hours: number;
  isOverdue: boolean;
  label: Record<string, string>;
} {
  const now = Date.now();
  const end = new Date(plannedEnd).getTime();
  const diffMs = end - now;
  const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isOverdue = diffMs < 0;

  if (isOverdue) {
    if (days >= 1) {
      return { days, hours, isOverdue, label: {
        he: `איחור של ${days} ימים`, en: `${days}d overdue`,
        ru: `${days}д просрочка`, fr: `${days}j retard`, es: `${days}d retraso`,
      }};
    }
    return { days, hours, isOverdue, label: {
      he: `איחור של ${hours} שעות`, en: `${hours}h overdue`,
      ru: `${hours}ч просрочка`, fr: `${hours}h retard`, es: `${hours}h retraso`,
    }};
  }

  if (days >= 1) {
    return { days, hours, isOverdue, label: {
      he: `${days} ימים נותרו`, en: `${days}d left`,
      ru: `ещё ${days}д`, fr: `${days}j restants`, es: `${days}d restantes`,
    }};
  }
  return { days, hours, isOverdue, label: {
    he: `${hours} שעות נותרו`, en: `${hours}h left`,
    ru: `ещё ${hours}ч`, fr: `${hours}h restantes`, es: `${hours}h restantes`,
  }};
}
