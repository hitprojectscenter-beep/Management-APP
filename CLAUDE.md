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

## 🆕 סבב פיתוח 19-20 - שיוך מחדש, יכולות עוזר, רספונסיביות, אוטומציות, 5 שפות

### סבב 17: 5 שפות + בריף שיווקי
- 3 שפות חדשות: **רוסית, צרפתית, ספרדית** (82 static pages)
- בורר שפה dropdown עם דגלים ושמות
- `localeDetection: true` - זיהוי שפה אוטומטי לפי `Accept-Language` header
- קבצי DOCX: בריף שיווקי בעברית (RTL) ובאנגלית עם לוגו מפ"י ו-11 סקציות

### סבב 18: בנאי אוטומציות No-Code
- `AutomationBuilder` עם 5 תבניות מוכנות ובנייה ויזואלית ללא קוד
- 3 שלבים: Trigger (8 סוגים) → Conditions (4) → Actions (8 כולל 2 AI)
- כרטיס סיכום סגול, ולידציה, toast

### סבב 19: נתונים אמיתיים מ-Excel + תיקוני UI
- קובץ `פרויקטים_סיילספורס שיווק ומכירות.xlsx` נקרא ושולב (8 שלבים אמיתיים)
- טופס הוספת משימה: 6 סוגים חדשים (סיכום פגישה, הכנה, מענה, מסמך, אחר + free text)
- צירוף קבצים (5MB max per file)
- הזמנת חבר צוות: שם, תפקיד, חטיבה, אגף, טל'*, מייל*
- דף WBS נפרד + דף גאנט נפרד ב-sidebar
- `CloseTaskDialog`: 4 סיבות סגירה + תיאור 300 תווים
- עוזר אישי: textarea דינמית, הסבר נתיב קריטי, תכנית סיכונים, סיכום יומי

### סבב 20: שיוך מחדש + 4 יכולות עוזר + מובייל
- **`ReassignTaskDialog`**: From→To עם אבטרים, רק פותח המשימה יכול לשייך מחדש
- **עוזר אישי - יכולות חדשות**: נתיב קריטי / תכנית גידור / שיוך מחדש / סיכום יומי
- **רספונסיביות**: Dialog `inset-x-2` על מובייל, `w-[95vw]`, `font-size: 16px`, `onFocus` scroll

---

## 🆕 סבב פיתוח 15+16 - הקלטה, טופס משימות, הזמנת חבר, WBS/Gantt מובייל

### סבב 15 (commit a0f1eec):
- **הקלטת שמע**: ארכיטקטורה דו-מצבית (Web Speech API + MediaRecorder fallback ל-iOS/Firefox)
- **טופס הוספת משימה**: סוג משימה (chips), שיוך פרויקט/פרוגרמה (toggle), תיאור (300 תווים), צוות (multi-select), תאריכים, עדיפות, מקור (החלטת מנהל/פגישה/אחר+100 תווים)
- **דו-שיח**: כל הודעה מציגה "מארק:" / "עוזר:" כ-label

### סבב 16 (commit נוכחי):
- **טופס הזמנת חבר צוות**: שם*, תפקיד, חטיבה, אגף, טל'*, מייל* + שליחת קישור הזמנה
- **Gantt/WBS layout**: שונה מ-4-column grid ל-full-width ProjectViews + 2-column WBS/Team
- **מובייל**: project view tabs עם scrollbar-none, min-h-[44px], responsive padding

---

## 🆕 סבב פיתוח 14 - נתוני פרויקט אמיתיים מ-Excel + תיקוני UI

### נתונים אמיתיים מקובץ Excel:
קובץ `נתוני פרויקטים/פרויקטים_סיילספורס שיווק ומכירות.xlsx` נקרא, נותח ושולב ב-mock data.

**פרויקט שהוחלף:** "שירותי שיווק ומכירות מבוססי Salesforce" → "יישומי שיווק מכירות והכנסות בפלטפורמת Salesforce"

**8 שלבים/משימות אמיתיים (מהאקסל):**
1. פרסום הבריף (09/2025 → 12/2025, הושלם 25/12) - מארק 50%, אלעד 20%, ניר 10%
2. בחירת ספק זוכה (12/2025 → 03/2026, הושלם 16/04 באיחור) - מארק 30%, אלעד 10%, ניר 20%
3. אפיון ויישום סשן 1 - 3/14 מסלולים (05/2026 → 07/2026) - מארק 70%, אלעד 50%, ניר 10%
4. אפיון ויישום סשן 2 - 3/11 מסלולים (08/2026 → 10/2026)
5. אפיון ויישום סשן 3 - 4/8 מסלולים (11/2026 → 01/2027)
6. אפיון ויישום סשן 4 - 3 אחרונים (02/2027 → 04/2027)
7. סיום הפרויקט - שו"שים ותיקונים (05/2027 → 07/2027) - מארק 80%, אלעד 60%, ניר 20%
8. שלב תחזוקה (08/2027 → 07/2028) - מארק 15%, אלעד 15%, ניר 5%

**WBS nodes חדשים:** 6 milestones נוספו (session 1-4, completion, maintenance)
**משימות:** sf-task-3 עד sf-task-6b - 8 משימות עם תאריכים, FTE ותיאורים מהאקסל
**Project Members:** FTE עודכן לפי ממוצע הפאזות

---

## 🆕 סבב פיתוח 13 - תיקון עוזר אישי מלא + PDF export + QA

### בעיות שדווחו:
1. **עוזר אישי לא עובד בנייד** - הקלטה לא פועלת, טקסט נחתך, תמיד מחזיר "Understood"
2. **כפתור PDF בדוחות לא פעיל** - היה כפתור מת ללא `onClick`
3. **בקשת QA כוללת** על כל היישום

### תיקונים:

**עוזר אישי - שכתוב מלא של `heuristicParse()`:**
- הפונקציה הקודמת הייתה placeholder שמחזיר "Understood" באנגלית
- הפונקציה החדשה (~200 שורות) מנהלת דו-שיח אמיתי בעברית:
  - שלום/ברכה → סיכום מצב אישי + תפריט אפשרויות
  - "מה הסיכונים?" → סורק `mockTasks` ומחזיר ספירה + שמות משימות חסומות/באיחור
  - "מה המצב?" → `calculateProjectHealth` + רשימת משימות פתוחות של המשתמש
  - "מי עמוס?" → workload per user עם FTE% ואזהרות
  - "פתח משימה" → `create_task` עם חילוץ כותרת/פרויקט/אחראי מהטקסט
  - "עזרה" → תפריט מלא של יכולות
  - unknown → הודעה ידידותית עם דוגמאות (לא "Understood"!)

**עוזר אישי - תיקוני UI:**
- `Input` הוחלף ב-`textarea` עם auto-grow (min 44px → max 120px)
- `font-size: 16px` inline למניעת zoom ב-iOS
- `stage` חוזר ל-`idle` אחרי query/clarification (לא נתקע)
- fallback response תמיד עברי

**PDF Export:**
- `ExportPdfButton` - client component חדש
- `window.print()` עם dynamic print CSS שמסתיר sidebar/topbar/floating buttons
- `@page { size: A4 landscape }` + `print-color-adjust: exact`
- Toast notifications (מכין → מוכן)

### QA Results (15 דפים + 2 APIs + 2 assets):
כל 19 ה-endpoints מחזירים HTTP 200.
Assistant API מחזיר תשובות עבריות מלאות עם נתונים אמיתיים.

---

## 🆕 סבב פיתוח 12 - לוגו מפ"י המקורי (PNG מקובץ מקומי)

### מה השתנה:
- **מצאתי את הקובץ המקורי** `לוגו מפי.png` בתיקיית הפרויקט (5.9KB)
- העתקתי ל-`public/mapi-logo.png`
- **עדכנתי את כל ההפניות** מ-SVG ל-PNG:
  - `components/layout/sidebar.tsx` - `src="/mapi-logo.png"` + `object-contain` + bg-white
  - `app/layout.tsx` - icons, apple-touch-icon, startupImage, og:image
  - `public/manifest.json` - PWA icons
- **type עודכן** מ-`image/svg+xml` ל-`image/png` בכל המקומות

### לקח חשוב:
כשהמשתמש מעלה תמונה לצ'אט - היא לא נשמרת כקובץ במערכת הקבצים. אבל כשהמשתמש שומר קובץ ידנית בתיקייה ואומר לי את השם - אני יכול למצוא ולהשתמש בו ישירות.

---

## 🆕 סבב פיתוח 11 - תיקון 3 באגים שדווחו ע"י המשתמש + Vercel deploy

### באגים שתוקנו:
1. **לוגו מפ"י** - SVG עודכן עם גלובוס ברור יותר, רשת lat/lon, סמל מרכזי ועברית מעוגלת
2. **עברית כברירת מחדל** - `localePrefix: "always"` → `"as-needed"`. עכשיו `/` מוגש ישירות בעברית (בלי redirect ל-`/he`). רק `/en` דורש prefix. בנוסף - עמוד ברוך הבא (שלב 1 בסיור) עודכן עם הסבר מלא על המערכת בעברית
3. **העוזר האישי - הקלדה והקלטה** - Input כבר לא `disabled` בזמן הקלטה; הקלטה לא שולחת אוטומטית אלא מוסיפה ל-Input; נוסף handler ל-Enter; focus חוזר אחרי dictation; `text-base` (16px) למניעת zoom ב-iOS

### CVE-2025-66478 fix:
- **Next.js 15.1.3 → 15.5.7** (15.5.5 עדיין פגיע!) - Vercel חסם build בגלל CVE קריטי ב-React Server Components
- גילוי: קראנו Vercel build logs ומצאנו שה-build הצליח אבל נדחה ב-security check הסופי
- הפתרון הנכון לפי https://nextjs.org/blog/CVE-2025-66478: 15.5.7 (לא 15.5.5)

### Vercel Production:
- **status: READY** (commit ee44dfa - ראשון שעבר אחרי שבועות של ERRORים)
- כל 13 הדפים + 4 API routes פרוסים בייצור

---

## 🆕 סבב פיתוח 10 - עוזר אישי (Agentic AI) + משתמשים אמיתיים + מובייל

### חלק א': משתמשים אמיתיים
החלפת 6 המשתמשים הפיקטיביים בצוות האמיתי:
- **u1: מארק ישראל** (admin) - Salesforce Program Manager + Technical PM (CURRENT_USER)
- **u2: ניר ברלוביץ'** (manager) - מנהל כלל הפעילויות
- **u3: אלעד אסרף** (manager) - בעלים Salesforce Marketing & Sales
- **u4: אפרים ג'יאן** (manager) - בעלים Salesforce CRM
- **u5: אסתר מהרטו** (manager) - אחראית תכניות עבודה
- **u6: חגי רונן** (admin) - מנכ"ל

mockUsers + mockProjectMembers + task assignments + comments + Topbar hardcoded ref כולם עודכנו.

### חלק ב': התאמה למובייל/PWA
- `Sheet` primitive חדש (Radix) → mobile drawer sidebar עם slide-in RTL
- `NAV_ITEMS` נשלף לקובץ משותף, Sidebar התפצל ל-SidebarContent + Sidebar
- Topbar עם hamburger button `<lg`, responsive paddings, touch targets 44×44
- `public/manifest.json` חדש עם שם עברי, theme Mapi blue, standalone mode
- `app/layout.tsx` עם Metadata + Viewport API מלא: appleWebApp, theme-color light/dark, viewportFit cover
- globals.css: env(safe-area-inset), -webkit-text-size-adjust, touch-action manipulation, min-height 44px, 16px inputs on mobile

### חלק ג': עוזר אישי (Agentic AI) - הפיצ'ר הגדול של הסבב

**ארכיטקטורה:**
- `lib/ai/assistant-engine.ts` - Intent schema, Gap analysis, Conflict detection, Name resolution, Entity merging, Confirmation summary, Audit logging
- `lib/ai/assistant-prompts.ts` - Claude system prompt (he/en) עם strict JSON schema + heuristic fallback
- `app/api/assistant/route.ts` - POST (parse intent) + PUT (execute confirmed action)
- `components/assistant/use-speech-recognition.ts` - Web Speech API hook עם he-IL support + TTS helper
- `components/assistant/personal-assistant.tsx` - רכיב UI מלא (~500 שורות)

**יכולות ליבה:**
1. **Speech-to-Text**: `webkitSpeechRecognition` / `SpeechRecognition` - תמיכה ב-he-IL ו-en-US, interim results live
2. **Intent Recognition**: Claude עם system prompt מחמיר המחזיר JSON עם action/entities/confidence/responseText
3. **Name Resolution**: projectNameHint + assigneeNameHint → IDs דרך fuzzy matching
4. **Gap Analysis**: לפי `REQUIRED_FIELDS_FOR_ACTION` - מזהה אילו שדות חובה חסרים
5. **Conflict Detection**:
   - **RBAC** - דרך CASL abilities, דוחה אם לחבר צוות אין הרשאה
   - **Date logic** - plannedEnd < plannedStart
   - **Overload** - assignee > 80% FTE
6. **Dialog State Machine**: idle → listening → processing → awaiting_clarification → awaiting_confirmation → executing → done
7. **Carryover Context**: entities ו-action נשמרים בין turns של שיחה
8. **Human-in-the-loop**: Confirmation card חובה לפני כל פעולת mutation
9. **Audit Log**: `logAssistantAction()` רושם כל פעולה עם viaAssistant: true + timestamp + actor
10. **TTS Optional**: speechSynthesis לקריאת תגובות בקול

**זרימת עבודה לדוגמה (יצירת משימה):**
```
User (voice): "פתח משימה חדשה לבדיקת שרתים מיום ראשון עד חמישי"
→ STT → "פתח משימה חדשה..."
→ API POST /api/assistant
→ Claude parses: { action: "create_task", entities: {title, plannedStart, plannedEnd} }
→ Gap analysis: חסר projectId + assigneeId
→ Stage: clarification
→ Assistant: "לאיזה פרויקט לשייך את המשימה? ומי האחראי?"
→ User: "פרויקט תשתיות, הקצה לדנה"
→ API POST (with carryover) → resolve hints to IDs → all gaps closed
→ Conflict check: דנה ב-90% FTE → warning (non-blocking)
→ Stage: confirmation → Confirmation card with summary
→ User clicks "אשר"
→ API PUT → mockTasks.push(newTask) + audit log
→ Stage: done + toast
```

**אבטחה ופרטיות:**
- כל קריאת API מקבלת RBAC guard לפני execution
- Zero Data Retention: Claude API נקרא ללא שמירת נתונים
- Audit log עם `performedBy: "ai_assistant"` - ניתן להבחין בין פעולות אנושיות ל-AI
- Human-in-the-loop חובה - ה-AI אף פעם לא מבצע פעולות mutation "עיוורות"

**UI:**
- כפתור צף סגול-וויולט בפינה (bottom start, לא חופף ל-help bot)
- Chat drawer 440×680 עם header gradient
- אינדיקטורי state: listening (pulse red), processing (amber), ready (green)
- Mic toggle + text input dual mode
- Suggestion chips לפרויקטים/משתמשים בזמן clarification
- Confirmation card עם borders violet, summary formatted, conflicts shown as warnings
- TTS toggle button
- Footer hint על RBAC + Audit Log + Confirmation

**המגבלות הנוכחיות** (לציון בייצור):
- Mock data mode - השינויים בזיכרון בלבד, אובדים ב-restart
- Meeting intelligence (summarize_meeting): ה-action מוגדר אבל לא ממומש מלא
- TTS ו-STT תלויים בדפדפן - Firefox לא נתמך
- Claude API fallback ל-heuristic parser פשוט אם אין API key

---

## 🆕 סבב פיתוח 8 - תוכנית ניהול סיכונים אקטיבית של ה-AI

### מה נוסף:
1. **`MockUser` הורחב** עם 3 שדות חדשים:
   - `skills` - מערך כישורים (לדוגמה: `["aws", "kubernetes", "devops"]`)
   - `performanceScore` - 0-100 (היסטוריית on-time delivery)
   - `hourlyCapacity` - שעות לשבוע (default 40)
   - **6 משתמשים קיבלו skills + performance score** מציאותיים

2. **`lib/ai/mitigation-engine.ts` חדש** (~500 שורות) עם 4 capabilities:

   **A. `findBestReassignment(task, users, members, allTasks)`**:
   - מחשב לכל user candidate score המבוסס על:
     - **Skill match** (40% משקל) - השוואת user.skills מול task tags + title keywords
     - **Availability** (35%) - 100 - FTE allocation
     - **Performance** (25%) - performanceScore היסטורי
     - **Load penalty** - הפחתה לכל active task נוסף
   - מחזיר ReassignmentSuggestion עם match score 0-100, reasoning במילים, ו-3 metrics

   **B. `getMitigationActionsForRisk(riskType, task)`**:
   - מקטלוג של actions per risk type:
     - **blocked**: פגישת הסלמה / משאב סיוע / פיצול משימה
     - **overdue**: עדכון baseline / תגבור / daily standups
     - **effort_overrun**: scope reduction / ייעוץ טכני
     - **schedule_slip**: pair programming / pinning the assignee
     - **critical_not_started**: kick-off היום / הסלמה ל-sponsor
   - לכל action: effort (low/medium/high), impact, timeframe

   **C. `predictAutoRoute(taskTitle, tags, hours, users, members)`**:
   - לפי skills + availability + performance, מחזיר suggested user + alternatives
   - שימוש: לכל משימה חדשה - מי הכי מתאים?

   **D. `generateMitigationPlan(tasks, users, members)`** - **ה-aggregator הראשי**:
   - מאחד את כל הניתוחים לתוכנית פעולה אחת
   - Sections:
     - reassignments (top 6 לפי match score)
     - strategies (top 8 sorted by severity)
     - bottlenecks (top 5)
     - **earlyWarnings** - קריטי לא התחיל / bottlenecks קרבים / forecast warning
   - summary: totalActions, immediateActions, riskTasksCount, bottleneckUsersCount

3. **`MitigationPlanCard` component** - הקומפוננטה המרשימה ביותר עד כה (~500 שורות):
   - **Header gradient** purple-indigo עם 2 stats: סך פעולות + מיידיות
   - **Section 1: Smart Reassignment** - לכל הצעה:
     - Match score badge (ירוק/צהוב/אדום)
     - From/To avatars עם Arrow
     - Reasoning כ-badges (✓ X כישורים תואמים, ✓ זמינות, ✓ ביצועים)
     - Mini metrics: skills% / available% / perf/100
   - **Section 2: Mitigation Strategies** - collapsible per strategy:
     - Severity badge + risk type
     - Preferred action preview עם ⭐
     - Click to expand → all 2-3 actions עם effort/impact/timeframe badges
     - Apply button על האקשן המומלץ
   - **Section 3: Early Warnings** - רשימת אזהרות אמבר עם אייקון
   - **Section 4: Footer** עם timestamp + Regenerate button

4. **AI Sidekick API מועשר** - context snapshot כולל עכשיו mitigationPlan עם reassignments, strategies ו-earlyWarnings

### עקרונות שיושמו:
- **Skill-availability-performance triple** - לא רק מי פנוי, אלא מי מתאים
- **Effort-impact ratio** - הפעולה המומלצת היא זו עם היחס הטוב ביותר
- **Categorized actions** - כל פעולה משויכת ל-resource/schedule/scope/process/escalation
- **Apply button per action** - לא רק תיאור, יש מה לעשות
- **Early warnings קודמים לבעיות** - חיזוי לפני שהבעיה מתרחשת
- **Single-source-of-truth** - generateMitigationPlan הוא ה-API היחיד שצריך

---

## 🆕 סבב פיתוח 7 - שיפור AI לניהול סיכונים פרואקטיבי

### מה נוסף:
1. **Risk Engine Enhanced** ב-`lib/ai/risk-engine.ts` עם 3 ניתוחים חדשים:

   **A. `detectResourceBottlenecks(users, members, tasks)`** - מנתח את הקיבולת של חברי הצוות:
   - בודק FTE > 80% וסימון "סף בטיחות"
   - מזהה משתמשים שעובדים על משימות בנתיב הקריטי + הקצאת יתר → critical bottleneck
   - מזהה 2+ משימות חסומות במקביל לאותו משתמש → high
   - מחזיר רשימה של ResourceBottleneck עם severity, message, recommendation

   **B. `predictProjectEndDate(tasks)`** - חיזוי תאריך סיום ריאליסטי:
   - מחשב velocity actual (משימות שנסגרו לשבוע)
   - מחשב velocity required (כמה צריך לסגור כדי לעמוד בלו"ז)
   - מחשב avg slip from completed tasks (כמה ימי איחור היו בממוצע)
   - מכפיל את הסליפ במספר המשימות הנותרות (capped)
   - מחזיר ProjectForecast עם plannedEnd, forecastEnd, delayDays, confidence

   **C. `computeDependencyImpact(taskId, delayDays, tasks)`** - אפקט שרשרת:
   - בונה forward graph (task → tasks that depend on it)
   - BFS forward מהמשימה המעוכבת
   - בודק אם משימות מושפעות הן בנתיב הקריטי (CPM)
   - מחשב cascade days = delay × √(max depth)
   - מחזיר DependencyImpact עם affectedCount, criticalCount, message, recommendation

   **D. `generateActiveRecommendations(tasks, users, members)`** - aggregator חכם:
   - חוצה את כל הניתוחים ומפיק רשימת המלצות מסודרת לפי priority (now/soon/watch)
   - 4 קטגוריות: blocker / resource / schedule / scope / quality
   - לכל המלצה: title, detail, actionLabel, affectedTaskIds

2. **4 רכיבי UI חדשים** ב-`/risks` page:
   - **`ResourceBottlenecks`** - גרף FTE עם safety line ב-80%, אזהרת overallocation, badges של critical assignments
   - **`PredictiveForecast`** - 3 כרטיסי תאריכים: planned / forecast / variance, +velocity actual vs required, +AI insight
   - **`DependencyImpactCard`** - ויזואליזציה של אפקט שרשרת: 3 מספרים מובלטים (affected → critical → cascade days)
   - **`ActiveRecommendations`** - "מה לעשות עכשיו" עם action buttons, מסודר לפי priority

3. **AI Sidekick API משופר** ב-`/api/ai/chat/route.ts`:
   - context snapshot עכשיו כולל: bottlenecks, forecast, recommendations, AI risks
   - System prompt משופר עם 5 חוקי תשובה: lead with conclusion, use numbers, give action, real names, icons
   - תמיכה בעברית מלאה עם הוראות RTL

### עקרונות שיושמו:
- **Proactive over reactive** - האיתור הוא לפני הבעיה, לא אחרי
- **Pattern over snapshot** - ה-forecast לומד מהיסטוריה
- **Cascade thinking** - כל עיכוב מעוכב במחשבה של ה-domino effect
- **Action-oriented insights** - לכל ניתוח יש המלצה מעשית
- **Severity sorting** - מסודר לפי דחיפות
- **Single source of recommendations** - generateActiveRecommendations הוא ה-aggregator שמפשט את ה-API

---

## 🆕 סבב פיתוח 6 - גאנט מתקדם + WBS עם Roll-up ונתיב קריטי

### מה נוסף:
1. **Critical Path Method (CPM) algorithm** ב-`lib/gantt/critical-path.ts`:
   - Topological sort של ה-DAG (Kahn's algorithm)
   - Forward pass: earliest start/finish
   - Backward pass: latest start/finish
   - Slack calculation - tasks עם slack=0 הם critical
   - מחזיר Set של criticalTaskIds + totalDays
2. **WBS Roll-up** ב-`lib/gantt/rollup.ts`:
   - אגרגציה רקורסיבית מ-leaf nodes למעלה דרך כל ההיררכיה
   - שעות מתוכננות/בפועל (סכום)
   - אחוז התקדמות משוקלל לפי שעות
   - תאריכים מינימלי/מקסימלי
   - עלויות (hourly rate × שעות)
   - ספירת משימות (total/done/blocked/overdue)
3. **Auto-numbering** WBS (1, 1.1, 1.1.1, 1.2...)
4. **Export utilities** ב-`lib/gantt/export.ts`:
   - CSV עם BOM ל-UTF-8 (תואם Excel עם עברית)
   - PDF דרך window.print() עם print stylesheet
5. **`AdvancedGantt` component** (~700 שורות) - הרכיב המרכזי עם:
   - **WBS table משמאל** עם sync scroll: מספור, שמות, hours/estimate, progress bars
   - **Gantt chart מימין**:
     - **תכנון מול ביצוע** - שני פסים מקבילים: פס שקוף עליון (baseline) ופס צבעוני תחתון (actual)
     - **נתיב קריטי** עם toggle: מדגיש אדום, מציג Zap icon, ring highlight על הפסים
     - **אבני דרך** (milestones) כיהלום סגול עם דגל לבן
     - **חוצץ זמן** (Buffer) עם toggle - מלבן מקווקו כחול אחרי הנתיב הקריטי
     - **Today line** עם נקודה כתומה
     - **Roll-up bars** - פסי אב להראות summary של node
     - **קידוד צבעים בריאות** - ירוק/צהוב/אדום אוטומטי לפי `getTaskHealth`
     - **RTL מלא** - הציר LTR פנימי כדי שתאריכים קוראים לשמאל-לימין נכון
   - **Toolbar** עם: Critical Path toggle, Buffer toggle, Expand/Collapse all, Zoom in/out, Excel export, PDF print
   - **Legend** מקרא צבעים וסמלים
   - **Footer stats**: WBS items, tasks, critical path count, total work days
   - **Month groups** בכותרת התאריכים + יום בודד
   - **Weekend stripes** ברקע
   - **Sync scroll** בין ה-WBS table וה-Gantt
6. **`task-gantt.tsx` עכשיו wrapper** ל-AdvancedGantt - הולך up to find the project root, ואז מציג

### עקרונות:
- **CPM הוא הסטנדרט הקלאסי** של ניהול פרויקטים - PMI's PMBOK
- **Health-based coloring** משלב סטטוס + due date proximity + progress vs elapsed
- **Roll-up תמיד weighted by effort** (לא ממוצע פשוט)
- **Auto-numbering** עם depth-first traversal
- **CSV with BOM** הוא הדרך היחידה ש-Excel קורא עברית נכון
- **direction: ltr פנימי בתוך RTL** - חיוני לציר זמן שעובד נכון

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

---

## 🆕 סבב פיתוח 21 - רב-לשוניות מלאה, הרשאות, ידע מערכתי

### חלק א': רב-לשוניות מלאה (5 שפות)
- **בעיה**: 34 קבצים השתמשו ב-`isHe ? "עברית" : "English"` — כשרוסית/צרפתית/ספרדית נבחרה, הוצג אנגלית
- **פתרון**: נוצר `lib/utils/locale-text.ts` עם:
  - `txt(locale, { he, en, ru, fr, es })` — helper מרכזי
  - `STATUS_LABELS_ML`, `PRIORITY_LABELS_ML`, `TAB_LABELS_ML` — מילוני תרגום
  - `WEEKDAYS_ML`, `ORG_NAME`, `INTL_LOCALE` — נתוני עזר
  - `COMMON_LABELS` — ביטויים נפוצים
- **עודכנו 32 קבצים**: sidebar, landing, task tabs, calendar, team, admin, gantt, risk, dashboard
- **ROLE_LABELS** הורחב מ-`{ he, en }` ל-5 שפות
- **formatDate/formatDateTime** — מקבלים כל locale string (לא רק he/en)
- **getTimeRemaining** — מחזיר labels ב-5 שפות
- **NAV_ITEMS** — 15 פריטי ניווט מתורגמים ב-5 שפות

### חלק ב': הסתרת מיילים + הזמנות
- **מיילים הוסתרו**: team page, gantt popup, reassign dialog, admin panel
- **הזמנת חבר**: toast שונה ל-"מצב הדגמה" עם הסבר שבייצור יישלחו הודעות

### חלק ג': יומן אינטראקטיבי
- **לחיצה על משימה** → popup עם שם, סטטוס, אחוז, אחראי, תאריכים
- **קישור "פתח משימה"** → ניווט ישיר
- **ימי שבוע ותאריכים** → מתורגמים לפי locale

### חלק ד': ידע מערכתי מורחב (בוט עזרה + עוזר אישי)
- **בעיה**: שאלות כמו "איך מגדירים KPI?" לא קיבלו תשובה
- **Help Bot** — נוספו 12 כרטיסי ידע חדשים (סה"כ 42):
  - KPI: איך מגדירים, מדדי PM, מדדי PMO, בורר תפקיד
  - Admin: טבלת הרשאות, הוספת משתמשים, סוגי פריטים
  - יומן: אינטראקטיביות, Google Calendar
  - קול: הקלטה, iOS/Android
  - ייצוא: Excel, PDF
- **עוזר אישי** — נוסף handler `SYSTEM KNOWLEDGE`:
  - מזהה שאלות "איך/מה זה/כיצד" ומחפש ב-Knowledge Base
  - אם נמצא → מחזיר תשובה מפורטת + נושאים קשורים
  - אם לא נמצא → מציע קטגוריות (משימות, KPI, הרשאות, יומן, סיכונים, אוטומציות)
  - תפריט עזרה הורחב ל-11 קטגוריות

### חלק ה': תפקיד מנכ"ל + טבלת הרשאות
- **מנכ"ל (u6)** שונה מ-`admin` ל-`manager`:
  - צפייה ועדכון בכל — ✅
  - הוספת/מחיקת משתמשים — ❌
- **רכיב `UserPermissionsTable` חדש** (`components/admin/user-permissions-table.tsx`):
  - טבלה מלאה של 6 משתמשים × 12 הרשאות
  - ✅/❌ לכל תא עם קידוד צבע
  - כותרת + סיכום הרשאות לכל משתמש (X/12)
  - Badge תפקיד, avatar, שמות
  - מטריצת הרשאות מובנית per-role
- **Admin Tabs** — נוסף טאב 5: "טבלת הרשאות" / "Permissions Table"

---

## 🆕 סבב פיתוח 22 - גאנט רספונסיבי + KPI אינטראקטיבי

### חלק א': גאנט רספונסיבי למובייל/טאבלט
- **TABLE_WIDTH** הפך רספונסיבי: `w-[200px] sm:w-[520px]`
- **עמודות Duration, Start, Finish, Resource** מוסתרות במובייל (`hidden sm:block`)
- במובייל מוצג רק שם המשימה/WBS עם עץ היררכי
- **minWidth** הוסר מכותרות ושורות — מתאימים לרוחב הדינמי
- **Popup detail** ממורכז על המסך במקום בנקודת לחיצה (עובד טוב במגע)
- הסרגל התחתון (legend/stats) מוצג בצורה מקוצרת במובייל

### חלק ב': KPI אינטראקטיבי עם בועות מידע
- **8 כרטיסי KPI** (4 PM + 4 PMO) הפכו ללחיצים
- **`ClickableKpiCard`** — wrapper חדש שמוסיף cursor-pointer + shadow hover
- **`InfoPopup`** — רכיב bubble שנפתח מתחת לכרטיס בלחיצה:
  - אנימציית fade-in + slide
  - כפתור סגירה
  - גלילה אם יש תוכן רב
  - overlay שסוגר בלחיצה מחוץ

**PM KPIs — תוכן הפופאפ:**
- **חריגת לו"ז** → רשימת פרויקטים עם variance בימים (badge ירוק/אדום)
- **אבני דרך** → רשימת milestones קריטיים (באיחור/בזמן)
- **Throughput** → פירוט שבועי (W1-W6) תכנון מול ביצוע + אחוז
- **תקציב** → פירוט לפי פרויקט עם progress bar ואחוז ניצול

**PMO KPIs — תוכן הפופאפ:**
- **יישור אסטרטגי** → רשימת פרויקטים (מיושר ✅ / לא ⚠️)
- **ROI** → ROI לפי פרויקט
- **ניצולת משאבים** → FTE לכל חבר צוות + משימות פתוחות + progress bar
- **סיכונים** → רשימת משימות חסומות/באיחור עם badges

---

## 🆕 סבב פיתוח 23 - מעבר בין תפקידים + RBAC דינמי

### חלק א': RoleProvider Context
- **`lib/auth/role-context.tsx`** — React Context חדש:
  - `currentUser` — המשתמש הפעיל
  - `switchUser(userId)` — מחליף משתמש (וממילא תפקיד)
  - `role` — UserRole הנוכחי
  - `can(permission)` — בדיקת הרשאה (12 הרשאות)
- מטריצת הרשאות מובנית per-role
- עוטף את כל ה-Dashboard layout

### חלק ב': Role Switcher בסרגל כלים
- **כפתור תפקיד צבעוני** בסרגל העליון עם badge ושם התפקיד
- **תפריט נפתח** עם 6 המשתמשים: avatar, שם, תפקיד, אייקון
- לחיצה מחליפה את המשתמש הפעיל **מיידית**
- הסבר "הממשק ישתנה בהתאם להרשאות התפקיד"

### חלק ג': RBAC דינמי — מה משתנה לפי תפקיד

| רכיב | Admin | Manager | Member | Viewer | Guest |
|---|---|---|---|---|---|
| תפריט ניווט | 15 פריטים | 13 (ללא Admin, Settings) | 11 | 9 | 7 |
| כפתור "הוסף משימה" | ✅ | ✅ | ✅ | ❌ | ❌ |
| כפתור "הזמן חבר" | ✅ | ❌ | ❌ | ❌ | ❌ |
| דף ניהול מערכת | ✅ | Access Denied | Access Denied | Access Denied | Access Denied |
| אוטומציות | ✅ | ✅ | ❌ | ❌ | ❌ |
| מרכז AI | ✅ | ✅ | ✅ | ❌ | ❌ |
| דוחות | ✅ | ✅ | ✅ | ✅ | ❌ |

### חלק ד': רכיבי תשתית
- **`RoleGate`** component — עוטף ילדים ומציג רק אם יש הרשאה: `<RoleGate permission="manage_team">...</RoleGate>`
- **`AdminPageClient`** — גרסת client של דף Admin עם guard מובנה מהקונטקסט
- **Sidebar** — מסנן פריטי ניווט לפי הרשאות התפקיד

---

## 🆕 סבב פיתוח 24 - מטריצת הרשאות אינטראקטיבית + תפקיד מותאם

### מטריצת הרשאות
- **כל תא** הפך לכפתור toggle לחיץ (למעט Admin שתמיד מלא)
- **Hover effects**: טבעת ירוקה / גוון אדום
- **שמור/אפס**: כפתורים מופיעים אוטומטית כשיש שינויים
- **Badge "שינויים לא שמורים"** — התראה ויזואלית

### יצירת תפקיד מותאם
- **דיאלוג מלא**: שם עברית+אנגלית, תבניות מוכנות (כמנהל/חבר/צופה)
- **Checkbox list** ל-12 הרשאות עם משוב ויזואלי
- תפקידים מותאמים מופיעים ככרטיסים סגולים מקווקוים
- ניתן למחוק תפקידים מותאמים

---

## 🆕 סבב פיתוח 25 - תיקון שפות מקיף + עוזר אישי בעברית

### תיקון 346 דפוסי `isHe` ב-18 קבצים
המרה מכנית של `isHe ? "עברית" : "English"` → `txt(locale, { he: "...", en: "..." })`:
- **role-based-kpi.tsx** (67→0) — דשבורד KPI מלא
- **add-task-dialog.tsx** (46→0) — טופס הוספת משימה
- **automation-builder.tsx** (34→0) — בנאי אוטומציות
- **personal-assistant.tsx** (32→0) — עוזר אישי
- **users/types/hierarchy-manager** (54→0) — ניהול מערכת
- **close-task/reassign-task** (22→0) — דיאלוגי משימות
- **gantt-page-client** (6→0) — עמוד גאנט
- ועוד 5 קבצי admin

### עוזר אישי — תמיד מדבר עברית
- **בעיה**: `heuristicParse()` ו-API route השתמשו ב-`locale: "he" | "en"`, כך שרוסית/צרפתית/ספרדית נחשבו כאנגלית
- **פתרון**: `isHe` שונה ל-`locale !== "en"` — **עברית ברירת מחדל** לכל שפה שאינה אנגלית
- **חתימות טיפוסים**: `buildSystemPrompt`, `heuristicParse`, `buildConfirmationSummary`, `summarizeText` — כולם שונו מ-`"he"|"en"` ל-`string`

### שמות משתמשים → תפקידים
- u1: "מארק ישראל" → **"מנהל פרוגרמת Salesforce"**
- כל ההערות בקוד עודכנו מ-שמות אישיים לתפקידים

### גאנט אינטראקטיבי מורחב
- **popup משימה**: סטטוס+עדיפות+קריטי, תאריכי תכנון ובפועל, משך, שעות, התקדמות, **תלויות** (תלוי ב/חוסם את), tags, אחראי+תפקיד
- **popup WBS**: תאריכים מצטברים, משימות/הושלמו/חסומות/באיחור, שעות, תוצר
- **ספירת תלויות** בפוטר הגאנט
