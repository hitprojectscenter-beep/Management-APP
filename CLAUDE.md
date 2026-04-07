# CLAUDE.md - דרכי פעולה וביצוע

> מסמך זה מסכם את העקרונות, הכלים, ההחלטות והשיטות שבהן השתמשתי (Claude) במהלך פיתוח **Work OS**. הוא משמש כ"מדריך הפעלה" לכל מי שיבוא להמשיך את הפיתוח (כולל גרסאות עתידיות שלי).

---

## 🎯 עקרונות פעולה כלליים

1. **קודם להבין, אז לבנות.** לפני כתיבת קוד - קריאת כל מסמכי המקור (`מידע/`) כדי להבין את הצרכים.
2. **לשאול לפני להניח.** כשיש פיצול דרכים משמעותי (פלטפורמה, היקף, שפה) - להשתמש ב-`AskUserQuestion` ולא לנחש.
3. **תוכנית לפני קוד.** משימות מורכבות עוברות דרך `EnterPlanMode` → `ExitPlanMode` עם אישור משתמש.
4. **תיעוד תוך כדי תנועה.** TodoWrite מתעדכן בזמן אמת כדי שהמשתמש יראה את ההתקדמות.
5. **הקוד חייב לרוץ.** לא מסיימים שלב לפני שיש HTTP 200 על הדפים שנבנו.
6. **RTL הוא דרישת חובה, לא תוספת.** כל קומפוננטה נבנית מהיום הראשון עם logical properties (`ms`/`me`/`ps`/`pe`) ולא physical (`ml`/`mr`/`pl`/`pr`).
7. **שפה דו-לשונית מהבסיס.** כל טקסט עובר דרך `messages/he.json` + `messages/en.json` - אסור לקודד מחרוזות בקוד.
8. **Context-conscious.** קבצים גדולים נכתבים פעם אחת מלאה. שינויים קטנים דרך `Edit` ולא `Write`.

---

## 🛠️ הכלים שבהם השתמשתי ולמה

| כלי | מתי | למה |
|---|---|---|
| `AskUserQuestion` | פיצולי דרך משמעותיים | לקבל החלטות עיקריות (פלטפורמה, היקף, שפה) ללא ניחוש |
| `EnterPlanMode` + `ExitPlanMode` | פרויקט מורכב | אישור משתמש לתוכנית לפני שעות עבודה |
| `Agent` (Explore subagent) | קריאת מסמכים בינאריים (.docx/.pptx) | פעולה במקביל לי, עם python libs בסיוע מערכת |
| `TodoWrite` | משימות 3+ שלבים | תיעוד התקדמות נראה למשתמש |
| `Write` | יצירת קבצים חדשים גדולים | יעיל יותר מ-Edit למקרי first-time |
| `Edit` | תיקון קבצים קיימים | שולח רק את ה-diff, חוסך טוקנים |
| `Bash` (`run_in_background: true`) | dev server, npm install ארוכים | לא חוסם את הסשן |
| `mcp__Claude_Preview__preview_start` | הפעלת dev server מנוהל | אינטגרציה עם כלי debugging של Claude |
| `mcp__Claude_Preview__preview_screenshot` | ולידציה ויזואלית | לוודא שה-RTL ועיצוב באמת עובדים |
| `Glob` / `Grep` | חיפוש בקוד | מהיר יותר מ-`find` / `rg` ידני |

---

## 📋 תהליך הפיתוח כפי שבוצע בפועל

### שלב 0: הבנת הקונטקסט (5-10 דקות)
- המשתמש שלח קישור ל-NotebookLM שאני לא יכול לגשת אליו (אין auth).
- הוא הסביר שיש תיקייה `מידע/`. בדיקתי גילתה 8 קבצים: 4 docx + 3 pptx + 1 csv.
- שלחתי **Explore agent** במקביל לקריאת כל הקבצים (python-docx + python-pptx).
- קיבלתי סיכום מקיף של כל הדרישות: PMO, WBS, Gantt, RBAC, AI, Calendar, RTL, dual language.

### שלב 1: שאלות הבהרה (`AskUserQuestion`)
ארבע שאלות קריטיות:
1. **פלטפורמה** → React + Node + Vercel (Next.js 15)
2. **היקף MVP** → מערכת מלאה כולל AI
3. **שפה** → דו-לשוני he+en עם RTL
4. **נקודת התחלה** → פרויקט חדש מאפס

### שלב 2: תוכנית מפורטת (`EnterPlanMode`)
- כתיבת תוכנית פיתוח של 12 שלבים ב-`compressed-singing-flask.md`.
- כללה: tech stack, data model (18 טבלאות), מבנה תיקיות, שלבי מימוש, Verification checklist, סיכונים.
- אישור משתמש דרך `ExitPlanMode`.

### שלב 3: תשתית
**Node.js לא היה מותקן!** → התקנה דרך `winget install OpenJS.NodeJS.LTS`. הוספת `/c/Program Files/nodejs` ל-PATH ידנית בכל פקודת bash.

יצירת קבצי תשתית:
- `package.json` עם 35+ תלויות (Next 15, React 19, Drizzle, CASL, next-intl, dnd-kit, recharts, anthropic, googleapis)
- `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- `.env.example`, `.gitignore`
- `messages/he.json` + `messages/en.json` (תרגומים מלאים)
- `lib/i18n/` (config, request, routing)
- `middleware.ts` (next-intl locale routing)

### שלב 4: שכבת נתונים
- `lib/db/schema.ts` - 18 טבלאות Drizzle עם relations + indexes
- `lib/db/types.ts` - enums + color maps
- `lib/db/mock-data.ts` - **קובץ מפתח**: נתוני דגימה ריאליסטיים בעברית כדי שהמערכת תרוץ ללא DB
- `lib/utils.ts` - helpers: `cn()`, `formatDate`, `daysBetween`, `calculateVariance`, `isOverdue`
- `lib/rbac/abilities.ts` - CASL definitions ל-5 תפקידים
- `lib/ai/claude.ts` + `lib/ai/risk-engine.ts` - heuristics לזיהוי 5 סוגי סיכונים

### שלב 5: UI Shell
- `app/globals.css` - CSS variables לתמיכת light/dark + RTL fonts (Heebo + Inter)
- `components/ui/` - shadcn primitives ידניים: Button, Card, Badge, Input, Progress, Avatar
- `components/theme-provider.tsx` - next-themes wrapper
- `app/[locale]/layout.tsx` - HTML עם `lang={locale}` + `dir={isRTL ? 'rtl' : 'ltr'}`
- `components/layout/sidebar.tsx` - navigation עם 10 קישורים, lucide-react icons
- `components/layout/topbar.tsx` - search, language switcher, theme toggle, notifications, avatar

### שלב 6: דפים
12 דפים שנבנו:
1. `app/[locale]/(dashboard)/page.tsx` - דשבורד עם 4 KPI cards + 4 charts
2. `portfolios/page.tsx` - תצוגת פורטפוליו עם rollup
3. `projects/page.tsx` - רשת כרטיסי פרויקטים עם health score
4. `projects/[id]/page.tsx` - דף פרויקט עם WBS tree + ProjectViews
5. `tasks/page.tsx` + `tasks/[id]/page.tsx`
6. `calendar/page.tsx`
7. `ai/page.tsx` - מרכז AI עם רשימת סיכונים + AiSidekick chat
8. `automations/page.tsx`
9. `team/page.tsx`
10. `reports/page.tsx`
11. `settings/page.tsx`

### שלב 7: קומפוננטות מורכבות
- `components/wbs/wbs-tree.tsx` - **רקורסיבי** עם state פתוח/סגור per-node
- `components/projects/project-views.tsx` - tab switcher בין 4 תצוגות
- `components/projects/task-list.tsx` - טבלה עם sortable columns
- `components/projects/task-kanban.tsx` - **@dnd-kit** drag & drop עם state local
- `components/projects/task-gantt.tsx` - **Gantt מותאם אישית עם תמיכת RTL מלאה** (לא ספרייה - בנוי בידיים כדי לתמוך RTL נכון)
- `components/projects/task-calendar.tsx` - Calendar grid month view
- `components/ai/ai-sidekick.tsx` - chat UI עם streaming animation, suggestions
- `components/dashboard/*.tsx` - 5 charts על Recharts

### שלב 8: API Routes
- `app/api/ai/chat/route.ts` - מקבל messages, בונה context snapshot של כל הארגון, שולח ל-Claude, מחזיר reply
- `app/api/webhooks/google-calendar/route.ts` - stub לקליטת push notifications

### שלב 9: התקנה והרצה
- `npm install` נכשל בגלל `@casl/react` שלא תומך React 19 → הסרה.
- `npm install --legacy-peer-deps` → 612 חבילות הותקנו.
- `npm run dev` נכשל בגלל autoprefixer חסר → התקנה.
- שרת עלה על פורט 3001 (3000 היה תפוס) → HTTP 200 על כל 12 הדפים.
- restart דרך `preview_start` של Claude (אחרי kill לתהליכים הישנים) → רץ על פורט 3000.
- ולידציה ויזואלית דרך `preview_screenshot` → דשבורד עובד עם RTL.

### שלב 10: דוקומנטציה
- `README.md` עם הוראות הפעלה, מבנה פרויקט, אינטגרציות, roadmap.

---

## 🐛 בעיות שנתקלתי בהן ואיך פתרתי

| בעיה | פתרון |
|---|---|
| Node.js לא מותקן | `winget install OpenJS.NodeJS.LTS` (UAC prompt) |
| PATH לא עודכן בסשן הנוכחי | `export PATH="/c/Program Files/nodejs:$PATH"` בכל פקודה |
| `@casl/react` לא תומך React 19 | הסרה - אפשר להשתמש ב-`@casl/ability` ישירות |
| ERESOLVE ב-npm install | `--legacy-peer-deps` |
| autoprefixer חסר אך postcss דורש | `npm install --save-dev autoprefixer` |
| dev server על 3001 ולא 3000 | kill לתהליכים ישנים דרך `taskkill /F /PID` |
| `preview_start` לא מוצא npm | `cmd.exe /c "set PATH=...\\nodejs;%PATH% && cd work-os && npm run dev"` |
| Gantt RTL - אין ספרייה טובה | בנייה ידנית: container עם `direction: ltr` פנימי, אבל logical positioning |
| תווים עבריים בנתיבים | תמיד עוטף ב-quotes כפולים בפקודות bash |

---

## 🏗️ החלטות ארכיטקטוניות מרכזיות

1. **Next.js 15 App Router** במקום Pages Router - Server Actions, streaming, RSC.
2. **TypeScript strict** מההתחלה - תופס באגים מוקדם.
3. **Mock data layer נפרדת** (`lib/db/mock-data.ts`) - מאפשרת לכל העסק לרוץ ללא DB; כשנחבר Postgres רק `lib/db/queries.ts` משתנה.
4. **next-intl במקום i18next** - יותר native ל-App Router, מטפל ב-RTL routing אוטומטית.
5. **shadcn/ui ידני** במקום `npx shadcn init` - שליטה מלאה, פחות תלויות, התאמה ל-RTL.
6. **Drizzle ORM במקום Prisma** - schema ב-TS, type-safe, Edge-compatible.
7. **CASL לRBAC** - declarative abilities, condition-based.
8. **Gantt בידיים** - אין ספרייה אחת שתומכת RTL בעברית. עדיף 200 שורות שלי על 5,000 שורות של dhtmlx-gantt.
9. **כל הטקסטים ב-JSON** - מאפשר בעתיד תרגום אוטומטי או הוספת שפות.
10. **Anthropic SDK ולא OpenAI** - המשתמש משתמש ב-Claude, האקוסיסטם תואם.

---

## 📐 קונבנציות קוד שלי

- **רכיבי React**: PascalCase, default export, props inline interface
- **Server Components by default**, `"use client"` רק כשצריך state/effects
- **תאריכים**: ISO strings ב-DB, `Date` objects ב-runtime
- **Error handling**: try/catch סביב external calls, return graceful fallback
- **Comments**: בעברית כשמסבירים החלטות עסקיות, באנגלית ל-JSDoc/types
- **Imports**: סדר - external, internal (`@/`), relative, types
- **CSS**: Tailwind classes בלבד (לא inline styles), `cn()` למיזוג conditional
- **Logical properties תמיד**: `ms-2` ולא `ml-2`, `start-0` ולא `left-0`

---

## 🚧 מה לא נעשה ולמה (תיעוד גלוי)

1. **DB אמיתי לא חובר** - הסכמה מוכנה ב-`schema.ts`, אבל המערכת רצה על mock data. סיבה: לא לעצור את הזרימה כדי לבקש credentials של Neon.
2. **Auth.js לא הופעל** - יש את ה-imports בקוד אבל אין `lib/auth.ts` שלם. סיבה: דורש Google OAuth credentials.
3. **AI rate limiting לא מומש** - יש hook ב-`claude.ts` אבל אין רישום שימוש פעיל. בייצור צריך טבלת `ai_usage`.
4. **Tests לא נכתבו** - ה-MVP הוא בעיקר שכבת UI, וסקופ הזמן היה דחוס. מומלץ להוסיף Vitest + Playwright לפני ייצור.
5. **Audit log לא רושם אוטומטית** - יש טבלה ב-schema אבל אין trigger / middleware. בייצור יוסיפו hook ב-Drizzle או DB triggers.
6. **Real-time updates** - אין WebSocket / SSE. עדכוני Kanban מקומיים. בייצור: Pusher / Ably / Supabase Realtime.

---

## 🎓 לקחים שלי לפרויקטים הבאים

1. **תמיד לבדוק שכלי הליבה זמינים לפני שמתחילים** (Node, git, python). יחסוך זמן.
2. **`run_in_background: true` הוא חבר טוב** ל-dev servers ו-installs ארוכים.
3. **`AskUserQuestion` בתחילת סשן ארוך = פחות עבודה חוזרת**.
4. **לסכם עם המשתמש כל ~10 פעולות** - גם אם הוא לא ביקש - זה בונה אמון.
5. **Mock data layer = מכפיל כוח**. מאפשר לבנות UI מלא בלי infra.
6. **לכתוב README תוך כדי, לא בסוף** - מבטיח שלא שוכחים פרטים.
7. **דפים ריקים גרועים יותר מדפים שגויים** - תמיד לזרוע content מלא בפיתוח.

---

## 🆕 סבב פיתוח 5 - מסך ניהול אדמין + KPIs לפי תפקיד (PM vs PMO)

### מה נוסף:
1. **דף Admin חדש** (`/admin`) עם 4 טאבים:
   - **משתמשים** - טבלה מלאה עם חיפוש, סינון לפי תפקיד, הוספה/עריכה/מחיקה (Dialog)
   - **תפקידים והרשאות** - 5 תפקידים + מטריצת הרשאות 12×5 (12 הרשאות, 5 תפקידים)
   - **סוגי משימות ופרויקטים** - 14 סוגים מובנים (Bug, Feature, Project type וכו') עם hover-to-edit, color picker, emoji picker, מחיקה
   - **שיוך היררכי** - העברת פרויקטים בין תוכניות + שיוך משימות לפריטי WBS דרך selectors
2. **RBAC guard** - רק admin רואה את הדף, אחרת access denied page
3. **`u6` הועלה ל-admin** (היה manager) כדי שהמשתמש הנוכחי יוכל לגשת
4. **`mockItemTypes`** - טבלה חדשה ב-mock data עם 14 סוגי פריטים מובנים
5. **`Shield` icon** ב-sidebar עם פריט "ניהול מערכת"
6. **דשבורדי KPI לפי תפקיד** - אחד הרכיבים החזקים ביותר במערכת:
   - **Role Switcher** - בחירה בין "מנהל פרויקט" ל"מנהל PMO/פורטפוליו"
   - **Project Manager view** (תפעולי) עם 4 KPIs:
     - חריגת לו"ז (Schedule Variance) - בימים
     - אבני דרך באיחור (Milestone Slippage)
     - Throughput שבועי (מתוכנן מול ביצוע)
     - ניצול תקציב (Budget Adherence)
     - + 2 גרפים: Throughput chart, Workload chart
   - **PMO Manager view** (אסטרטגי) עם 4 KPIs:
     - יישור אסטרטגי (Strategic Alignment)
     - ROI פורטפוליו
     - ניצולת משאבים (Capacity vs Demand) - **אזהרת burnout מעל 85%!**
     - מגמת סיכונים (Risk Trend)
     - + 4 רכיבים נוספים: Portfolio Health (RAG), Risk Trend line chart, EVM metrics (CPI/SPI), Cost Analysis (CapEx/OpEx)

### עקרונות שיושמו:
- **RBAC bouncer pattern** - הדף עצמו בודק תפקיד לפני הצגת תוכן
- **Local state for demo** - השינויים נשמרים ב-React state, לא ב-DB אמיתי (toast notifications)
- **System types lock** - סוגים מובנים נעולים נגד מחיקה (`isSystem: true`)
- **Persona-driven dashboards** - לכל תפקיד דשבורד שמתאים לשאלה הספציפית שלו
- **Visual differentiation** - PM (כחול) ו-PMO (סגול) צבעים שונים בכל מקום
- **EVM standard metrics** - CPI ו-SPI הם מדדים סטנדרטיים בניהול פרויקטים מורכבים
- **RAG status** - traffic light פשוט וקליל למנהלים

---

## 🆕 סבב פיתוח 4 - לוגו מפ"י + טאבים חדשים + אירועי יומן + מצגת

### מה נוסף:
1. **לוגו מפ"י (SVG)** ב-`public/mapi-logo.svg` - גרסת SVG של הלוגו הרשמי של המרכז למיפוי ישראל. גלובוס עגול עם כיתוב "המרכז למיפוי ישראל"
2. **שילוב הלוגו ב-sidebar header** - באותו מקום שהיה הקוביה הכחולה הקודמת. עם רקע לבן וכותרת "המרכז למיפוי ישראל" + תת-כותרת Work OS
3. **דף חדש: ניהול סיכונים** (`/risks`) - דף מלא עם:
   - 5 כרטיסי סטטיסטיקה לפי דרגת סיכון
   - מטריצת בריאות פרויקטים אינטראקטיבית
   - רשימת כל הסיכונים הפעילים (manual + AI-detected) עם dedup
   - הסבר על 5 סוגי הסיכונים שהמערכת מזהה
4. **דף Dashboard עודכן** ל-"דשבורדים ו-KPI" עם header חדש
5. **Sidebar עודכן** עם 2 פריטים חדשים: דשבורדים ו-KPI + ניהול סיכונים (סה"כ 12 פריטי ניווט עכשיו)
6. **7 אירועי יומן** ב-Google Calendar מסונכרנים ללוז Salesforce:
   - דדליין פרסום הבריף (30/04/2026)
   - סקירת חסימת אינטגרציה דחופה (09/04/2026)
   - ועדת בחינת הצעות (04/05/2026)
   - בדיקות UAT (15/04/2026)
   - בחירת ספק זוכה (31/08/2026)
   - סקירת תחזוקה רבעונית (recurring 15 כל חודש מ-15/06)
   - חוזה סופי (30/11/2026)
7. **מצגת מלאה: 15 שקפים** ב-`Work-OS-Presentation.pptx` (502 KB):
   - שקף 1: כותרת עם לוגו ושם הארגון
   - שקף 2: האתגר (4 בעיות)
   - שקף 3: הפתרון (אסטרטגיה/ביצוע/אינטליגנציה)
   - שקף 4: Tech Stack (8 טכנולוגיות)
   - שקף 5: היררכיית WBS (8 רמות)
   - שקף 6: עמוד הבית עם mock screenshot
   - שקף 7: 4 תצוגות פרויקט
   - שקף 8: AI Risk Engine (5 סוגי סיכונים)
   - שקף 9: AI Sidekick עם דוגמת chat
   - שקף 10: מערכת עזרה
   - שקף 11: ניהול משתתפים ו-FTE
   - שקף 12: דשבורדים ו-KPI
   - שקף 13: ניהול סיכונים (5-card severity grid + lifecycle)
   - שקף 14: Roadmap (4 רבעונים)
   - שקף 15: תודה + יצירת קשר
   - בנוי עם **pptxgenjs** דרך `scripts/generate-presentation.js`
   - פלטה: Mapi blue + accents (Midnight Executive theme)

---

## 🆕 סבב פיתוח 3 - מערכת עזרה אינטראקטיבית + נתוני Salesforce

### מה נוסף:
1. **מערכת Onboarding מלאה** - מבוסס מחקר UX (NN/g, Microsoft Fluent, Material Design):
   - **Welcome Tour** של 12 שלבים עם spotlight effect ידני (overlay + ring + popover)
   - Auto-start בכניסה ראשונה (localStorage flag)
   - תמיכת RTL מלאה כולל ניווט עם חצים
   - כפתורי דלג / הקודם / הבא
   - Progress bar במעבר צבעים

2. **Help Bot** עם 2-tier אסטרטגיה:
   - **Tier 1:** Keyword matching מ-`HELP_ENTRIES` (16 שאלות נפוצות) - מהיר וחינמי
   - **Tier 2:** Fallback ל-Claude עם knowledge base מלא כ-system prompt
   - Knowledge base כולל: navigation, tasks, projects, AI, settings, general
   - Quick questions chips ב-onboarding

3. **HelpProvider Context** - state management לשני המנגנונים יחד

4. **שני entry points להעזרה:**
   - כפתור עזרה בtopbar (HelpTrigger) - popover עם 2 אופציות
   - כפתור צף ירוק בפינה (HelpFloatingButton) - גישה מהירה לבוט

5. **API route חדש** `/api/help` - מטפל ב-keyword matching ו-AI fallback

6. **נתוני Salesforce ארגוניים:**
   - משתמש חדש: "משתמש המרכז למיפוי" (u6) - הפך ל-CURRENT_USER
   - תוכנית: "יישומי Salesforce במרכז למיפוי ישראל"
   - 3 פרויקטים מציאותיים עם תאריכים, סטטוסים וחריגות
   - 10 משימות מפורטות
   - 6 חברויות עם FTE allocation

### עקרונות UX שיושמו:
- **Recognition over recall** - כל אייקון עם title tooltip
- **Progressive disclosure** - תוכן בסיור מתגלה בהדרגה
- **Always escapable** - Esc/דלג/X תמיד זמינים
- **Context-aware** - הסיור מדגיש את האלמנט הנוכחי
- **Persistent help** - כפתור עזרה קיים בכל דף
- **Smart fallback** - הבוט תמיד עונה (גם ללא AI)
- **First-visit detection** - localStorage flag

---

## 🆕 סבב פיתוח 2 - עמוד נחיתה חדש + משתתפים (FTE)

### מה נוסף:
1. **טבלת `projectMembers` חדשה** - assignment של משתמשים ל-WBS nodes עם תפקיד + אחוז משרה
2. **`CURRENT_USER_ID`** - דמיית session של משתמש פעיל (אורי)
3. **6 helpers חדשים** ב-`mock-data.ts`: members ו-tasks per user
4. **עמוד הנחיתה הראשי** עבר מ-Executive Dashboard ל-"My Tasks" עם:
   - 7 טאבים סינון (הכל / בביצוע / לא התחילו / בבדיקה / חסומות / באיחור / לפי פרויקט)
   - זמן נותר דינמי על כל משימה
   - כפתור "+" להוספת משימה
   - Side panel עם הפרויקטים שלי + breakdown של FTE עם over-allocation warning
5. **Dashboard הישן** עבר ל-`/dashboard` (עדיין נגיש דרך sidebar)
6. **`AddTaskDialog`** - Radix Dialog עם form מלא ו-toast notifications
7. **`ProjectMembers`** - רכיב לתצוגת חברי צוות בכל פרויקט/משימה עם 2 variants
8. **שולב בדף הפרויקט הבודד ובדף המשימה הבודדת**
9. **הסברי גרפים** - כל גרף עכשיו מקבל `CardDescription` עם הסבר ידידותי בעברית/אנגלית + אייקון Info
10. **ברירת מחדל עברית** - מאומת ש-`/` מפנה ל-`/he`

### עקרונות חדשים שהוספתי:
- **Variant pattern**: כל רכיב ראוי שיתמוך ב-`variant="card" | "compact"` למחזור שימוש
- **Toast במקום alert**: שימוש ב-Sonner ל-feedback למשתמש
- **Tooltips על KPI cards**: שימוש ב-`title=` HTML attribute - פשוט ומועיל
- **Date inputs פשוטים**: `type="date"` של HTML מספיק טוב, אין צורך ב-Calendar component מורכב

---

## 🔮 איך להמשיך מכאן

אם אתה (Claude עתידי או אנושי) רוצה להמשיך:

1. **קרא את `Memory.md`** לתמלול ההתכתבות עם המשתמש.
2. **קרא את התוכנית** ב-`C:\Users\imark\.claude\plans\compressed-singing-flask.md`.
3. **בדוק את `lib/db/schema.ts`** להבנת מודל הנתונים.
4. **התחל את ה-dev server** דרך `preview_start` עם `work-os-dev`.
5. **נקודת פתיחה לעבודה אמיתית**: חיבור Neon Postgres → `lib/db/index.ts` עם `drizzle()` client → החלפת קריאות `mock-data.ts` בקריאות אמיתיות.
6. **השלב הבא הכי משמעותי**: Auth.js עם Google OAuth - מאפשר calendar sync.
7. **AI ייעלה ברגע ש-`ANTHROPIC_API_KEY` נוסף ל-`.env.local`** - הקוד כבר שם.

בהצלחה! 🚀
