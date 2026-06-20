/**
 * Generate the comprehensive PMO++ presentation (20 slides — one per chapter).
 * Run from work-os/: node scripts/generate-presentation-v2.js
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5 inches
pres.author = "PMO++";
pres.title = "PMO++ - פלטפורמת ניהול פרויקטים פנים-ארגונית";
pres.company = "המרכז למיפוי ישראל";
pres.rtlMode = true;

const C = {
  primary: "1E5FA8",
  primaryDark: "0D3A72",
  primaryLight: "CADCFC",
  accent: "F59E0B",
  success: "10B981",
  danger: "EF4444",
  warning: "F97316",
  purple: "7C3AED",
  pink: "EC4899",
  indigo: "4F46E5",
  teal: "0D9488",
  white: "FFFFFF",
  offWhite: "F8FAFC",
  light: "F1F5F9",
  muted: "64748B",
  dark: "0F172A",
};

const F = { header: "Arial Black", body: "Calibri" };

const TOTAL = 20;

function header(slide, num, titleHe, titleEn) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.3, h: 0.15,
    fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  slide.addText(`${num}/${TOTAL}`, {
    x: 0.4, y: 0.3, w: 0.8, h: 0.4,
    fontSize: 11, color: C.muted, fontFace: F.body, align: "left", margin: 0,
  });
  slide.addText(titleHe, {
    x: 0.6, y: 0.4, w: 12.1, h: 0.7,
    fontSize: 30, color: C.primaryDark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  slide.addText(titleEn, {
    x: 0.6, y: 1.05, w: 12.1, h: 0.35,
    fontSize: 13, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 1.45, w: 12.1, h: 0.03,
    fill: { color: C.primaryLight }, line: { color: C.primaryLight, width: 0 },
  });
}

function footer(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 7.35, w: 13.3, h: 0.15,
    fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  slide.addText("PMO++ · המרכז למיפוי ישראל · 2026", {
    x: 0.6, y: 7.0, w: 12, h: 0.3,
    fontSize: 9, color: C.muted, fontFace: F.body, align: "right", margin: 0,
  });
}

function bullet(slide, x, y, w, h, items, color = C.dark) {
  slide.addText(items.map((t) => ({ text: t, options: { bullet: { code: "25CF" }, breakLine: true } })), {
    x, y, w, h, fontSize: 14, color, fontFace: F.body, align: "right", margin: 0, lineSpacingMultiple: 1.3,
  });
}

function statBox(slide, x, y, w, h, value, label, color = C.primary) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1,
  });
  slide.addText(String(value), {
    x, y: y + 0.1, w, h: h * 0.55, fontSize: 28, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  slide.addText(label, {
    x, y: y + h * 0.55 + 0.1, w, h: h * 0.35, fontSize: 11, color: C.white, fontFace: F.body, align: "center", margin: 0,
  });
}

function section(slide, x, y, w, h, title, body, accent = C.primary) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: C.offWhite }, line: { color: accent, width: 1.5 }, rectRadius: 0.08,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.12, h, fill: { color: accent }, line: { color: accent, width: 0 },
  });
  slide.addText(title, {
    x: x + 0.25, y: y + 0.1, w: w - 0.4, h: 0.4,
    fontSize: 14, color: accent, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  slide.addText(body, {
    x: x + 0.25, y: y + 0.55, w: w - 0.4, h: h - 0.65,
    fontSize: 11, color: C.dark, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.2,
  });
}

// ============================================================
// SLIDE 1 — Title
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.primaryDark };
  s.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6, fill: { color: C.primary, transparency: 70 }, line: { color: C.primary, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 9, y: 4, w: 6, h: 6, fill: { color: C.purple, transparency: 80 }, line: { color: C.purple, width: 0 },
  });
  s.addText("PMO++", {
    x: 0.6, y: 1.8, w: 12.1, h: 1.6,
    fontSize: 96, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("פלטפורמת ניהול פרויקטים פנים-ארגונית", {
    x: 0.6, y: 3.5, w: 12.1, h: 0.7,
    fontSize: 28, color: C.primaryLight, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("Internal Project Management Platform", {
    x: 0.6, y: 4.2, w: 12.1, h: 0.5,
    fontSize: 18, color: C.primaryLight, fontFace: F.body, italic: true, align: "center", margin: 0,
  });
  s.addText("המרכז למיפוי ישראל · Israel Mapping Center", {
    x: 0.6, y: 5.2, w: 12.1, h: 0.5,
    fontSize: 22, color: C.accent, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("מצגת מקיפה · 20 פרקים · 2026", {
    x: 0.6, y: 6.4, w: 12.1, h: 0.4,
    fontSize: 14, color: C.primaryLight, fontFace: F.body, align: "center", margin: 0,
  });
}

// ============================================================
// SLIDE 2 — Architecture overview
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 2, "ארכיטקטורה: היררכיה מארבע רמות", "Architecture — 4-tier hierarchy");
  const levels = [
    { name: "פורטפוליו", en: "Portfolio", color: C.primaryDark, y: 1.8, w: 12 },
    { name: "תוכנית (Program)", en: "Program", color: C.primary, y: 2.7, w: 10 },
    { name: "פרויקט", en: "Project", color: C.indigo, y: 3.6, w: 8 },
    { name: "WBS — חבילות עבודה", en: "Work Breakdown Structure", color: C.purple, y: 4.5, w: 6 },
    { name: "משימה", en: "Task", color: C.success, y: 5.4, w: 4 },
    { name: "תת-משימה", en: "Subtask", color: C.warning, y: 6.3, w: 2.5 },
  ];
  for (const lvl of levels) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: (13.3 - lvl.w) / 2, y: lvl.y, w: lvl.w, h: 0.75,
      fill: { color: lvl.color }, line: { color: lvl.color, width: 0 }, rectRadius: 0.1,
    });
    s.addText(`${lvl.name} · ${lvl.en}`, {
      x: (13.3 - lvl.w) / 2, y: lvl.y, w: lvl.w, h: 0.75,
      fontSize: 14, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
  }
  footer(s);
}

// ============================================================
// SLIDE 3 — My Tasks (landing page)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 3, "המשימות שלי — דף הבית", "My Tasks — Landing page");
  section(s, 0.6, 1.8, 6, 2.5, "מטרה",
    "תצוגה אישית של כל המשימות הפתוחות של המשתמש, ממוינות לפי דחיפות. נקודת ההתחלה של כל יום עבודה.\n\nמסך הבית מציג את ה'מה צריך לעשות עכשיו' באופן ברור, ללא צורך לחפש במספר מסכים.",
    C.primary);
  section(s, 6.8, 1.8, 5.9, 2.5, "7 לשוניות סינון",
    "• הכל\n• בביצוע\n• לא התחילו\n• בבדיקה\n• חסומות\n• באיחור\n• לפי פרויקט",
    C.purple);
  section(s, 0.6, 4.5, 6, 2.4, "כל משימה מציגה",
    "• כותרת + תיאור\n• שם הפרויקט (קישור)\n• תאריך יעד + זמן נותר דינמי\n• עדיפות (Badge צבעוני)\n• כפתורי פעולה: סגירה, שיוך מחדש",
    C.indigo);
  section(s, 6.8, 4.5, 5.9, 2.4, "סייד-פאנל הפרויקטים",
    "• הפרויקטים שלי + תפקיד\n• אחוז משרה (FTE) לכל פרויקט\n• סה\"כ FTE עם אזהרת הקצאת יתר (>100%)\n• כפתור + להוספת משימה חדשה",
    C.teal);
  footer(s);
}

// ============================================================
// SLIDE 4 — Dashboards & KPIs
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 4, "דשבורדים ו-KPI — 17 מדדים אינטראקטיביים", "Dashboards & KPI — 17 interactive metrics");
  statBox(s, 0.6, 1.8, 2.7, 1.3, "17", "KPIs", C.primary);
  statBox(s, 3.5, 1.8, 2.7, 1.3, "PM · PMO", "בורר תפקיד", C.indigo);
  statBox(s, 6.4, 1.8, 2.7, 1.3, "EVM", "CPI · SPI", C.purple);
  statBox(s, 9.3, 1.8, 3.4, 1.3, "RAG", "ניהול מנהלים", C.success);
  section(s, 0.6, 3.3, 6, 1.7, "מנהל פרויקט (PM) — תפעולי",
    "Schedule Variance · Milestone Slippage · Throughput שבועי · Budget Adherence · CPI · SPI · Rework Rate",
    C.primary);
  section(s, 6.8, 3.3, 5.9, 1.7, "מנהל PMO — אסטרטגי",
    "Strategic Alignment · ROI · Capacity vs Demand · Risk Trend · Decision Latency · NPS · Burnout · AI Adoption",
    C.purple);
  section(s, 0.6, 5.2, 12.1, 1.8, "מקורות + אינטראקטיביות",
    "כל כרטיס לחיץ → בועת מידע מפורטת עם הסבר, נוסחה, מקור, וגרף לדוגמה. מבוסס תקני PMBOK, EVM, McKinsey, Bain, MBI, Gartner. שני דשבורדים מובחנים ויזואלית (כחול PM / סגול PMO).",
    C.accent);
  footer(s);
}

// ============================================================
// SLIDE 5 — Gantt
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 5, "לוח גאנט מתקדם", "Advanced Gantt with CPM");
  bullet(s, 0.6, 1.9, 6, 4.5, [
    "טבלת WBS משמאל + תרשים גאנט מימין עם Sync scroll",
    "תכנון מול ביצוע — שני פסים מקבילים לכל משימה",
    "נתיב קריטי (CPM) — Kahn's algorithm, תאורה אדומה",
    "אבני דרך (Milestones) — יהלום סגול עם דגל",
    "חוצץ זמן (Buffer) אופציונלי — מלבן מקווקו",
    "Today line — נקודה כתומה במיקום הנוכחי",
    "קידוד צבעים אוטומטי לפי בריאות (ירוק/צהוב/אדום)",
    "Roll-up bars — פסי אב להראות summary",
    "פופאפ לחיצה: סטטוס, תלויות, אחראי, התקדמות",
    "RTL מלא — ציר LTR פנימי לתאריכים",
  ], C.dark);
  section(s, 7, 1.9, 5.7, 2.1, "ייצוא",
    "• Excel (CSV עם BOM ל-UTF-8 תאימות עברית)\n• PDF (window.print + print stylesheet)\n• הסתרת sidebar/topbar אוטומטית בהדפסה",
    C.success);
  section(s, 7, 4.2, 5.7, 2.2, "מובייל",
    "• רוחב טבלה רספונסיבי (200px → 520px)\n• 4 עמודות מוסתרות במובייל\n• פופאפ ממורכז על המסך\n• כפתור min-h-[44px] לטאצ'",
    C.warning);
  footer(s);
}

// ============================================================
// SLIDE 6 — WBS
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 6, "WBS — Work Breakdown Structure", "Hierarchical tree with weighted roll-up");
  section(s, 0.6, 1.8, 12.1, 1.4, "עץ היררכי רקורסיבי",
    "אגרגציה מ-leaf nodes למעלה דרך כל ההיררכיה: שעות מתוכננות/בפועל, אחוז התקדמות משוקלל לפי שעות, תאריכים מינימלי/מקסימלי, עלויות (hourly rate × שעות), ספירת משימות (total/done/blocked/overdue).",
    C.primary);
  section(s, 0.6, 3.3, 6, 1.7, "מספור אוטומטי",
    "Depth-first traversal:\n1 → 1.1 → 1.1.1 → 1.2 → 2 → 2.1 ...",
    C.indigo);
  section(s, 6.8, 3.3, 5.9, 1.7, "Roll-up משוקלל",
    "אחוז התקדמות = Σ(progress × hours) / Σ(hours)\nלא ממוצע פשוט — שווה לפי גודל המשימה.",
    C.purple);
  section(s, 0.6, 5.1, 12.1, 1.9, "Roll-up bars בגאנט",
    "פסי אב מציגים summary של ה-node כולו: תאריך מינימלי של leaf, תאריך מקסימלי של leaf, ממוצע התקדמות משוקלל. לחיצה על node פותחת פופאפ עם משימות / הושלמו / חסומות / באיחור / שעות / תוצר.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 7 — Projects (4 views)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 7, "פרויקטים — 4 תצוגות", "Projects — 4 views per project");
  const views = [
    { name: "רשימה", en: "List", desc: "טבלה עם sortable columns: שם, אחראי, סטטוס, תאריך, התקדמות, עדיפות.", color: C.primary },
    { name: "קנבן", en: "Kanban", desc: "4 עמודות: Not Started / In Progress / Review / Done. גרירה ושחרור עם @dnd-kit.", color: C.indigo },
    { name: "גאנט", en: "Gantt", desc: "AdvancedGantt עם נתיב קריטי, אבני דרך, חוצץ זמן וייצוא Excel/PDF.", color: C.purple },
    { name: "יומן", en: "Calendar", desc: "Calendar grid month view עם משימות צבעוניות לפי עדיפות.", color: C.success },
  ];
  let i = 0;
  for (const v of views) {
    const x = 0.6 + (i % 2) * 6.2;
    const y = 1.8 + Math.floor(i / 2) * 2.6;
    section(s, x, y, 5.9, 2.4, `${v.name} · ${v.en}`, v.desc, v.color);
    i++;
  }
  footer(s);
}

// ============================================================
// SLIDE 8 — Calendar
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 8, "יומן — תצוגה אינטראקטיבית", "Calendar — interactive month view");
  section(s, 0.6, 1.8, 6, 2.3, "תצוגה",
    "Calendar grid חודשי בהתאמת RTL\nימי שבוע מתורגמים לפי locale (5 שפות)\nתאריכים בפורמט מקומי",
    C.primary);
  section(s, 6.8, 1.8, 5.9, 2.3, "אינטראקטיביות",
    "לחיצה על משימה → פופאפ:\n• שם, סטטוס, אחוז, אחראי\n• תאריכי תכנון ובפועל\n• קישור 'פתח משימה' → ניווט ישיר",
    C.purple);
  section(s, 0.6, 4.3, 12.1, 2.7, "אירועי Google Calendar",
    "7 אירועי דמו מסונכרנים מלוח Salesforce: דדליין פרסום הבריף, סקירת חסימת אינטגרציה, ועדת בחינת הצעות, בדיקות UAT, בחירת ספק זוכה, סקירת תחזוקה רבעונית, חוזה סופי.\n\nWebhook עם push notifications מוכן ב-/api/webhooks/google-calendar.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 9 — Risk Management
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 9, "ניהול סיכונים פרואקטיבי", "Proactive Risk Management");
  const risks = [
    { name: "Blocked", desc: "משימה חסומה בהמתנה ל-dependency", color: C.danger },
    { name: "Overdue", desc: "עברה את plannedEnd ולא הושלמה", color: C.warning },
    { name: "Effort Overrun", desc: "actualHours > estimateHours × 1.5", color: C.purple },
    { name: "Schedule Slip", desc: "פיגור גדל ב-2+ שבועות רצופים", color: C.accent },
    { name: "Critical Not Started", desc: "משימה קריטית שלא התחילה תוך 5 ימים", color: C.pink },
  ];
  let i = 0;
  for (const r of risks) {
    const x = 0.6 + (i % 5) * 2.5;
    const y = 1.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: 2.3, h: 1.5, fill: { color: r.color }, line: { color: r.color, width: 0 }, rectRadius: 0.1,
    });
    s.addText(r.name, {
      x, y: y + 0.1, w: 2.3, h: 0.5,
      fontSize: 14, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    s.addText(r.desc, {
      x: x + 0.15, y: y + 0.7, w: 2.0, h: 0.7,
      fontSize: 9, color: C.white, fontFace: F.body, align: "center", margin: 0,
    });
    i++;
  }
  section(s, 0.6, 3.7, 6, 1.5, "חיזוי",
    "Velocity actual vs required\n+ ממוצע סליפ → forecast end date",
    C.primary);
  section(s, 6.8, 3.7, 5.9, 1.5, "אפקט שרשרת",
    "BFS על גרף תלויות → מספר משימות מושפעות, מתוכן בנתיב קריטי, ימי cascade.",
    C.purple);
  section(s, 0.6, 5.3, 12.1, 1.7, "תכנית גידור",
    "4 קטגוריות פעולה: Resource / Schedule / Scope / Process / Escalation. שיוך מחדש חכם: skill match (40%) + availability (35%) + performance (25%).",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 10 — AI Center
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 10, "מרכז AI — Sidekick + תכנית גידור", "AI Center — Sidekick + Mitigation Plan");
  section(s, 0.6, 1.8, 6, 5.1, "AI Sidekick (Chat)",
    "צ'אט מבוסס Google Gemini 2.5 Flash.\n\nContext snapshot מלא של הארגון:\n• כל המשימות והסטטוסים\n• Health score, bottlenecks\n• Forecast + active recommendations\n\nSystem prompt קצר וממוקד:\n• Lead with conclusion\n• Use numbers\n• Give action\n• Real names\n• Icons\n\n5 שפות נתמכות מלאות:\nhe / en / ru / fr / es",
    C.primary);
  section(s, 6.8, 1.8, 5.9, 5.1, "תכנית גידור (MitigationPlanCard)",
    "Header gradient + 2 stats:\n• סך פעולות\n• פעולות מיידיות\n\nSmart Reassignment:\n• Match score 0-100\n• From/To avatars + Arrow\n• Reasoning כ-badges\n\nMitigation Strategies:\n• Severity + risk type\n• Preferred action ⭐\n• Apply button\n\nEarly Warnings:\n• אזהרות אמבר\n• חיזוי לפני בעיה",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 11 — Voice Assistant (NEW chapter)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 11, "עוזר אישי קולי", "Voice Personal Assistant");
  section(s, 0.6, 1.8, 6, 2.4, "STT — דיבור לטקסט",
    "ארכיטקטורה דו-מצבית:\n• Web Speech API (Chrome / Edge)\n• MediaRecorder fallback (iOS Safari / Firefox)\n• Interim results בזמן אמת",
    C.primary);
  section(s, 6.8, 1.8, 5.9, 2.4, "TTS — טקסט לדיבור",
    "5 שפות עם בחירת קול אוטומטית\nרייטינג איכות: Google/Neural > Microsoft Online > Apple > local\nKeep-alive ping (Chrome 15s cutoff fix)",
    C.purple);
  section(s, 0.6, 4.3, 6, 2.6, "הגיית קיצורים נכונה",
    "לו\"ז → לוז (\"luz\")\nמנכ\"ל → מנכל\nסמנכ\"ל → סמנכל\nצה\"ל → צהל\nת\"א → תל אביב\nוכו' → וכולי\n+ Smart quotes ו-Hebrew gershayim ׳ ״",
    C.success);
  section(s, 6.8, 4.3, 5.9, 2.6, "מקטעי 350 תווים",
    "הסרת תקרת 500 התווים הישנה.\nכל תשובה נחתכת בגבול משפט (. ! ?) ומוקראת ברצף.\nSPEAK_TOKEN — לחיצה על מיקרופון מבטלת כל מקטע בתור.\nמצב שיחה: האזנה אוטומטית אחרי תשובה.",
    C.indigo);
  footer(s);
}

// ============================================================
// SLIDE 12 — Reports & Export
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 12, "דוחות וייצוא", "Reports & Export");
  section(s, 0.6, 1.8, 6, 2.5, "ייצוא PDF",
    "ExportPdfButton — window.print() עם print stylesheet מותאם.\n\n• הסתרת sidebar / topbar / כפתורים צפים\n• @page { size: A4 landscape }\n• print-color-adjust: exact\n• Toast notifications (מכין → מוכן)",
    C.primary);
  section(s, 6.8, 1.8, 5.9, 2.5, "ייצוא Excel/CSV",
    "lib/gantt/export.ts:\n\n• CSV עם BOM (\\uFEFF) ל-UTF-8\n• תאימות עברית מלאה ב-Excel\n• אחת הדרכים היחידות שעובדות RTL",
    C.success);
  section(s, 0.6, 4.5, 12.1, 2.5, "מבני דוחות",
    "• Gantt full-width (WBS table + chart)\n• KPI dashboard עם בורר תפקיד\n• רשימת משימות עם פילטרים\n• כרטיסי פרויקטים עם health score\n• רשימת סיכונים + matrix\n• יומן פעילות (Activity Log) של משתמשים",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 13 — Automations
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 13, "אוטומציות — בנאי No-Code", "Automations — No-Code Builder");
  const flow = [
    { label: "Trigger", count: "8", desc: "סוגי טריגרים", color: C.primary },
    { label: "Conditions", count: "4", desc: "תנאים אופציונליים", color: C.indigo },
    { label: "Actions", count: "8", desc: "פעולות (2 AI)", color: C.purple },
  ];
  for (let i = 0; i < flow.length; i++) {
    const x = 0.6 + i * 4.2;
    const f = flow[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.9, w: 3.9, h: 1.8, fill: { color: f.color }, line: { color: f.color, width: 0 }, rectRadius: 0.15,
    });
    s.addText(f.label, {
      x, y: 2.0, w: 3.9, h: 0.6,
      fontSize: 20, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    s.addText(f.count, {
      x, y: 2.6, w: 3.9, h: 0.7,
      fontSize: 36, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    s.addText(f.desc, {
      x, y: 3.25, w: 3.9, h: 0.4,
      fontSize: 11, color: C.white, fontFace: F.body, align: "center", margin: 0,
    });
    if (i < flow.length - 1) {
      s.addText("→", {
        x: x + 3.95, y: 2.4, w: 0.3, h: 0.8,
        fontSize: 28, color: C.muted, fontFace: F.header, bold: true, align: "center", margin: 0,
      });
    }
  }
  section(s, 0.6, 4.0, 12.1, 1.4, "5 תבניות מוכנות",
    "Task Reminder · Overdue Alert · New Risk Notification · Daily Report · Weekly Summary",
    C.success);
  section(s, 0.6, 5.5, 12.1, 1.5, "אופן הבנייה",
    "3 שלבים ויזואליים: Trigger → Conditions → Actions. כרטיס סיכום סגול עם ולידציה ו-toast. אינטגרציה עם 2 AI actions (summarize, recommend).",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 14 — Team & Members
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 14, "צוות וחברים", "Team & Members");
  statBox(s, 0.6, 1.9, 3, 1.3, "6", "חברי צוות", C.primary);
  statBox(s, 3.8, 1.9, 3, 1.3, "ProjectMembers", "FTE per project", C.indigo);
  statBox(s, 7.0, 1.9, 3, 1.3, "5", "תפקידים מובנים", C.purple);
  statBox(s, 10.2, 1.9, 2.5, 1.3, "Avatars", "ראשי תיבות", C.success);
  section(s, 0.6, 3.4, 6, 2.0, "כרטיסי חברים",
    "שם, תפקיד, אבטר עם ראשי תיבות, חטיבה, אגף, FTE כולל בכל הפרויקטים, ספירת משימות פתוחות.",
    C.primary);
  section(s, 6.8, 3.4, 5.9, 2.0, "הזמנת חבר חדש",
    "InviteMemberDialog — שם*, תפקיד, חטיבה, אגף, טלפון*, מייל*. שליחת קישור הזמנה (במצב הדגמה — toast).",
    C.indigo);
  section(s, 0.6, 5.5, 12.1, 1.5, "ProjectMembers component",
    "אגרגציה של חברים לכל פרויקט/משימה. 2 variants: card / compact. מציג FTE עם over-allocation warning > 100%.",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 15 — Admin (6 tabs)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 15, "ניהול מערכת — 6 לשוניות", "Admin — 6 tabs");
  const tabs = [
    { name: "משתמשים", en: "Users", desc: "טבלה + Search + סינון + Add/Edit/Delete", color: C.primary },
    { name: "הרשאות", en: "Permissions", desc: "5 תפקידים × 12 הרשאות", color: C.indigo },
    { name: "סוגי פריטים", en: "Item Types", desc: "14 סוגים מובנים + צבע + emoji", color: C.purple },
    { name: "שיוך היררכי", en: "Hierarchy", desc: "העברת פרויקטים/משימות בין רמות", color: C.pink },
    { name: "טבלת הרשאות", en: "Permission Table", desc: "6 משתמשים × 12 הרשאות (X/12)", color: C.success },
    { name: "יומן פעילות", en: "Activity Log", desc: "40+ פעילויות + סטטיסטיקות + ציר זמן", color: C.warning },
  ];
  let i = 0;
  for (const t of tabs) {
    const x = 0.6 + (i % 3) * 4.15;
    const y = 1.9 + Math.floor(i / 3) * 2.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: 3.95, h: 2.3, fill: { color: C.offWhite }, line: { color: t.color, width: 1.5 }, rectRadius: 0.1,
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.12, h: 2.3, fill: { color: t.color }, line: { color: t.color, width: 0 },
    });
    s.addText(t.name, {
      x: x + 0.3, y: y + 0.2, w: 3.5, h: 0.5,
      fontSize: 16, color: t.color, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    s.addText(t.en, {
      x: x + 0.3, y: y + 0.65, w: 3.5, h: 0.35,
      fontSize: 11, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
    });
    s.addText(t.desc, {
      x: x + 0.3, y: y + 1.05, w: 3.5, h: 1.2,
      fontSize: 11, color: C.dark, fontFace: F.body, align: "right", margin: 0, valign: "top",
    });
    i++;
  }
  footer(s);
}

// ============================================================
// SLIDE 16 — RBAC
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 16, "RBAC דינמי — 5 תפקידים + מותאמים", "Dynamic RBAC — 5 roles + custom");
  const roles = [
    { name: "Admin", desc: "הכל + ניהול מערכת", color: C.danger },
    { name: "Manager", desc: "צופה + מעדכן + מקצה", color: C.primary },
    { name: "Member", desc: "משימות + יצירה", color: C.indigo },
    { name: "Viewer", desc: "קריאה בלבד", color: C.purple },
    { name: "Guest", desc: "תצוגה מוגבלת", color: C.muted },
  ];
  for (let i = 0; i < roles.length; i++) {
    const x = 0.6 + i * 2.5;
    const r = roles[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.9, w: 2.3, h: 1.5, fill: { color: r.color }, line: { color: r.color, width: 0 }, rectRadius: 0.1,
    });
    s.addText(r.name, {
      x, y: 2.0, w: 2.3, h: 0.6,
      fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    s.addText(r.desc, {
      x: x + 0.15, y: y_role(i), w: 2.0, h: 0.7,
      fontSize: 10, color: C.white, fontFace: F.body, align: "center", margin: 0,
    });
  }
  function y_role() { return 2.7; }
  section(s, 0.6, 3.7, 6, 1.7, "Role Switcher בסרגל",
    "כפתור תפקיד צבעוני + תפריט נפתח עם 6 משתמשים. החלפת תפקיד מיידית — תפריט הניווט, כפתורים ודפים משתנים מיד.",
    C.primary);
  section(s, 6.8, 3.7, 5.9, 1.7, "מטריצת 12 הרשאות",
    "כל תא toggle (חוץ מ-Admin). שמור/אפס אוטומטית. Badge \"שינויים לא שמורים\" כשיש שינויים.",
    C.indigo);
  section(s, 0.6, 5.5, 12.1, 1.5, "תפקיד מותאם",
    "דיאלוג עם שם בעברית+אנגלית, תבניות מוכנות (כמנהל/חבר/צופה), checkbox list ל-12 הרשאות. ניתן למחוק תפקידים מותאמים.",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 17 — Multi-language & RTL
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 17, "רב-לשוניות מלאה — 5 שפות + RTL", "Multi-language — 5 languages + RTL");
  const langs = [
    { flag: "🇮🇱", code: "he", name: "עברית", dir: "RTL" },
    { flag: "🇬🇧", code: "en", name: "English", dir: "LTR" },
    { flag: "🇷🇺", code: "ru", name: "Русский", dir: "LTR" },
    { flag: "🇫🇷", code: "fr", name: "Français", dir: "LTR" },
    { flag: "🇪🇸", code: "es", name: "Español", dir: "LTR" },
  ];
  for (let i = 0; i < langs.length; i++) {
    const x = 0.6 + i * 2.5;
    const l = langs[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.9, w: 2.3, h: 2.0, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, rectRadius: 0.15,
    });
    s.addText(l.flag, {
      x, y: 2.0, w: 2.3, h: 0.7,
      fontSize: 32, color: C.white, fontFace: F.header, align: "center", margin: 0,
    });
    s.addText(l.name, {
      x, y: 2.8, w: 2.3, h: 0.5,
      fontSize: 16, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    s.addText(l.dir, {
      x, y: 3.3, w: 2.3, h: 0.4,
      fontSize: 11, color: C.primaryLight, fontFace: F.body, align: "center", margin: 0,
    });
  }
  section(s, 0.6, 4.2, 6, 1.4, "txt(locale, {he,en,ru,fr,es})",
    "Helper מרכזי. 346 דפוסי isHe ב-18 קבצים הומרו ל-txt().",
    C.primary);
  section(s, 6.8, 4.2, 5.9, 1.4, "RTL מלא",
    "Logical properties: ms / me / ps / pe / start / end. הגאנט בנוי ידנית כדי לתמוך RTL.",
    C.purple);
  section(s, 0.6, 5.7, 12.1, 1.3, "Locale routing (next-intl)",
    "localePrefix: as-needed (עברית = /, אנגלית = /en). זיהוי שפה מטקסט: עברית/Cyrillic/Latin → locale → ברירת מחדל עברית.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 18 — Mobile & PWA
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 18, "מובייל ו-PWA", "Mobile & Progressive Web App");
  section(s, 0.6, 1.9, 6, 2.3, "תפריט נשלף (Sheet)",
    "Radix Sheet primitive. תפריט המבורגר ☰ במובייל. ניווט slide-in RTL. Topbar מצמיד hamburger button.",
    C.primary);
  section(s, 6.8, 1.9, 5.9, 2.3, "Touch targets",
    "כל כפתור min-h-[44px] min-w-[44px] לפי Apple HIG. inputs font-size: 16px למניעת zoom ב-iOS. onFocus scroll into view.",
    C.indigo);
  section(s, 0.6, 4.3, 6, 2.5, "PWA Manifest",
    "shem עברי. theme color Mapi blue. standalone mode. icons 192/512 PNG. apple-touch-icon.\n\nהתקנה: Chrome → Install app, Safari → Add to Home Screen.",
    C.purple);
  section(s, 6.8, 4.3, 5.9, 2.5, "Viewport ו-safe area",
    "viewportFit: cover\nenv(safe-area-inset-*)\n-webkit-text-size-adjust\ntouch-action: manipulation\n\nרגישות לפדינג של notch / camera punch.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 19 — Voice Assistant tech (Knowledge System) / Roadmap
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 19, "מערכת ידע + Roadmap", "Knowledge System & Roadmap");
  section(s, 0.6, 1.9, 6, 2.5, "Knowledge Base (42+ entries)",
    "11 קטגוריות: general, navigation, tasks, projects, gantt, wbs, risks, ai, assistant, team, admin, automations, settings, kpi.\n\n5 שיטות חיפוש במקביל + Gemini fallback grounded על app facts + live snapshot.",
    C.primary);
  section(s, 6.8, 1.9, 5.9, 2.5, "Help System",
    "• Welcome Tour 12 שלבים\n• Help Bot עם 2-tier (KB → Gemini)\n• Floating help button\n• User Guides — 7 מדריכים ב-5 שפות",
    C.indigo);
  section(s, 0.6, 4.5, 12.1, 2.5, "Roadmap הבא",
    "Q1 2026: Neon Postgres חיבור · Auth.js Google OAuth · Real-time updates (Supabase / Pusher)\nQ2 2026: AI Adoption analytics · Slack/Teams integrations · Mobile app native (React Native?)\nQ3 2026: Audit log auto-trigger · Webhooks for 3rd parties · Multi-tenancy\nQ4 2026: Voice command shortcuts · בילינג רב-לשוני · AI judgment of priorities",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 20 — Tech Stack + Database (REQUESTED FINAL SLIDE)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.primaryDark };
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.3, h: 0.15, fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  s.addText("20/20", {
    x: 0.4, y: 0.3, w: 0.8, h: 0.4, fontSize: 11, color: C.primaryLight, fontFace: F.body, align: "left", margin: 0,
  });
  s.addText("טכנולוגיות ובסיס נתונים", {
    x: 0.6, y: 0.4, w: 12.1, h: 0.7, fontSize: 30, color: C.white, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  s.addText("Technology Stack & Database Engine", {
    x: 0.6, y: 1.05, w: 12.1, h: 0.35, fontSize: 13, color: C.primaryLight, fontFace: F.body, italic: true, align: "right", margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 1.45, w: 12.1, h: 0.03, fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });

  // Frontend
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.8, w: 4.0, h: 2.5, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, rectRadius: 0.12,
  });
  s.addText("Frontend", {
    x: 0.6, y: 1.9, w: 4.0, h: 0.5, fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("• Next.js 15.5 App Router\n• React 19\n• TypeScript strict\n• Tailwind CSS 3\n• shadcn/ui (ידני)\n• Radix UI primitives\n• Recharts (גרפים)\n• dnd-kit (Kanban)", {
    x: 0.8, y: 2.45, w: 3.6, h: 1.8, fontSize: 12, color: C.white, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.3,
  });

  // Backend / API
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 4.8, y: 1.8, w: 4.0, h: 2.5, fill: { color: C.indigo }, line: { color: C.indigo, width: 0 }, rectRadius: 0.12,
  });
  s.addText("Backend / API", {
    x: 4.8, y: 1.9, w: 4.0, h: 0.5, fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("• Next.js API Routes\n• Node.js runtime\n• Server Components\n• next-intl (5 שפות)\n• CASL (RBAC)\n• Google Calendar webhook\n• Edge runtime ready", {
    x: 5.0, y: 2.45, w: 3.6, h: 1.8, fontSize: 12, color: C.white, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.3,
  });

  // AI
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 9.0, y: 1.8, w: 3.7, h: 2.5, fill: { color: C.purple }, line: { color: C.purple, width: 0 }, rectRadius: 0.12,
  });
  s.addText("AI Layer", {
    x: 9.0, y: 1.9, w: 3.7, h: 0.5, fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("• Google Gemini 2.5 Flash\n• Anthropic Claude (אופציונלי)\n• Heuristic intent parser\n• App facts + live snapshot\n• Knowledge base (42+ Q&A)\n• Web Speech API (STT)\n• Speech Synthesis (TTS)", {
    x: 9.2, y: 2.45, w: 3.3, h: 1.8, fontSize: 12, color: C.white, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.3,
  });

  // Database — emphasized box
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.5, w: 12.1, h: 2.4, fill: { color: C.accent }, line: { color: C.accent, width: 0 }, rectRadius: 0.15,
  });
  s.addText("Database Engine", {
    x: 0.6, y: 4.6, w: 12.1, h: 0.5, fontSize: 22, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  s.addText("Drizzle ORM — schema TypeScript-first, type-safe, Edge-compatible", {
    x: 0.6, y: 5.1, w: 12.1, h: 0.4, fontSize: 14, color: C.white, fontFace: F.body, bold: true, align: "center", margin: 0,
  });
  s.addText("• 18 טבלאות מוכנות ב-lib/db/schema.ts: portfolios, programs, projects, wbs_nodes, tasks, task_dependencies, users, project_members, comments, audit_log, attachments, automations, ai_usage, ai_recommendations, notifications, calendar_events, item_types, sessions", {
    x: 1.0, y: 5.55, w: 11.3, h: 0.7, fontSize: 11, color: C.white, fontFace: F.body, align: "right", margin: 0, lineSpacingMultiple: 1.3,
  });
  s.addText("ייצור: Neon Postgres / Supabase / Vercel Postgres — חיבור דרך drizzle() client | פיתוח: Mock data layer (lib/db/mock-data.ts) עם נתוני Salesforce אמיתיים מהאקסל", {
    x: 1.0, y: 6.25, w: 11.3, h: 0.55, fontSize: 11, color: C.white, fontFace: F.body, italic: true, align: "right", margin: 0,
  });

  // Footer
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 7.0, w: 13.3, h: 0.5, fill: { color: C.dark }, line: { color: C.dark, width: 0 },
  });
  s.addText("Hosting: Vercel · Source: GitHub · CI/CD: auto deploy on push to main", {
    x: 0.6, y: 7.1, w: 12.1, h: 0.35, fontSize: 11, color: C.white, fontFace: F.body, align: "center", margin: 0,
  });
}

// ============================================================
// Save
// ============================================================
const outPath = path.join(__dirname, "..", "PMO-Plus-Plus-Comprehensive-Presentation.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log(`✓ Wrote: ${outPath}`);
  const stats = fs.statSync(outPath);
  console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB · 20 slides`);
});
