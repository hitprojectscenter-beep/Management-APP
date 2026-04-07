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
  image: string;
  locale: "he" | "en";
  role: UserRole;
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
  position: number;
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
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  estimateHours: number;
  actualHours: number;
  progressPercent: number;
  tags: string[];
  dependencies: string[];
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
 * מוגדר ל-"u6" (אתה - משתמש המרכז למיפוי).
 */
export const CURRENT_USER_ID = "u6";

// ============================================
// Users
// ============================================
export const mockUsers: MockUser[] = [
  {
    id: "u1",
    name: "אורי מרקוביץ'",
    email: "ori@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Ori",
    locale: "he",
    role: "admin",
    skills: ["pmo", "strategy", "compliance", "soc2", "salesforce"],
    performanceScore: 92,
    hourlyCapacity: 40,
  },
  {
    id: "u2",
    name: "שרה כהן",
    email: "sara@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Sara",
    locale: "he",
    role: "manager",
    skills: ["pmo", "procurement", "vendor-management", "rfp", "salesforce"],
    performanceScore: 88,
    hourlyCapacity: 40,
  },
  {
    id: "u3",
    name: "David Levi",
    email: "david@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=David",
    locale: "en",
    role: "member",
    skills: ["aws", "kubernetes", "devops", "terraform", "salesforce", "backend"],
    performanceScore: 85,
    hourlyCapacity: 40,
  },
  {
    id: "u4",
    name: "מאיה רוזן",
    email: "maya@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Maya",
    locale: "he",
    role: "member",
    skills: ["ai", "ml", "rag", "python", "claude-api", "data"],
    performanceScore: 78,
    hourlyCapacity: 40,
  },
  {
    id: "u5",
    name: "יוסי אברהם",
    email: "yossi@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Yossi",
    locale: "he",
    role: "member",
    skills: ["qa", "testing", "automation", "uat", "frontend"],
    performanceScore: 91,
    hourlyCapacity: 40,
  },
  {
    id: "u6",
    name: "משתמש המרכז למיפוי",
    email: "user@mapi.gov.il",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Mapi",
    locale: "he",
    role: "admin",
    skills: ["pmo", "salesforce", "procurement", "compliance", "government"],
    performanceScore: 87,
    hourlyCapacity: 40,
  },
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
    position: 0,
  },
  {
    id: "wbs-project-2",
    parentId: "wbs-program-2",
    level: "project",
    name: "פלטפורמת AI פנימית",
    nameEn: "Internal AI Platform",
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
    position: 0,
  },
  // Project 2: Marketing & Sales (in progress, two phases)
  {
    id: "wbs-project-sf-marketing",
    parentId: "wbs-program-sf",
    level: "project",
    name: "שירותי שיווק ומכירות מבוססי Salesforce",
    nameEn: "Salesforce Marketing & Sales Services",
    description:
      "שירותי שיווק ומכירות חדשים על תשתית Salesforce. צפוי להסתיים ב-01/09/2027.",
    position: 1,
  },
  // Project 2 phases / milestones
  {
    id: "wbs-milestone-sf-brief",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "פרסום הבריף",
    nameEn: "Brief Publication",
    deliverable: "מסמך RFI/בריף שפורסם לספקים",
    position: 0,
  },
  {
    id: "wbs-milestone-sf-vendor",
    parentId: "wbs-project-sf-marketing",
    level: "milestone",
    name: "בחירת ספק",
    nameEn: "Vendor Selection",
    deliverable: "בחירה והודעת זכייה לספק",
    position: 1,
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

export const mockTasks: MockTask[] = [
  {
    id: "task-1",
    wbsNodeId: "wbs-activity-1",
    parentTaskId: null,
    title: "מיפוי כל ה-IAM roles הקיימים",
    titleEn: "Map all existing IAM roles",
    description: "לסרוק את חשבון ה-AWS הראשי ולהפיק רשימה של כל ה-IAM roles, policies, ו-trust relationships",
    status: "done",
    priority: "high",
    assigneeId: "u2",
    plannedStart: daysFromNow(-14),
    plannedEnd: daysFromNow(-10),
    actualStart: daysFromNow(-14),
    actualEnd: daysFromNow(-9),
    estimateHours: 16,
    actualHours: 20,
    progressPercent: 100,
    tags: ["security", "aws"],
    dependencies: [],
  },
  {
    id: "task-2",
    wbsNodeId: "wbs-activity-1",
    parentTaskId: null,
    title: "כתיבת מדיניות אבטחה לפי SOC2",
    titleEn: "Write security policies per SOC2",
    description: "ניסוח מסמכי מדיניות בהתאם לדרישות SOC2 Type 2",
    status: "in_progress",
    priority: "critical",
    assigneeId: "u1",
    plannedStart: daysFromNow(-9),
    plannedEnd: daysFromNow(-2),
    actualStart: daysFromNow(-9),
    actualEnd: null,
    estimateHours: 40,
    actualHours: 32,
    progressPercent: 70,
    tags: ["compliance", "soc2"],
    dependencies: ["task-1"],
  },
  {
    id: "task-3",
    wbsNodeId: "wbs-activity-1",
    parentTaskId: null,
    title: "סקירת ארכיטקטורה עם CISO",
    titleEn: "Architecture review with CISO",
    description: "פגישת אישור סופי עם ה-CISO לפני המעבר",
    status: "not_started",
    priority: "high",
    assigneeId: "u1",
    plannedStart: daysFromNow(-1),
    plannedEnd: daysFromNow(2),
    actualStart: null,
    actualEnd: null,
    estimateHours: 8,
    actualHours: 0,
    progressPercent: 0,
    tags: ["meeting", "review"],
    dependencies: ["task-2"],
  },
  {
    id: "task-4",
    wbsNodeId: "wbs-activity-2",
    parentTaskId: null,
    title: "הקמת EKS cluster ב-staging",
    titleEn: "Provision EKS cluster in staging",
    description: "הקמת cluster Kubernetes חדש בסביבת staging עם 3 node groups",
    status: "in_progress",
    priority: "high",
    assigneeId: "u3",
    plannedStart: daysFromNow(-7),
    plannedEnd: daysFromNow(-3),
    actualStart: daysFromNow(-7),
    actualEnd: null,
    estimateHours: 24,
    actualHours: 28,
    progressPercent: 80,
    tags: ["k8s", "infra"],
    dependencies: [],
  },
  {
    id: "task-5",
    wbsNodeId: "wbs-activity-2",
    parentTaskId: null,
    title: "Migration scripts ל-database",
    titleEn: "Database migration scripts",
    status: "blocked",
    priority: "critical",
    assigneeId: "u4",
    plannedStart: daysFromNow(-3),
    plannedEnd: daysFromNow(4),
    actualStart: daysFromNow(-3),
    actualEnd: null,
    estimateHours: 32,
    actualHours: 12,
    progressPercent: 35,
    tags: ["database", "migration"],
    dependencies: ["task-4"],
  },
  {
    id: "task-6",
    wbsNodeId: "wbs-activity-2",
    parentTaskId: null,
    title: "Load testing - Payment API",
    titleEn: "Load testing - Payment API",
    status: "not_started",
    priority: "high",
    assigneeId: "u5",
    plannedStart: daysFromNow(4),
    plannedEnd: daysFromNow(8),
    actualStart: null,
    actualEnd: null,
    estimateHours: 16,
    actualHours: 0,
    progressPercent: 0,
    tags: ["testing", "performance"],
    dependencies: ["task-5"],
  },
  {
    id: "task-7",
    wbsNodeId: "wbs-activity-2",
    parentTaskId: null,
    title: "Production cutover plan",
    titleEn: "Production cutover plan",
    status: "not_started",
    priority: "critical",
    assigneeId: "u2",
    plannedStart: daysFromNow(8),
    plannedEnd: daysFromNow(12),
    actualStart: null,
    actualEnd: null,
    estimateHours: 12,
    actualHours: 0,
    progressPercent: 0,
    tags: ["planning"],
    dependencies: ["task-6"],
  },
  {
    id: "task-8",
    wbsNodeId: "wbs-project-2",
    parentTaskId: null,
    title: "POC - Claude API integration",
    titleEn: "POC - Claude API integration",
    description: "בניית POC לאינטגרציה עם Claude API לסיכום אוטומטי של פגישות",
    status: "review",
    priority: "medium",
    assigneeId: "u3",
    plannedStart: daysFromNow(-10),
    plannedEnd: daysFromNow(-5),
    actualStart: daysFromNow(-10),
    actualEnd: daysFromNow(-4),
    estimateHours: 20,
    actualHours: 22,
    progressPercent: 100,
    tags: ["ai", "poc"],
    dependencies: [],
  },
  {
    id: "task-9",
    wbsNodeId: "wbs-project-2",
    parentTaskId: null,
    title: "תשתית RAG על המסמכים הפנימיים",
    titleEn: "RAG infrastructure on internal docs",
    status: "in_progress",
    priority: "high",
    assigneeId: "u4",
    plannedStart: daysFromNow(-5),
    plannedEnd: daysFromNow(5),
    actualStart: daysFromNow(-5),
    actualEnd: null,
    estimateHours: 60,
    actualHours: 35,
    progressPercent: 50,
    tags: ["ai", "rag"],
    dependencies: ["task-8"],
  },
  {
    id: "task-10",
    wbsNodeId: "wbs-project-2",
    parentTaskId: null,
    title: "ממשק משתמש לעוזר AI",
    titleEn: "AI assistant UI",
    status: "not_started",
    priority: "medium",
    assigneeId: "u5",
    plannedStart: daysFromNow(5),
    plannedEnd: daysFromNow(15),
    actualStart: null,
    actualEnd: null,
    estimateHours: 40,
    actualHours: 0,
    progressPercent: 0,
    tags: ["ui", "ai"],
    dependencies: ["task-9"],
  },

  // ============================================
  // Salesforce CRM (in maintenance, finished with 3-month overrun)
  // Started 15/04/2025, ended 20/03/2026
  // ============================================
  {
    id: "sf-task-1",
    wbsNodeId: "wbs-project-sf-crm",
    parentTaskId: null,
    title: "תחזוקה שוטפת - CRM",
    titleEn: "Routine maintenance - CRM",
    description:
      "תחזוקה חודשית של מערכת ה-CRM: עדכוני אבטחה, גיבויים, ניטור ביצועים, וטיפול בתקלות שוטפות.",
    status: "in_progress",
    priority: "medium",
    assigneeId: "u6",
    plannedStart: "2026-03-20T00:00:00.000Z",
    plannedEnd: "2026-12-31T00:00:00.000Z",
    actualStart: "2026-03-20T00:00:00.000Z",
    actualEnd: null,
    estimateHours: 200,
    actualHours: 24,
    progressPercent: 12,
    tags: ["maintenance", "salesforce", "crm"],
    dependencies: [],
  },
  {
    id: "sf-task-2",
    wbsNodeId: "wbs-project-sf-crm",
    parentTaskId: null,
    title: "סיכום פרויקט CRM וניתוח חריגה",
    titleEn: "CRM project closure & overrun analysis",
    description:
      "מסמך retrospective על הפרויקט שהסתיים עם חריגה של 3 חודשים. ניתוח גורמים, המלצות לפרויקטים הבאים.",
    status: "done",
    priority: "high",
    assigneeId: "u6",
    plannedStart: "2026-03-15T00:00:00.000Z",
    plannedEnd: "2026-03-30T00:00:00.000Z",
    actualStart: "2026-03-21T00:00:00.000Z",
    actualEnd: "2026-04-01T00:00:00.000Z",
    estimateHours: 24,
    actualHours: 28,
    progressPercent: 100,
    tags: ["retrospective", "documentation"],
    dependencies: [],
  },

  // ============================================
  // Salesforce Marketing & Sales
  // Started 01/09/2025, expected end 01/09/2027
  // Phases: brief publication, vendor selection
  // ============================================
  {
    id: "sf-task-3",
    wbsNodeId: "wbs-milestone-sf-brief",
    parentTaskId: null,
    title: "כתיבת מסמך הדרישות לבריף",
    titleEn: "Write requirements document for brief",
    description:
      "ניסוח מסמך הדרישות הפונקציונליות והלא-פונקציונליות ל-RFI שיפורסם לספקי Salesforce.",
    status: "done",
    priority: "high",
    assigneeId: "u6",
    plannedStart: "2025-09-01T00:00:00.000Z",
    plannedEnd: "2025-11-30T00:00:00.000Z",
    actualStart: "2025-09-01T00:00:00.000Z",
    actualEnd: "2025-12-15T00:00:00.000Z",
    estimateHours: 80,
    actualHours: 95,
    progressPercent: 100,
    tags: ["requirements", "rfi"],
    dependencies: [],
  },
  {
    id: "sf-task-4",
    wbsNodeId: "wbs-milestone-sf-brief",
    parentTaskId: null,
    title: "פרסום הבריף לספקים",
    titleEn: "Publish brief to vendors",
    description:
      "פרסום ה-RFI הסופי בערוצי הרכש הממשלתיים. כולל מענה לשאלות ספקים ואירוע הצגה.",
    status: "in_progress",
    priority: "high",
    assigneeId: "u6",
    plannedStart: "2026-01-15T00:00:00.000Z",
    plannedEnd: "2026-04-30T00:00:00.000Z",
    actualStart: "2026-02-01T00:00:00.000Z",
    actualEnd: null,
    estimateHours: 60,
    actualHours: 35,
    progressPercent: 60,
    tags: ["procurement", "rfi"],
    dependencies: ["sf-task-3"],
  },
  {
    id: "sf-task-5",
    wbsNodeId: "wbs-milestone-sf-vendor",
    parentTaskId: null,
    title: "ועדת בחינת הצעות וניקוד",
    titleEn: "Proposal review committee & scoring",
    description:
      "כינוס ועדת בחינה, ניקוד הצעות לפי קריטריונים, ראיונות עם ספקים, והמלצה לבחירה.",
    status: "not_started",
    priority: "critical",
    assigneeId: "u6",
    plannedStart: "2026-05-01T00:00:00.000Z",
    plannedEnd: "2026-08-31T00:00:00.000Z",
    actualStart: null,
    actualEnd: null,
    estimateHours: 120,
    actualHours: 0,
    progressPercent: 0,
    tags: ["procurement", "evaluation"],
    dependencies: ["sf-task-4"],
  },
  {
    id: "sf-task-6",
    wbsNodeId: "wbs-milestone-sf-vendor",
    parentTaskId: null,
    title: "חוזה התקשרות עם הספק הזוכה",
    titleEn: "Contract with selected vendor",
    description: "ניסוח, משא ומתן וחתימה על חוזה ההתקשרות.",
    status: "not_started",
    priority: "critical",
    assigneeId: "u6",
    plannedStart: "2026-09-01T00:00:00.000Z",
    plannedEnd: "2026-11-30T00:00:00.000Z",
    actualStart: null,
    actualEnd: null,
    estimateHours: 80,
    actualHours: 0,
    progressPercent: 0,
    tags: ["procurement", "legal"],
    dependencies: ["sf-task-5"],
  },

  // ============================================
  // Salesforce Task Management Implementation
  // Started 01/08/2025, was expected 26/02/2026, NOT done (overdue!)
  // ============================================
  {
    id: "sf-task-7",
    wbsNodeId: "wbs-project-sf-tasks",
    parentTaskId: null,
    title: "אפיון מערכת ניהול משימות",
    titleEn: "Task management system specification",
    description:
      "אפיון מלא של פונקציונליות, מודל נתונים ו-workflows למערכת ניהול המשימות מבוססת Salesforce.",
    status: "done",
    priority: "high",
    assigneeId: "u6",
    plannedStart: "2025-08-01T00:00:00.000Z",
    plannedEnd: "2025-10-31T00:00:00.000Z",
    actualStart: "2025-08-01T00:00:00.000Z",
    actualEnd: "2025-12-10T00:00:00.000Z",
    estimateHours: 120,
    actualHours: 160,
    progressPercent: 100,
    tags: ["specification", "salesforce"],
    dependencies: [],
  },
  {
    id: "sf-task-8",
    wbsNodeId: "wbs-project-sf-tasks",
    parentTaskId: null,
    title: "פיתוח אובייקטים מותאמים ב-Salesforce",
    titleEn: "Custom Salesforce objects development",
    description:
      "בניית Custom Objects, Fields, Relationships, Page Layouts ו-Validation Rules.",
    status: "in_progress",
    priority: "critical",
    assigneeId: "u6",
    plannedStart: "2025-11-01T00:00:00.000Z",
    plannedEnd: "2026-01-31T00:00:00.000Z",
    actualStart: "2025-12-15T00:00:00.000Z",
    actualEnd: null,
    estimateHours: 200,
    actualHours: 180,
    progressPercent: 75,
    tags: ["development", "salesforce", "custom"],
    dependencies: ["sf-task-7"],
  },
  {
    id: "sf-task-9",
    wbsNodeId: "wbs-project-sf-tasks",
    parentTaskId: null,
    title: "אינטגרציה עם מערכות פנימיות",
    titleEn: "Integration with internal systems",
    description:
      "חיבור מערכת ניהול המשימות החדשה למערכות הקיימות במרכז למיפוי ישראל (ERP, HR, Active Directory).",
    status: "blocked",
    priority: "critical",
    assigneeId: "u6",
    plannedStart: "2026-02-01T00:00:00.000Z",
    plannedEnd: "2026-02-26T00:00:00.000Z",
    actualStart: "2026-02-15T00:00:00.000Z",
    actualEnd: null,
    estimateHours: 100,
    actualHours: 65,
    progressPercent: 50,
    tags: ["integration", "blocked", "salesforce"],
    dependencies: ["sf-task-8"],
  },
  {
    id: "sf-task-10",
    wbsNodeId: "wbs-project-sf-tasks",
    parentTaskId: null,
    title: "בדיקות UAT ומעבר לייצור",
    titleEn: "UAT testing and production rollout",
    description:
      "User Acceptance Testing מול משתמשי קצה, איסוף משוב, תיקונים ומעבר לייצור.",
    status: "not_started",
    priority: "critical",
    assigneeId: "u6",
    plannedStart: "2026-02-15T00:00:00.000Z",
    plannedEnd: "2026-02-26T00:00:00.000Z",
    actualStart: null,
    actualEnd: null,
    estimateHours: 80,
    actualHours: 0,
    progressPercent: 0,
    tags: ["testing", "uat", "rollout"],
    dependencies: ["sf-task-9"],
  },
];

// ============================================
// AI Risks
// ============================================
export const mockRisks: MockRisk[] = [
  {
    id: "risk-1",
    taskId: "task-5",
    severity: "high",
    type: "blocked_dependency",
    message: "המשימה חסומה מעל 24 שעות וחוסמת 2 משימות במסלול הקריטי",
    messageEn: "Task blocked >24h and is blocking 2 critical-path tasks",
    suggestion: "שקול הקצאת משאבים נוספים או פיצול המשימה",
    detectedAt: daysFromNow(-1),
    dismissed: false,
  },
  {
    id: "risk-2",
    taskId: "task-2",
    severity: "medium",
    type: "schedule_slip",
    message: "ההתקדמות איטית ב-15% מהמתוכנן - צפוי איחור של 2 ימים",
    messageEn: "Progress 15% behind schedule - expected delay 2 days",
    suggestion: "עדכן את ה-baseline או הוסף משאב",
    detectedAt: daysFromNow(0),
    dismissed: false,
  },
  {
    id: "risk-3",
    taskId: "task-4",
    severity: "low",
    type: "effort_overrun",
    message: "בוצעו 28 שעות מתוך 24 מתוכננות - חריגה של 17%",
    messageEn: "28 hours spent vs 24 planned - 17% overrun",
    suggestion: "אם הקצב נשמר, צפויה חריגה כוללת של 8 שעות",
    detectedAt: daysFromNow(0),
    dismissed: false,
  },
  {
    id: "risk-4",
    taskId: "task-7",
    severity: "critical",
    type: "milestone_risk",
    message: "תוכנית cutover ייצור עדיין לא החלה - 12 ימים לפני milestone קריטי",
    messageEn: "Production cutover plan not started - 12 days to critical milestone",
    suggestion: "התחל מיד ושקול דחיית milestone",
    detectedAt: daysFromNow(0),
    dismissed: false,
  },
];

// ============================================
// Comments
// ============================================
export const mockComments: MockComment[] = [
  {
    id: "c1",
    taskId: "task-2",
    authorId: "u2",
    body: "סיימתי טיוטה ראשונה של פרק האימות. אשמח לסקירה.",
    createdAt: daysFromNow(-3),
  },
  {
    id: "c2",
    taskId: "task-2",
    authorId: "u1",
    body: "נראה טוב. צריך להוסיף סעיף על MFA enforcement.",
    createdAt: daysFromNow(-2),
  },
  {
    id: "c3",
    taskId: "task-5",
    authorId: "u4",
    body: "אני חסומה - צוות ה-DBA לא מוכן לתת לי גישה ל-snapshot של production. צריך escalation.",
    createdAt: daysFromNow(-1),
  },
];

// ============================================
// Project Members - מי משתתף בכל פרויקט/תוכנית/פורטפוליו
// כולל תפקיד ואחוז משרה (FTE)
// ============================================
export const mockProjectMembers: MockProjectMember[] = [
  // Portfolio: Digital Transformation 2026
  {
    id: "pm-1",
    wbsNodeId: "wbs-portfolio-1",
    userId: "u1",
    roleInProject: "מנהל פורטפוליו",
    roleInProjectEn: "Portfolio Manager",
    ftePercent: 50,
    joinedAt: "2026-01-01",
  },
  {
    id: "pm-2",
    wbsNodeId: "wbs-portfolio-1",
    userId: "u2",
    roleInProject: "PMO Lead",
    roleInProjectEn: "PMO Lead",
    ftePercent: 30,
    joinedAt: "2026-01-15",
  },

  // Program: Cloud & Infrastructure
  {
    id: "pm-3",
    wbsNodeId: "wbs-program-1",
    userId: "u1",
    roleInProject: "Sponsor",
    roleInProjectEn: "Sponsor",
    ftePercent: 20,
    joinedAt: "2026-01-10",
  },
  {
    id: "pm-4",
    wbsNodeId: "wbs-program-1",
    userId: "u2",
    roleInProject: "מנהלת תוכנית",
    roleInProjectEn: "Program Manager",
    ftePercent: 60,
    joinedAt: "2026-01-10",
  },
  {
    id: "pm-5",
    wbsNodeId: "wbs-program-1",
    userId: "u3",
    roleInProject: "Architect",
    roleInProjectEn: "Architect",
    ftePercent: 40,
    joinedAt: "2026-01-20",
  },

  // Program: AI & Automation
  {
    id: "pm-6",
    wbsNodeId: "wbs-program-2",
    userId: "u1",
    roleInProject: "Executive Sponsor",
    roleInProjectEn: "Executive Sponsor",
    ftePercent: 15,
    joinedAt: "2026-02-01",
  },
  {
    id: "pm-7",
    wbsNodeId: "wbs-program-2",
    userId: "u4",
    roleInProject: "מנהלת AI",
    roleInProjectEn: "AI Lead",
    ftePercent: 80,
    joinedAt: "2026-02-01",
  },

  // Project: AWS Migration
  {
    id: "pm-8",
    wbsNodeId: "wbs-project-1",
    userId: "u1",
    roleInProject: "Project Owner",
    roleInProjectEn: "Project Owner",
    ftePercent: 30,
    joinedAt: "2026-02-15",
  },
  {
    id: "pm-9",
    wbsNodeId: "wbs-project-1",
    userId: "u2",
    roleInProject: "מנהלת פרויקט",
    roleInProjectEn: "Project Manager",
    ftePercent: 70,
    joinedAt: "2026-02-15",
  },
  {
    id: "pm-10",
    wbsNodeId: "wbs-project-1",
    userId: "u3",
    roleInProject: "Tech Lead",
    roleInProjectEn: "Tech Lead",
    ftePercent: 75,
    joinedAt: "2026-02-20",
  },
  {
    id: "pm-11",
    wbsNodeId: "wbs-project-1",
    userId: "u4",
    roleInProject: "DevOps Engineer",
    roleInProjectEn: "DevOps Engineer",
    ftePercent: 50,
    joinedAt: "2026-03-01",
  },
  {
    id: "pm-12",
    wbsNodeId: "wbs-project-1",
    userId: "u5",
    roleInProject: "QA Lead",
    roleInProjectEn: "QA Lead",
    ftePercent: 40,
    joinedAt: "2026-03-05",
  },

  // Project: Internal AI Platform
  {
    id: "pm-13",
    wbsNodeId: "wbs-project-2",
    userId: "u1",
    roleInProject: "Stakeholder",
    roleInProjectEn: "Stakeholder",
    ftePercent: 10,
    joinedAt: "2026-02-25",
  },
  {
    id: "pm-14",
    wbsNodeId: "wbs-project-2",
    userId: "u4",
    roleInProject: "מובילת AI",
    roleInProjectEn: "AI Lead",
    ftePercent: 60,
    joinedAt: "2026-02-25",
  },
  {
    id: "pm-15",
    wbsNodeId: "wbs-project-2",
    userId: "u3",
    roleInProject: "Backend Engineer",
    roleInProjectEn: "Backend Engineer",
    ftePercent: 50,
    joinedAt: "2026-03-01",
  },
  {
    id: "pm-16",
    wbsNodeId: "wbs-project-2",
    userId: "u5",
    roleInProject: "Frontend Engineer",
    roleInProjectEn: "Frontend Engineer",
    ftePercent: 50,
    joinedAt: "2026-03-10",
  },

  // ============================================
  // Current user (u6) - Salesforce program ownership
  // ============================================
  {
    id: "pm-17",
    wbsNodeId: "wbs-program-sf",
    userId: "u6",
    roleInProject: "מנהל תוכנית Salesforce",
    roleInProjectEn: "Salesforce Program Manager",
    ftePercent: 30,
    joinedAt: "2025-08-01",
  },
  {
    id: "pm-18",
    wbsNodeId: "wbs-project-sf-crm",
    userId: "u6",
    roleInProject: "אחראי תחזוקה",
    roleInProjectEn: "Maintenance Owner",
    ftePercent: 15,
    joinedAt: "2026-03-20",
  },
  {
    id: "pm-19",
    wbsNodeId: "wbs-project-sf-marketing",
    userId: "u6",
    roleInProject: "מנהל פרויקט",
    roleInProjectEn: "Project Manager",
    ftePercent: 25,
    joinedAt: "2025-09-01",
  },
  {
    id: "pm-20",
    wbsNodeId: "wbs-project-sf-tasks",
    userId: "u6",
    roleInProject: "Project Owner",
    roleInProjectEn: "Project Owner",
    ftePercent: 30,
    joinedAt: "2025-08-01",
  },
  // Add team members to Salesforce projects so the team panel isn't empty
  {
    id: "pm-21",
    wbsNodeId: "wbs-project-sf-tasks",
    userId: "u3",
    roleInProject: "Salesforce Developer",
    roleInProjectEn: "Salesforce Developer",
    ftePercent: 60,
    joinedAt: "2025-11-01",
  },
  {
    id: "pm-22",
    wbsNodeId: "wbs-project-sf-marketing",
    userId: "u2",
    roleInProject: "אחראית רכש",
    roleInProjectEn: "Procurement Lead",
    ftePercent: 40,
    joinedAt: "2025-09-01",
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
  label: { he: string; en: string };
} {
  const now = Date.now();
  const end = new Date(plannedEnd).getTime();
  const diffMs = end - now;
  const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isOverdue = diffMs < 0;

  if (isOverdue) {
    if (days >= 1) {
      return { days, hours, isOverdue, label: { he: `איחור של ${days} ימים`, en: `${days}d overdue` } };
    }
    return { days, hours, isOverdue, label: { he: `איחור של ${hours} שעות`, en: `${hours}h overdue` } };
  }

  if (days >= 1) {
    return { days, hours, isOverdue, label: { he: `${days} ימים נותרו`, en: `${days}d left` } };
  }
  return { days, hours, isOverdue, label: { he: `${hours} שעות נותרו`, en: `${hours}h left` } };
}
