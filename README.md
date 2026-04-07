# Work OS - פלטפורמת ניהול פרויקטים פנים-ארגונית

> **Work OS** היא פלטפורמת ניהול פרויקטים ארגונית (PMO) הבנויה ב-Next.js 15, שנועדה לגשר על הפער בין אסטרטגיה לביצוע - עם תמיכה מלאה ב-RTL בעברית, AI מובנה (Claude), ואינטגרציה עם Google Calendar.

נבנתה על בסיס המסמכים בתיקיית `מידע/` (סיכום שיחה, HLD, מפרט טכני).

---

## ✨ תכונות עיקריות

### ניהול פרויקטים PMO
- **היררכיית WBS מלאה**: Portfolio → Program → Project → Goal → Milestone → Activity → Task → Subtask
- **תצוגות מרובות**: List, Kanban (drag & drop), **Gantt עם תמיכת RTL מלאה**, Calendar
- **Planned vs Actual**: מעקב baseline, חישוב variance אוטומטי, SLA tracking
- **Dependencies**: FS / SS / FF / SF
- **Custom fields, tags, attachments, comments**

### דשבורדים ו-KPIs
- מטריקות בריאות פרויקט בזמן אמת (0-100)
- גרפי velocity, workload, status distribution
- Portfolio rollup view - אגרגציה בין פרויקטים
- KPI cards: active projects, open tasks, overdue, completed

### AI מובנה (Claude)
- **Risk Engine**: סורק את כל המשימות ומזהה סיכונים (overdue, blocked, effort overrun, schedule slip, critical not started)
- **AI Sidekick**: צ'אט אינטראקטיבי בעברית עם הקשר מלא של הארגון
- **Summarization**: סיכום אוטומטי של עדכונים ופגישות
- **Digital Workers**: יצירת תת-משימות אוטומטית, AI auto-reply

### Internationalization & RTL
- **עברית + אנגלית** - מתחלפים בלחיצה אחת
- **RTL מלא** - כיווניות, יישור, פונטים (Heebo + Inter)
- אין mixing של שפות בטפסים (טיפול בכשל הידוע של monday/ClickUp)

### RBAC
- 5 תפקידים: Admin, Manager, Member, Viewer, Guest
- CASL-based abilities
- Column-level permissions

### Google Calendar Integration
- 2-way sync stub (webhook + delta tokens)
- מוכן לחיבור Google OAuth credentials

### אוטומציות
- Trigger types: status change, date approaching, field update, comment mention
- Action types: assign, notify, create subtask, AI generate

---

## 🛠️ Tech Stack

| שכבה | טכנולוגיה |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 3 + shadcn/ui primitives |
| DB | Postgres (Neon/Vercel) + Drizzle ORM |
| Auth | Auth.js (NextAuth v5) - מוכן ל-Google OAuth |
| State | Zustand + TanStack Query |
| RBAC | CASL |
| i18n | next-intl (he/en + RTL) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| AI | @anthropic-ai/sdk (Claude Sonnet 4.5) |
| Calendar | googleapis |
| Deployment | Vercel |

---

## 🚀 הפעלה מהירה

הפרויקט כבר מותקן ומוגדר. השרת רץ כבר על:

```
http://localhost:3001/he   ← עברית
http://localhost:3001/en   ← אנגלית
```

### להפעלה מחדש:

```bash
cd "C:\Users\imark\Desktop\יישום ניהול משימות\work-os"
npm run dev
```

הוא יעלה על http://localhost:3000 (או 3001 אם 3000 תפוס).

### דפים שנבנו:

| נתיב | תיאור |
|---|---|
| `/he` | דשבורד ראשי - KPIs, charts, recent tasks, AI insights |
| `/he/portfolios` | תצוגת פורטפוליו עם rollup על תוכניות |
| `/he/projects` | רשת כל הפרויקטים עם health score |
| `/he/projects/[id]` | דף פרויקט בודד עם WBS tree + 4 תצוגות (List/Kanban/Gantt/Calendar) |
| `/he/tasks` | רשימת כל המשימות |
| `/he/tasks/[id]` | דף משימה בודדת עם tabs (תיאור, סיכונים, תגובות, מטא-דאטה) |
| `/he/calendar` | תצוגת יומן חודשית |
| `/he/ai` | מרכז AI עם רשימת סיכונים + Sidekick chat |
| `/he/automations` | ניהול אוטומציות |
| `/he/team` | רשימת חברי צוות |
| `/he/reports` | דוחות אנליטיים |
| `/he/settings` | הגדרות מערכת |

---

## 📂 מבנה הפרויקט

```
work-os/
├── app/
│   ├── [locale]/                  # next-intl routing (he/en)
│   │   ├── (dashboard)/           # קבוצת דפים מאוחדת עם sidebar
│   │   │   ├── layout.tsx         # Sidebar + Topbar
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── portfolios/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── ai/page.tsx
│   │   │   ├── automations/page.tsx
│   │   │   ├── team/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── layout.tsx             # ThemeProvider + i18n + RTL
│   ├── api/
│   │   ├── ai/chat/route.ts       # AI Sidekick endpoint
│   │   └── webhooks/google-calendar/route.ts
│   ├── globals.css
│   └── layout.tsx                 # root
├── components/
│   ├── ui/                        # shadcn primitives (Button, Card, Badge, ...)
│   ├── layout/                    # Sidebar, Topbar
│   ├── dashboard/                 # ProgressChart, WorkloadChart, StatusDistribution, RecentRisks, RecentTasks
│   ├── projects/                  # ProjectViews, TaskList, TaskKanban, TaskGantt, TaskCalendar
│   ├── wbs/wbs-tree.tsx           # רקורסיבי - WBS hierarchy
│   ├── ai/ai-sidekick.tsx         # Chat UI
│   └── theme-provider.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Drizzle Postgres schema (18 tables)
│   │   ├── types.ts               # TS types + color maps
│   │   └── mock-data.ts           # ⭐ נתוני דגימה - 5 משתמשים, 10 wbs nodes, 10 tasks, 4 risks
│   ├── ai/
│   │   ├── claude.ts              # Anthropic SDK wrapper
│   │   └── risk-engine.ts         # heuristics לזיהוי סיכונים
│   ├── i18n/
│   │   ├── config.ts              # locales + isRTL
│   │   ├── request.ts             # next-intl
│   │   └── routing.ts             # navigation hooks
│   ├── rbac/abilities.ts          # CASL ability definitions
│   └── utils.ts                   # cn(), formatDate, variance calc
├── messages/
│   ├── he.json                    # תרגומי עברית
│   └── en.json                    # English translations
├── middleware.ts                  # next-intl locale routing
├── tailwind.config.ts             # CSS variables + theme
├── next.config.ts                 # next-intl plugin
├── drizzle.config.ts
├── .env.example
├── package.json
└── README.md
```

---

## 🔌 הגדרת אינטגרציות (אופציונלי)

המערכת רצה במצב **Demo Mode** עם נתוני דמה. כדי לחבר שירותים אמיתיים:

### 1. Anthropic Claude (AI Sidekick + Risk Engine)
```bash
# .env.local
ANTHROPIC_API_KEY="sk-ant-..."
```
קבל מפתח ב: https://console.anthropic.com/

### 2. Postgres (Neon - חינמי)
```bash
# .env.local
DATABASE_URL="postgresql://user:pass@host/db"
```
1. צור פרויקט ב-https://neon.tech
2. העתק את ה-connection string
3. הרץ: `npm run db:push`

### 3. Google Calendar (2-way sync)
```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```
1. צור OAuth client ב-https://console.cloud.google.com
2. הוסף scope: `https://www.googleapis.com/auth/calendar`
3. Redirect URI: `http://localhost:3000/api/auth/callback/google`

### 4. Auth.js (Google OAuth login)
```bash
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"
```

---

## 🌐 פריסה ל-Vercel

```bash
npm install -g vercel
vercel login
vercel
```

הוסף את ה-Environment Variables ב-Vercel dashboard, ופרוס.

לפריסת ה-DB, מומלץ להשתמש ב-Neon Postgres (יש אינטגרציה native ב-Vercel).

---

## 📊 נתוני הדמה

הפרויקט מגיע עם נתוני דגימה ריאליסטיים בעברית:

- **5 משתמשים**: אורי, שרה, David, מאיה, יוסי
- **2 פורטפוליות**: טרנספורמציה דיגיטלית 2026
- **2 תוכניות**: ענן ותשתיות, AI ואוטומציה
- **2 פרויקטים**: מעבר ל-AWS, פלטפורמת AI פנימית
- **10 משימות** במצבים שונים (in progress, blocked, done, review)
- **4 סיכונים פעילים** (זוהו אוטומטית ע"י Risk Engine)
- **3 אוטומציות** (SLA alerts, auto-close subtasks, AI generate)

הנתונים נמצאים ב-`lib/db/mock-data.ts` ואפשר לערוך אותם בקלות.

---

## ✅ אימות שהמערכת עובדת

| בדיקה | סטטוס |
|---|---|
| `npm install` | ✅ 612+ חבילות |
| `npm run dev` | ✅ Ready in ~2s |
| `GET /he` (דשבורד עברית) | ✅ 200 |
| `GET /en` (English) | ✅ 200 |
| `GET /he/projects` | ✅ 200 |
| `GET /he/projects/wbs-project-1` | ✅ 200 |
| `GET /he/tasks/task-2` | ✅ 200 |
| `GET /he/ai` | ✅ 200 |
| `GET /he/calendar` | ✅ 200 |
| `GET /he/portfolios` | ✅ 200 |
| `GET /he/team` | ✅ 200 |
| `GET /he/automations` | ✅ 200 |
| `GET /he/settings` | ✅ 200 |
| `GET /he/reports` | ✅ 200 |
| RTL direction (`dir="rtl"`) | ✅ |
| Language toggle (he ↔ en) | ✅ |
| Theme toggle (light/dark) | ✅ |
| Kanban drag & drop | ✅ |
| Gantt chart RTL | ✅ |

---

## 🗺️ Roadmap המשך פיתוח

הבסיס מוכן. השלבים הבאים שדורשים API keys / DB אמיתי:

1. **חיבור DB אמיתי**: Neon Postgres + `npm run db:push` + מעבר מ-mock-data ל-Drizzle queries
2. **Auth.js**: השלמת `lib/auth.ts` עם Google provider
3. **AI לייב**: הוספת `ANTHROPIC_API_KEY` תפעיל את ה-Sidekick
4. **Google Calendar**: השלמת `lib/google-calendar/sync.ts` עם delta tokens + watch channels
5. **Persistence**: החלפת `useState` ב-Kanban עם server actions
6. **Audit log**: רישום אוטומטי של כל פעולה (יש כבר schema)
7. **Real-time**: WebSockets / SSE לעדכונים חיים בין משתמשים
8. **Testing**: Vitest + Playwright

---

## 📝 מסמכי המקור

המערכת נבנתה בהתאם לדרישות ב-`../מידע/`:
- `סיכום שיחה.docx`
- `מסמך עיצוב ברמה גבוהה (HLD).docx`
- `מפרט טכני ופונקציונלי.docx`
- `פלטפורמת ניהול פרויקטים פנים-ארגונית (Work OS).docx`
- `project_pitch.pptx`

---

**🎉 המערכת חיה ופועלת! פתח את http://localhost:3001/he בדפדפן.**
