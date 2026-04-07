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
  },
  {
    id: "u2",
    name: "שרה כהן",
    email: "sara@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Sara",
    locale: "he",
    role: "manager",
  },
  {
    id: "u3",
    name: "David Levi",
    email: "david@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=David",
    locale: "en",
    role: "member",
  },
  {
    id: "u4",
    name: "מאיה רוזן",
    email: "maya@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Maya",
    locale: "he",
    role: "member",
  },
  {
    id: "u5",
    name: "יוסי אברהם",
    email: "yossi@workos.demo",
    image: "https://api.dicebear.com/7.x/initials/svg?seed=Yossi",
    locale: "he",
    role: "member",
  },
];

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
