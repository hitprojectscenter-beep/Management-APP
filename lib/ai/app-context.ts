/**
 * Comprehensive PMO++ system context for the AI assistant.
 *
 * This is the SINGLE SOURCE OF TRUTH for what the assistant knows about
 * the application. Feed it into the LLM system prompt so any question —
 * about pages, features, workflows, data, or business logic — gets an
 * accurate, grounded answer instead of the model making things up.
 *
 * Localized for the 5 supported UI languages (he/en/ru/fr/es).
 */

import {
  mockTasks,
  mockUsers,
  mockProjectMembers,
  getProjects,
  CURRENT_USER_ID,
  getUserById,
} from "../db/mock-data";
import { calculateProjectHealth, scanTasksForRisks } from "./risk-engine";

/**
 * Built once per request — current organizational state (tasks, users,
 * health) the assistant should reference when answering "what's going on?"
 * questions.
 */
export function buildLiveSnapshot(): string {
  const projects = getProjects();
  const currentUser = getUserById(CURRENT_USER_ID);
  const health = calculateProjectHealth(mockTasks);
  const risks = scanTasksForRisks(mockTasks);

  const blocked = mockTasks.filter((t) => t.status === "blocked");
  const overdue = mockTasks.filter(
    (t) =>
      t.plannedEnd &&
      new Date(t.plannedEnd).getTime() < Date.now() &&
      t.status !== "done" &&
      t.status !== "cancelled"
  );
  const inProgress = mockTasks.filter((t) => t.status === "in_progress");
  const done = mockTasks.filter((t) => t.status === "done");

  const overloaded = mockUsers
    .map((u) => ({
      name: u.name,
      role: u.role,
      fte: mockProjectMembers
        .filter((m) => m.userId === u.id)
        .reduce((s, m) => s + m.ftePercent, 0),
    }))
    .filter((u) => u.fte > 80);

  return `
CURRENT STATE (live, ${new Date().toISOString().slice(0, 10)}):
- Active user: ${currentUser?.name || "unknown"} (role: ${currentUser?.role || "unknown"}, id: ${currentUser?.id || "?"})
- Projects: ${projects.length} active
- Tasks: ${mockTasks.length} total — ${done.length} done, ${inProgress.length} in progress, ${blocked.length} blocked, ${overdue.length} overdue
- Project health score: ${health.score}/100 (${health.status})
- Active risks: ${risks.length}
- Overloaded users (>80% FTE): ${overloaded.length}${overloaded.length ? " — " + overloaded.map((u) => `${u.name} ${u.fte}%`).join(", ") : ""}
- Project list: ${projects.map((p) => `"${p.name}"`).join(", ")}
- Team: ${mockUsers.map((u) => `${u.name} (${u.role})`).join(", ")}
`.trim();
}

/**
 * Static facts about the PMO++ system — what it is, what it does, what
 * pages exist, what data lives where. Stable across requests; localized.
 */
export const APP_FACTS: Record<string, string> = {
  he: `מה זה PMO++ — בקצרה:
פלטפורמת ניהול פרויקטים פנים-ארגונית של המרכז למיפוי ישראל (Israel Mapping Center).
המערכת מגשרת בין אסטרטגיה לביצוע — עם תמיכה מלאה ב-RTL, חמש שפות, AI מבוסס Gemini, וגישה גם מ-Mobile/PWA.

ארכיטקטורת מידע — היררכיה:
פורטפוליו → תוכנית → פרויקט → WBS (חבילות עבודה) → משימה → תת-משימה.
Roll-up אוטומטי: שעות, התקדמות, תאריכים ועלויות מתגלגלים מעלה דרך כל הרמות.

תפריט ניווט (15 דפים):
1. **המשימות שלי** (דף הבית /) — המשימות הפתוחות שלך, מסוננות לפי סטטוס/דחיפות, עם כפתור הוסף משימה.
2. **דשבורדים ו-KPI** (/dashboard) — 17 KPIs (10 בסיסיים + 7 מתקדמים) עם בורר תפקיד PM/PMO, בועות מידע אינטראקטיביות, EVM, ROI, RAG.
3. **לוח גאנט** (/gantt) — Gantt מתקדם עם נתיב קריטי (CPM), אבני דרך, חוצץ זמן, תכנון מול ביצוע, ייצוא Excel/PDF.
4. **WBS** (/wbs) — עץ היררכי רקורסיבי עם מספור 1.1.1, Roll-up משוקלל לפי שעות.
5. **ניהול סיכונים** (/risks) — זיהוי 5 סוגי סיכונים, מטריצת בריאות, חיזוי תאריך סיום, אפקט שרשרת תלויות.
6. **פורטפוליו** (/portfolios) — תצוגה צרובה עם rollup לכל פרוגרמה.
7. **פרויקטים** (/projects) — רשת כרטיסי פרויקטים עם health score; דף פרויקט בודד עם 4 תצוגות: רשימה / קנבן / גאנט / יומן.
8. **משימות** (/tasks) — טבלת כל המשימות בארגון.
9. **יומן** (/calendar) — month view אינטראקטיבי, לחיצה על משימה פותחת popup, סנכרון Google Calendar.
10. **מרכז AI** (/ai) — AI Sidekick chat + תוכנית גידור סיכונים.
11. **דוחות** (/reports) — ייצוא PDF (window.print עם print stylesheet).
12. **אוטומציות** (/automations) — בנאי No-Code עם 5 תבניות, 8 טריגרים, 4 תנאים, 8 פעולות.
13. **צוות** (/team) — כרטיסי חברי צוות + הזמנת חבר חדש (טופס שם/תפקיד/חטיבה/אגף/טל'/מייל).
14. **ניהול מערכת** (/admin, אדמין בלבד) — 6 טאבים: משתמשים, הרשאות, סוגי פריטים, שיוך היררכי, טבלת הרשאות, יומן פעילות.
15. **הגדרות** (/settings) — Theme, שפה, פרטיות.

תפקידים והרשאות (RBAC דינמי):
5 תפקידים מובנים — Admin / Manager / Member / Viewer / Guest + תפקידים מותאמים.
מטריצת 12 הרשאות אינטראקטיבית. החלפת תפקיד דרך כפתור בסרגל העליון — הממשק משתנה מיידית.
מנכ"ל (u6) הוא Manager: צופה ומעדכן בכל, אך לא מוסיף/מוחק משתמשים. רק Admin (מארק ישראל, u1) מנהל משתמשים.

הזדהות ואבטחת מידע (PostgreSQL — חדש ופעיל):
- כל משתמש נכנס במסך /login עם **מייל + סיסמה אישית** משלו. אין יותר סיסמה משותפת — בהזדהות האמיתית כל אחד רואה רק את עצמו.
- אבטחה: סיסמאות מוצפנות bcrypt+pepper · sessions צד-שרת הניתנים לביטול (עוגיית httpOnly+SameSite=Strict) · נעילת חשבון אחרי 5 ניסיונות כושלים · audit log מלא — בהתאם לתקנות הגנת הפרטיות (אבטחת מידע) התשע"ז ומתודולוגיית מערך הסייבר.
- **ניהול משתמשים (אדמין בלבד)**: /admin → טאב "משתמשים" → הוספת משתמש (מקבל סיסמה זמנית + חיוב החלפה בכניסה ראשונה), שינוי תפקיד, שינוי מנהל ישיר, איפוס סיסמה, השבתה/הפעלה, מחיקה — כל שינוי נשמר מיד ב-Neon ונרשם ב-audit. אדמין אינו יכול להשבית/לשנמך את עצמו.
- **מנהל ישיר** (היררכיית ארגון): חגי רונן (מנכ"ל) ← ניר ברלוביץ' ← מארק ישראל; אלעד/אפרים/אסתר מדווחים לניר.
- יציאה: תפריט החשבון בסרגל העליון → "התנתקות".

עוזר אישי קולי (PMO++ Assistant):
- כפתור צף סגול בפינה. תמיכה ב-STT (Web Speech API + MediaRecorder fallback) ו-TTS חכם.
- TTS עם הגיית קיצורים נכונה: לו"ז → "luz", מנכ"ל → "מנכל", ת"א → "תל אביב".
- חלוקה אוטומטית למקטעים של 350 תווים → תשובות ארוכות מוקראות עד הסוף.
- 5 שפות מלאות עם אכיפת שפה ב-Gemini system prompt.
- מצב שיחה (Conversation mode): האזנה אוטומטית אחרי כל תשובה.

מנוע סיכונים (AI Risk Engine):
5 סוגי סיכונים מזוהים אוטומטית: blocked, overdue, effort_overrun, schedule_slip, critical_not_started.
חיזוי תאריך סיום ע"פ velocity + avg slip. אפקט שרשרת BFS על גרף תלויות.
תכנית גידור עם 4 קטגוריות פעולה: resource / schedule / scope / process / escalation.
שיוך מחדש חכם: skill match (40%) + availability (35%) + performance (25%).

KPIs (17 סך הכל):
PM: Schedule Variance, Milestone Slippage, Throughput, Budget Adherence, CPI, SPI, Rework Rate.
PMO: Strategic Alignment, ROI, Capacity vs Demand, Risk Trend, Decision Latency, NPS, Burnout Risk, AI Adoption Rate, RAG, EVM.
כל הכרטיסים לחיצים עם בועת מידע מפורטת. מבוסס תקני PMBOK / EVM / McKinsey / Bain / MBI / Gartner.

טכנולוגיות (Stack):
Next.js 15 App Router (React 19), TypeScript strict, Tailwind CSS, shadcn/ui (יד), Drizzle ORM (schema מוכן ל-Postgres), CASL לRBAC, next-intl (5 שפות + RTL), Radix UI, dnd-kit (Kanban), recharts (גרפים), pptxgenjs (מצגות), Sonner (toasts), Google Gemini API, מנוע Gantt מותאם אישית (לא ספרייה).

בסיס נתונים:
**מחובר Neon PostgreSQL** — הטבלאות users / user_sessions / auth_audit_log פעילות, וההזדהות והמשתמשים אמיתיים ב-DB. שאר הנתונים (משימות/פרויקטים/WBS) עדיין על Mock data layer (lib/db/mock-data.ts, נתונים מהאקסל של פרויקט Salesforce) ויעברו ל-DB בהדרגה.

פריסה:
Vercel Production. URL: https://management-app-...vercel.app. כל push ל-main מפעיל deploy אוטומטי.`,

  en: `What is PMO++ — in brief:
Internal project management platform for the Israel Mapping Center.
Bridges strategy and execution — full RTL, 5 languages, AI assistant via Gemini, Mobile/PWA support.

Information architecture — hierarchy:
Portfolio → Program → Project → WBS (work packages) → Task → Subtask.
Automatic roll-up: hours, progress, dates, costs flow up through all levels.

Navigation menu (15 pages):
1. **My Tasks** (/) — Your open tasks, filtered by status/urgency, with Add Task button.
2. **Dashboards & KPI** (/dashboard) — 17 KPIs (10 core + 7 advanced) with PM/PMO role switcher, interactive info bubbles, EVM, ROI, RAG.
3. **Gantt** (/gantt) — Advanced Gantt with Critical Path (CPM), milestones, time buffer, plan vs actual, Excel/PDF export.
4. **WBS** (/wbs) — Recursive hierarchical tree with 1.1.1 numbering, weighted roll-up by hours.
5. **Risks** (/risks) — Detects 5 risk types, health matrix, end-date forecast, dependency cascade effect.
6. **Portfolios** (/portfolios) — Compact view with rollup per program.
7. **Projects** (/projects) — Project card grid with health score; single project page with 4 views: list / kanban / gantt / calendar.
8. **Tasks** (/tasks) — Table of all org-wide tasks.
9. **Calendar** (/calendar) — Interactive month view, click on task opens popup, Google Calendar sync.
10. **AI Center** (/ai) — AI Sidekick chat + risk mitigation plan.
11. **Reports** (/reports) — PDF export (window.print with print stylesheet).
12. **Automations** (/automations) — No-Code builder with 5 templates, 8 triggers, 4 conditions, 8 actions.
13. **Team** (/team) — Team member cards + invite new member (name/role/division/department/phone/email form).
14. **Admin** (/admin, admin-only) — 6 tabs: users, permissions, item types, hierarchy assignment, permission table, activity log.
15. **Settings** (/settings) — Theme, language, privacy.

Roles & permissions (Dynamic RBAC):
5 built-in roles — Admin / Manager / Member / Viewer / Guest + custom roles.
Interactive 12-permission matrix. Role switch via top-bar button — UI changes instantly.
CEO (u6) is a Manager: views and updates everything, but doesn't add/remove users. Only Admin (Mark Israel, u1) manages users.

Authentication & security (PostgreSQL — new and live):
- Each user signs in at /login with their OWN email + personal password. No shared password — in real auth each person sees only their own view.
- Security: bcrypt+pepper hashed passwords · revocable server-side sessions (httpOnly+SameSite=Strict cookie) · account lockout after 5 failed attempts · full audit log — aligned with the Privacy-Protection (Data Security) Regulations and the National Cyber Directorate methodology.
- **User management (admin only)**: /admin → "Users" tab → add user (gets a temp password + must-change-on-first-login), change role, change direct manager, reset password, enable/disable, delete — every change persists to Neon and is audited. An admin can't disable/demote themselves.
- **Direct manager** (org hierarchy): Hagai (CEO) ← Nir ← Mark; Elad/Ephraim/Esther report to Nir.
- Sign out: account menu in the top bar → "Sign out".

Voice Personal Assistant:
- Floating purple button in corner. STT (Web Speech API + MediaRecorder fallback) and smart TTS.
- TTS with correct abbreviation pronunciation: לו"ז → "luz", מנכ"ל → "mankal", ת"א → "Tel Aviv".
- Auto-chunks at 350-char boundaries → long answers read out to completion.
- 5 fully-supported languages with strict language enforcement in Gemini system prompt.
- Conversation mode: auto-listen after each answer.

AI Risk Engine:
Auto-detects 5 risk types: blocked, overdue, effort_overrun, schedule_slip, critical_not_started.
End-date forecast from velocity + avg slip. Cascade effect via BFS on dependency graph.
Mitigation plan with 4 action categories: resource / schedule / scope / process / escalation.
Smart reassignment: skill match (40%) + availability (35%) + performance (25%).

KPIs (17 total):
PM: Schedule Variance, Milestone Slippage, Throughput, Budget Adherence, CPI, SPI, Rework Rate.
PMO: Strategic Alignment, ROI, Capacity vs Demand, Risk Trend, Decision Latency, NPS, Burnout Risk, AI Adoption Rate, RAG, EVM.
All cards clickable with detailed info bubble. Based on PMBOK / EVM / McKinsey / Bain / MBI / Gartner standards.

Stack:
Next.js 15 App Router (React 19), TypeScript strict, Tailwind CSS, shadcn/ui (hand-built), Drizzle ORM (schema ready for Postgres), CASL for RBAC, next-intl (5 languages + RTL), Radix UI, dnd-kit (Kanban), recharts (charts), pptxgenjs (presentations), Sonner (toasts), Google Gemini API, custom Gantt engine (not a library).

Database:
**Connected to Neon PostgreSQL** — the users / user_sessions / auth_audit_log tables are live, and authentication + users are real in the DB. The rest of the data (tasks/projects/WBS) still runs on the Mock data layer (lib/db/mock-data.ts, data from the Salesforce project Excel) and will migrate to the DB gradually.

Deployment:
Vercel Production. Every push to main triggers automatic deploy.`,

  ru: `Что такое PMO++ — кратко:
Внутренняя платформа управления проектами Центра картографии Израиля.
Соединяет стратегию и исполнение — полная поддержка RTL, 5 языков, AI-помощник на Gemini, Mobile/PWA.

Иерархия информации:
Портфель → Программа → Проект → WBS → Задача → Подзадача.
Автоматический roll-up часов, прогресса, дат и затрат.

Меню навигации (15 страниц):
Мои задачи, Дашборды и KPI, Гантт, WBS, Управление рисками, Портфели, Проекты, Задачи, Календарь, AI-центр, Отчёты, Автоматизации, Команда, Администрирование, Настройки.

17 KPI (10 базовых + 7 продвинутых), 5 типов рисков, голосовой помощник на 5 языках, динамическая система ролей RBAC, конструктор автоматизаций без кода.

Аутентификация (PostgreSQL/Neon — активна): вход через /login по личному email + паролю (bcrypt, серверные сессии, блокировка после 5 неудач, аудит). Управление пользователями на /admin (только админ): создание, смена роли и руководителя, сброс пароля, отключение/удаление — всё сохраняется в БД.

Технологии: Next.js 15, React 19, TypeScript, Tailwind, Drizzle ORM, next-intl, Google Gemini API. БД: Neon Postgres (подключена).`,

  fr: `PMO++ en bref:
Plateforme interne de gestion de projets du Centre de Cartographie d'Israël.
Relie stratégie et exécution — RTL complet, 5 langues, assistant IA via Gemini, Mobile/PWA.

Hiérarchie:
Portefeuille → Programme → Projet → WBS → Tâche → Sous-tâche. Roll-up automatique.

Menu de navigation (15 pages):
Mes tâches, Tableaux de bord et KPI, Gantt, WBS, Gestion des risques, Portefeuilles, Projets, Tâches, Calendrier, Centre IA, Rapports, Automatisations, Équipe, Administration, Paramètres.

17 KPI, 5 types de risques, assistant vocal en 5 langues, RBAC dynamique, constructeur d'automatisations sans code.

Authentification (PostgreSQL/Neon — active): connexion via /login avec email + mot de passe personnel (bcrypt, sessions serveur, verrouillage après 5 échecs, audit). Gestion des utilisateurs sur /admin (admin seulement): création, changement de rôle et de responsable, réinitialisation du mot de passe, désactivation/suppression — tout est enregistré en BD.

Stack: Next.js 15, React 19, TypeScript, Tailwind, Drizzle ORM, next-intl, Google Gemini API. BD: Neon Postgres (connectée).`,

  es: `PMO++ en breve:
Plataforma interna de gestión de proyectos del Centro de Cartografía de Israel.
Une estrategia y ejecución — RTL completo, 5 idiomas, asistente IA con Gemini, Mobile/PWA.

Jerarquía:
Portafolio → Programa → Proyecto → WBS → Tarea → Subtarea. Roll-up automático.

Menú de navegación (15 páginas):
Mis tareas, Paneles y KPI, Gantt, WBS, Gestión de riesgos, Portafolios, Proyectos, Tareas, Calendario, Centro IA, Informes, Automatizaciones, Equipo, Administración, Ajustes.

17 KPI, 5 tipos de riesgo, asistente de voz en 5 idiomas, RBAC dinámico, constructor de automatizaciones sin código.

Autenticación (PostgreSQL/Neon — activa): inicio de sesión en /login con email + contraseña personal (bcrypt, sesiones de servidor, bloqueo tras 5 intentos, auditoría). Gestión de usuarios en /admin (solo admin): crear, cambiar rol y responsable, restablecer contraseña, desactivar/eliminar — todo se guarda en la BD.

Stack: Next.js 15, React 19, TypeScript, Tailwind, Drizzle ORM, next-intl, Google Gemini API. BD: Neon Postgres (conectada).`,
};

/** Get app facts in the requested language, with safe fallback to Hebrew. */
export function getAppFacts(lang: string): string {
  return APP_FACTS[lang] || APP_FACTS.he;
}

/**
 * Build the FULL system context that Gemini sees — app facts +
 * live snapshot + (optional) knowledge base entries from the caller.
 */
export function buildFullContext(lang: string, extraContext?: string): string {
  const facts = getAppFacts(lang);
  const snapshot = buildLiveSnapshot();
  return `${facts}\n\n${snapshot}${extraContext ? `\n\nKnowledge base:\n${extraContext}` : ""}`;
}
