/**
 * Generate PMO++ presentation v5 — RTL layout polish.
 *
 * Major change vs v4: every horizontal layout follows Hebrew reading order
 * (right→left). Primary / first / most-important element sits on the RIGHT.
 *
 * Concrete flips:
 *  - Page number "n/20" moves to top-RIGHT (where Hebrew readers start)
 *  - All 2-column and 2×2 grids: first item on the right
 *  - Slide 8 hero: PMO++ on the right, Google Calendar on the left
 *  - Slide 13 automations flow: Trigger → Conditions → Actions reads right→left
 *  - Slide 16 RBAC matrix: Admin column on the right (highest privilege first)
 *  - Slide 18: 5 language cards in RTL order (he first on right)
 *  - Slide 20 tech stack: Frontend on the right (it's the primary tier)
 *
 * Run: node scripts/generate-presentation-v5.js
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 × 7.5
pres.author = "PMO++";
pres.title = "PMO++ — פלטפורמת ניהול פרויקטים פנים-ארגונית";
pres.company = "המרכז למיפוי ישראל";
pres.rtlMode = true;

const C = {
  primary: "1E5FA8", primaryDark: "0D3A72", primaryLight: "CADCFC",
  accent: "F59E0B", success: "10B981", danger: "EF4444", warning: "F97316",
  purple: "7C3AED", pink: "EC4899", indigo: "4F46E5", teal: "0D9488", cyan: "06B6D4",
  white: "FFFFFF", offWhite: "F8FAFC", light: "F1F5F9", lightGray: "E2E8F0",
  muted: "64748B", dark: "0F172A",
};
const F = { header: "Arial Black", body: "Calibri" };
const TOTAL = 20;
const SLIDE_W = 13.3;

// ============================================================
// Helpers — Hebrew typography + RTL positioning
// ============================================================
const LRM = "‎", LRI = "⁦", PDI = "⁩";

function hasHebrew(s) { return typeof s === "string" && /[֐-׿]/.test(s); }

function heb(text) {
  if (typeof text !== "string") return text;
  let t = text;
  t = t.replace(/([֐-׿])"([֐-׿])/g, "$1״$2");
  t = t.replace(/([֐-׿])'/g, "$1׳");
  t = t.replace(/\(([^()֐-׿]*[A-Za-z0-9][^()֐-׿]*)\)/g, LRI + "($1)" + PDI);
  t = t.replace(/([A-Za-z][A-Za-z0-9.+_/\-]*)/g, (m, _g, offset, full) => {
    if (offset > 0 && (full[offset - 1] === LRI || full[offset - 1] === LRM)) return m;
    return LRM + m + LRM;
  });
  return t;
}

function addTxt(slide, text, opts) {
  const isHe = Array.isArray(text)
    ? text.some((t) => hasHebrew(typeof t === "string" ? t : t.text))
    : hasHebrew(text);
  const finalOpts = { ...opts };
  if (isHe) { finalOpts.rtlMode = true; finalOpts.lang = "he-IL"; }
  let finalText;
  if (Array.isArray(text)) {
    finalText = text.map((item) => typeof item === "string" ? heb(item) : { ...item, text: heb(item.text) });
  } else {
    finalText = isHe ? heb(text) : text;
  }
  slide.addText(finalText, finalOpts);
}

// Flip a left-anchored X coordinate to a right-anchored one of the same width
function rx(x, w) { return SLIDE_W - x - w; }

function header(slide, num, titleHe, titleEn) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.3, h: 0.15,
    fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  // Page number on the LEFT (corner opposite the title) — natural for RTL slides
  addTxt(slide, `${num}/${TOTAL}`, {
    x: 0.4, y: 0.3, w: 0.8, h: 0.4,
    fontSize: 11, color: C.muted, fontFace: F.body, align: "left", margin: 0,
  });
  addTxt(slide, titleHe, {
    x: 0.6, y: 0.4, w: 12.1, h: 0.7,
    fontSize: 30, color: C.primaryDark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  // English subtitle stays LTR but is anchored RIGHT (under the Hebrew title)
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
  addTxt(slide, "PMO++ · המרכז למיפוי ישראל · 2026", {
    x: 0.6, y: 7.0, w: 12, h: 0.3,
    fontSize: 9, color: C.muted, fontFace: F.body, align: "right", margin: 0,
  });
}

function statBox(slide, x, y, w, h, value, label, color = C.primary) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1,
  });
  addTxt(slide, String(value), {
    x, y: y + 0.1, w, h: h * 0.55, fontSize: 28, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  addTxt(slide, label, {
    x, y: y + h * 0.55 + 0.1, w, h: h * 0.35, fontSize: 11, color: C.white, fontFace: F.body, align: "center", margin: 0,
  });
}

function section(slide, x, y, w, h, title, body, accent = C.primary) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: C.offWhite }, line: { color: accent, width: 1.5 }, rectRadius: 0.08,
  });
  // Accent strip on the RIGHT (RTL: starts at the reading edge)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + w - 0.12, y, w: 0.12, h, fill: { color: accent }, line: { color: accent, width: 0 },
  });
  addTxt(slide, title, {
    x: x + 0.15, y: y + 0.1, w: w - 0.4, h: 0.4,
    fontSize: 14, color: accent, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  addTxt(slide, body, {
    x: x + 0.15, y: y + 0.55, w: w - 0.4, h: h - 0.65,
    fontSize: 11, color: C.dark, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.2,
  });
}

function bullet(slide, x, y, w, h, items, color = C.dark) {
  const formatted = items.map((t) => ({
    text: heb(t), options: { bullet: { code: "25CF" }, breakLine: true },
  }));
  slide.addText(formatted, {
    x, y, w, h, fontSize: 14, color, fontFace: F.body, align: "right", margin: 0,
    lineSpacingMultiple: 1.3, rtlMode: true, lang: "he-IL",
  });
}

// ============================================================
// SLIDE 1 — Title
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.primaryDark };
  s.addShape(pres.shapes.OVAL, { x: -2, y: -2, w: 6, h: 6, fill: { color: C.primary, transparency: 70 }, line: { color: C.primary, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 9, y: 4, w: 6, h: 6, fill: { color: C.purple, transparency: 80 }, line: { color: C.purple, width: 0 } });
  s.addText("PMO++", { x: 0.6, y: 1.8, w: 12.1, h: 1.6, fontSize: 96, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  addTxt(s, "פלטפורמת ניהול פרויקטים פנים-ארגונית", { x: 0.6, y: 3.5, w: 12.1, h: 0.7, fontSize: 28, color: C.primaryLight, fontFace: F.header, bold: true, align: "center", margin: 0 });
  addTxt(s, "המרכז למיפוי ישראל", { x: 0.6, y: 4.3, w: 12.1, h: 0.55, fontSize: 24, color: C.accent, fontFace: F.header, bold: true, align: "center", margin: 0 });
  s.addText("Internal Project Management Platform · Israel Mapping Center", { x: 0.6, y: 4.95, w: 12.1, h: 0.4, fontSize: 14, color: C.primaryLight, fontFace: F.body, italic: true, align: "center", margin: 0 });
  addTxt(s, "מצגת מקיפה · 20 פרקים · גרסה 5 · 2026", { x: 0.6, y: 6.4, w: 12.1, h: 0.4, fontSize: 14, color: C.primaryLight, fontFace: F.body, align: "center", margin: 0 });
}

// ============================================================
// SLIDE 2 — Architecture (centered, no flip needed)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 2, "ארכיטקטורה: היררכיה משש רמות", "Architecture — 6-tier hierarchy");
  const levels = [
    { name: "פורטפוליו", en: "Portfolio", color: C.primaryDark, y: 1.8, w: 12 },
    { name: "תוכנית", en: "Program", color: C.primary, y: 2.7, w: 10 },
    { name: "פרויקט", en: "Project", color: C.indigo, y: 3.6, w: 8 },
    { name: "WBS — חבילות עבודה", en: "Work Breakdown Structure", color: C.purple, y: 4.5, w: 6 },
    { name: "משימה", en: "Task", color: C.success, y: 5.4, w: 4 },
    { name: "תת-משימה", en: "Subtask", color: C.warning, y: 6.3, w: 2.5 },
  ];
  for (const lvl of levels) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: (13.3 - lvl.w) / 2, y: lvl.y, w: lvl.w, h: 0.75, fill: { color: lvl.color }, line: { color: lvl.color, width: 0 }, rectRadius: 0.1 });
    // Hebrew first (right), English after (left) in RTL flow
    addTxt(s, `${lvl.name} · ${lvl.en}`, { x: (13.3 - lvl.w) / 2, y: lvl.y, w: lvl.w, h: 0.75, fontSize: 14, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0 });
  }
  footer(s);
}

// ============================================================
// SLIDE 3 — My Tasks (2×2 grid; primary "מטרה" must be top-RIGHT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 3, "המשימות שלי — דף הבית", "My Tasks — Landing page");
  // Top-RIGHT (read first): מטרה
  section(s, 6.7, 1.8, 6, 2.5, "מטרה",
    "תצוגה אישית של כל המשימות הפתוחות של המשתמש, ממוינות לפי דחיפות. נקודת ההתחלה של כל יום עבודה.\n\nמסך הבית מציג את ה\"מה צריך לעשות עכשיו\" באופן ברור, ללא צורך לחפש בין כמה מסכים.",
    C.primary);
  // Top-LEFT (read second)
  section(s, 0.6, 1.8, 5.9, 2.5, "7 לשוניות סינון",
    "• הכל\n• בביצוע\n• לא התחילו\n• בבדיקה\n• חסומות\n• באיחור\n• לפי פרויקט",
    C.purple);
  // Bottom-RIGHT (read third)
  section(s, 6.7, 4.5, 6, 2.4, "כל משימה מציגה",
    "• כותרת + תיאור\n• שם הפרויקט (קישור)\n• תאריך יעד + זמן נותר דינמי\n• עדיפות (badge צבעוני)\n• כפתורי פעולה: סגירה, שיוך מחדש",
    C.indigo);
  // Bottom-LEFT (read fourth)
  section(s, 0.6, 4.5, 5.9, 2.4, "סייד-פאנל הפרויקטים",
    "• הפרויקטים שלי + תפקיד\n• אחוז משרה (FTE) לכל פרויקט\n• סך FTE עם אזהרת הקצאת יתר (מעל 100%)\n• כפתור + להוספת משימה חדשה",
    C.teal);
  footer(s);
}

// ============================================================
// SLIDE 4 — Dashboards & KPI (stat boxes + 2 columns; PM section first on right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 4, "דשבורדים ו-KPI — 17 מדדים אינטראקטיביים", "Dashboards & KPI — 17 interactive metrics");
  // Stats: 17 (primary) on right
  statBox(s, 10.0, 1.8, 2.7, 1.3, "17", "מדדי KPI", C.primary);
  statBox(s, 7.1,  1.8, 2.7, 1.3, "PM · PMO", "בורר תפקיד", C.indigo);
  statBox(s, 4.2,  1.8, 2.7, 1.3, "EVM", "CPI · SPI", C.purple);
  statBox(s, 0.6,  1.8, 3.4, 1.3, "RAG", "בקרה למנהלים", C.success);
  // PM (mentioned first) on the right
  section(s, 6.7, 3.3, 6.0, 1.7, "מנהל פרויקט (PM) — תפעולי",
    "Schedule Variance · Milestone Slippage · Throughput שבועי · Budget Adherence · CPI · SPI · Rework Rate",
    C.primary);
  section(s, 0.6, 3.3, 5.9, 1.7, "מנהל PMO — אסטרטגי",
    "Strategic Alignment · ROI · Capacity vs Demand · Risk Trend · Decision Latency · NPS · Burnout · AI Adoption",
    C.purple);
  section(s, 0.6, 5.2, 12.1, 1.8, "מקורות + אינטראקטיביות",
    "כל כרטיס לחיץ — בועת מידע מפורטת עם הסבר, נוסחה, מקור וגרף לדוגמה. מבוסס תקני PMBOK, EVM, McKinsey, Bain, MBI ו-Gartner. שני דשבורדים מובחנים ויזואלית (כחול PM / סגול PMO).",
    C.accent);
  footer(s);
}

// ============================================================
// SLIDE 5 — Gantt (bullet list moved to RIGHT, sections to LEFT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 5, "לוח גאנט מתקדם", "Advanced Gantt with CPM");
  // Bullets on the RIGHT
  bullet(s, 6.7, 1.9, 6.0, 4.5, [
    "טבלת WBS מימין + תרשים גאנט משמאל עם sync scroll",
    "תכנון מול ביצוע — שני פסים מקבילים לכל משימה",
    "נתיב קריטי (CPM) — אלגוריתם Kahn, תאורה אדומה",
    "אבני דרך (milestones) — יהלום סגול עם דגל",
    "חוצץ זמן (buffer) אופציונלי — מלבן מקווקו",
    "Today line — נקודה כתומה במיקום הנוכחי",
    "קידוד צבעים אוטומטי לפי בריאות (ירוק/צהוב/אדום)",
    "Roll-up bars — פסי אב להראות summary",
    "פופאפ לחיצה: סטטוס, תלויות, אחראי, התקדמות",
    "RTL מלא — ציר LTR פנימי לתאריכים",
  ], C.dark);
  section(s, 0.6, 1.9, 5.7, 2.1, "ייצוא",
    "• Excel (CSV עם BOM ל-UTF-8 ותאימות עברית)\n• PDF (window.print + print stylesheet)\n• הסתרת sidebar/topbar אוטומטית בהדפסה",
    C.success);
  section(s, 0.6, 4.2, 5.7, 2.2, "מובייל",
    "• רוחב טבלה רספונסיבי (200px → 520px)\n• 4 עמודות מוסתרות במובייל\n• פופאפ ממורכז על המסך\n• כפתור min-h-[44px] לטאצ'",
    C.warning);
  footer(s);
}

// ============================================================
// SLIDE 6 — WBS (no horizontal flip needed — symmetric)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 6, "WBS — Work Breakdown Structure", "Hierarchical tree with weighted roll-up");
  section(s, 0.6, 1.8, 12.1, 1.4, "עץ היררכי רקורסיבי",
    "אגרגציה מ-leaf nodes למעלה דרך כל ההיררכיה: שעות מתוכננות/בפועל, אחוז התקדמות משוקלל לפי שעות, תאריכים מינימלי/מקסימלי, עלויות (תעריף שעתי × שעות), וספירת משימות (total/done/blocked/overdue).",
    C.primary);
  // RIGHT first: מספור אוטומטי
  section(s, 6.7, 3.3, 6.0, 1.7, "מספור אוטומטי", "Depth-first traversal:\n1 → 1.1 → 1.1.1 → 1.2 → 2 → 2.1 ...", C.indigo);
  section(s, 0.6, 3.3, 5.9, 1.7, "Roll-up משוקלל", "אחוז התקדמות = Σ(progress × hours) / Σ(hours).\nלא ממוצע פשוט — שווה לפי גודל המשימה.", C.purple);
  section(s, 0.6, 5.1, 12.1, 1.9, "Roll-up bars בגאנט",
    "פסי אב מציגים summary של ה-node כולו: תאריך מינימלי של leaf, תאריך מקסימלי של leaf וממוצע התקדמות משוקלל. לחיצה על node פותחת פופאפ עם משימות / הושלמו / חסומות / באיחור / שעות / תוצר.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 7 — Projects (2×2; List first on top-right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 7, "פרויקטים — 4 תצוגות", "Projects — 4 views per project");
  const views = [
    { name: "רשימה", en: "List", desc: "טבלה עם sortable columns: שם, אחראי, סטטוס, תאריך, התקדמות ועדיפות.", color: C.primary },
    { name: "קנבן", en: "Kanban", desc: "4 עמודות: Not Started / In Progress / Review / Done. גרירה ושחרור עם @dnd-kit.", color: C.indigo },
    { name: "גאנט", en: "Gantt", desc: "AdvancedGantt עם נתיב קריטי, אבני דרך, חוצץ זמן וייצוא ל-Excel/PDF.", color: C.purple },
    { name: "יומן", en: "Calendar", desc: "Calendar grid month view עם משימות צבעוניות לפי עדיפות.", color: C.success },
  ];
  // Position by reading order: 0=top-right, 1=top-left, 2=bot-right, 3=bot-left
  const positions = [
    { x: 6.7, y: 1.8 }, // top-right (first)
    { x: 0.6, y: 1.8 }, // top-left
    { x: 6.7, y: 4.4 }, // bot-right
    { x: 0.6, y: 4.4 }, // bot-left
  ];
  for (let i = 0; i < views.length; i++) {
    section(s, positions[i].x, positions[i].y, 6.0, 2.5, `${views[i].name} · ${views[i].en}`, views[i].desc, views[i].color);
  }
  footer(s);
}

// ============================================================
// SLIDE 8 — Google Calendar (HERO REVERSED: PMO++ on RIGHT, Google on LEFT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 8, "אינטגרציה מלאה עם Google Calendar", "Bidirectional Google Calendar Sync");

  // PMO++ on the RIGHT (the "local" / "our" system)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.3, y: 1.8, w: 5.4, h: 1.4, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, rectRadius: 0.15 });
  s.addText("PMO++", { x: 7.3, y: 1.85, w: 5.4, h: 0.55, fontSize: 24, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  addTxt(s, "משימות · אבני דרך · פגישות", { x: 7.3, y: 2.5, w: 5.4, h: 0.45, fontSize: 13, color: C.primaryLight, fontFace: F.body, align: "center", margin: 0 });

  s.addText("⇄", { x: 6.0, y: 1.95, w: 1.3, h: 1.1, fontSize: 60, color: C.accent, fontFace: F.header, bold: true, align: "center", margin: 0 });
  s.addText("Two-way", { x: 6.0, y: 2.85, w: 1.3, h: 0.35, fontSize: 10, color: C.muted, fontFace: F.body, italic: true, align: "center", margin: 0 });

  // Google Calendar on the LEFT
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.8, w: 5.4, h: 1.4, fill: { color: C.success }, line: { color: C.success, width: 0 }, rectRadius: 0.15 });
  s.addText("Google Calendar", { x: 0.6, y: 1.85, w: 5.4, h: 0.55, fontSize: 24, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  s.addText("Events · Reminders · Attendees", { x: 0.6, y: 2.5, w: 5.4, h: 0.45, fontSize: 13, color: C.white, fontFace: F.body, align: "center", margin: 0 });

  // 4 sections — Push (primary, from PMO) on right
  section(s, 6.7, 3.4, 6.0, 1.7, "Push: PMO++ ⟵ Google", "כל משימה חדשה או עדכון סטטוס יוצרים אוטומטית אירוע ביומן של האחראי. שינוי תאריך — עדכון האירוע.", C.primary);
  section(s, 0.6, 3.4, 5.9, 1.7, "Pull: Google ⟵ PMO++", "Webhook ב-/api/webhooks/google-calendar קולט push notifications. אירועים מסומנים כפגישות ביומן הפרויקט.", C.success);
  section(s, 6.7, 5.2, 6.0, 1.8, "OAuth 2.0", "התחברות Google רגילה. ה-scope הוא calendar.events. ה-token נשמר ב-DB מוצפן. רענון אוטומטי.", C.indigo);
  section(s, 0.6, 5.2, 5.9, 1.8, "7 אירועי דמו מסונכרנים", "דדליין פרסום הבריף · ועדת בחינת הצעות · בדיקות UAT · בחירת ספק זוכה · סקירת תחזוקה רבעונית · חוזה סופי.", C.purple);
  footer(s);
}

// ============================================================
// SLIDE 9 — Risk Management (5 boxes: Blocked first = rightmost)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 9, "ניהול סיכונים פרואקטיבי", "Proactive Risk Management");
  const risks = [
    { name: "Blocked", desc: "משימה חסומה בהמתנה ל-dependency", color: C.danger },
    { name: "Overdue", desc: "עברה את plannedEnd ולא הושלמה", color: C.warning },
    { name: "Effort Overrun", desc: "actualHours גדול מ-estimateHours × 1.5", color: C.purple },
    { name: "Schedule Slip", desc: "פיגור גדל בשבועיים רצופים", color: C.accent },
    { name: "Critical Not Started", desc: "משימה קריטית שלא התחילה תוך 5 ימים", color: C.pink },
  ];
  // RTL: Blocked on the right (rightmost = first)
  for (let i = 0; i < risks.length; i++) {
    const x = 10.4 - i * 2.5; // rightmost slot first
    const r = risks[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 2.3, h: 1.5, fill: { color: r.color }, line: { color: r.color, width: 0 }, rectRadius: 0.1 });
    s.addText(r.name, { x, y: 2.0, w: 2.3, h: 0.5, fontSize: 14, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
    addTxt(s, r.desc, { x: x + 0.15, y: 2.7, w: 2.0, h: 0.7, fontSize: 9, color: C.white, fontFace: F.body, align: "center", margin: 0 });
  }
  // חיזוי (forecast) — first concept, on the right
  section(s, 6.7, 3.7, 6.0, 1.5, "חיזוי", "Velocity actual מול required + ממוצע סליפ — forecast end date.", C.primary);
  section(s, 0.6, 3.7, 5.9, 1.5, "אפקט שרשרת", "BFS על גרף תלויות — מספר משימות מושפעות, מתוכן בנתיב קריטי, וימי cascade.", C.purple);
  section(s, 0.6, 5.3, 12.1, 1.7, "תכנית גידור",
    "4 קטגוריות פעולה: Resource / Schedule / Scope / Process / Escalation. שיוך מחדש חכם: skill match (40%) + availability (35%) + performance (25%).",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 10 — AI Center (Sidekick = primary, on the right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 10, "מרכז AI — Sidekick + תכנית גידור", "AI Center — Sidekick + Mitigation Plan");
  section(s, 6.7, 1.8, 6.0, 5.1, "AI Sidekick (Chat)",
    "צ'אט מבוסס Google Gemini 2.5 Flash.\n\nContext מלא לפי תפקיד המשתמש:\n• Mock data של הארגון\n• Live snapshot (משימות, FTE, סיכונים)\n• App facts (15 דפים, 17 KPIs)\n• Knowledge base 42+ Q&A\n\nReply guidelines:\n• Lead with conclusion\n• Use numbers\n• Give action\n\n5 שפות מלאות: he/en/ru/fr/es",
    C.primary);
  section(s, 0.6, 1.8, 5.9, 5.1, "תכנית גידור (Mitigation Plan)",
    "Header gradient + 2 stats:\n• סך פעולות\n• פעולות מיידיות\n\nSmart Reassignment:\n• Match score 0-100\n• אבטרים From/To + חץ\n• Reasoning כ-badges\n\nMitigation Strategies:\n• Severity + risk type\n• Preferred action ⭐\n• Apply button\n\nEarly Warnings — אזהרות אמבר",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 11 — Voice Assistant (STT first on right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 11, "עוזר אישי קולי", "Voice Personal Assistant");
  section(s, 6.7, 1.8, 6.0, 2.4, "STT — דיבור לטקסט",
    "ארכיטקטורה דו-מצבית:\n• Web Speech API (Chrome / Edge)\n• MediaRecorder fallback (iOS Safari / Firefox)\n• Interim results בזמן אמת",
    C.primary);
  section(s, 0.6, 1.8, 5.9, 2.4, "TTS — טקסט לדיבור",
    "5 שפות עם בחירת קול אוטומטית.\nרייטינג איכות: Google / Neural > Microsoft Online > Apple > local.\nKeep-alive ping (Chrome 15s cutoff fix).",
    C.purple);
  section(s, 6.7, 4.3, 6.0, 2.6, "הגיית קיצורים נכונה",
    "לו\"ז → לוז (luz)\nמנכ\"ל → מנכל\nסמנכ\"ל → סמנכל\nצה\"ל → צהל\nת\"א → תל אביב\nוכו' → וכולי\n+ Smart quotes ו-Hebrew gershayim ׳ ״",
    C.success);
  section(s, 0.6, 4.3, 5.9, 2.6, "מקטעי 350 תווים",
    "הסרת תקרת 500 התווים הישנה.\nכל תשובה נחתכת בגבול משפט (. ! ?) ומוקראת ברצף.\nSPEAK_TOKEN — לחיצה על מיקרופון מבטלת כל מקטע בתור.\nמצב שיחה: האזנה אוטומטית אחרי תשובה.",
    C.indigo);
  footer(s);
}

// ============================================================
// SLIDE 12 — Reports & Export (PDF first on right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 12, "דוחות וייצוא", "Reports & Export");
  section(s, 6.7, 1.8, 6.0, 2.5, "ייצוא PDF",
    "ExportPdfButton — window.print() עם print stylesheet מותאם.\n\n• הסתרת sidebar / topbar / כפתורים צפים\n• @page { size: A4 landscape }\n• print-color-adjust: exact\n• Toast notifications (מכין → מוכן)",
    C.primary);
  section(s, 0.6, 1.8, 5.9, 2.5, "ייצוא Excel/CSV",
    "lib/gantt/export.ts:\n\n• CSV עם BOM (\\uFEFF) ל-UTF-8\n• תאימות עברית מלאה ב-Excel\n• אחת הדרכים היחידות שעובדות עם RTL",
    C.success);
  section(s, 0.6, 4.5, 12.1, 2.5, "מבני דוחות",
    "• Gantt full-width (טבלת WBS + תרשים)\n• דשבורד KPI עם בורר תפקיד\n• רשימת משימות עם פילטרים\n• כרטיסי פרויקטים עם health score\n• רשימת סיכונים + matrix\n• יומן פעילות (Activity Log) של משתמשים",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 13 — Automations (FLOW REVERSED: Trigger right → Actions left)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 13, "אוטומציות — בנאי No-Code", "Automations — No-Code Builder");
  const flow = [
    { label: "Trigger", count: "8", desc: "סוגי טריגרים", color: C.primary },
    { label: "Conditions", count: "4", desc: "תנאים אופציונליים", color: C.indigo },
    { label: "Actions", count: "8", desc: "פעולות (מהן 2 פעולות AI)", color: C.purple },
  ];
  // Place Trigger on the RIGHT (start of flow in Hebrew reading order)
  for (let i = 0; i < flow.length; i++) {
    const x = 8.8 - i * 4.2; // rightmost = first
    const f = flow[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 3.9, h: 1.8, fill: { color: f.color }, line: { color: f.color, width: 0 }, rectRadius: 0.15 });
    s.addText(f.label, { x, y: 2.0, w: 3.9, h: 0.6, fontSize: 20, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
    s.addText(f.count, { x, y: 2.6, w: 3.9, h: 0.7, fontSize: 36, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
    addTxt(s, f.desc, { x, y: 3.25, w: 3.9, h: 0.4, fontSize: 11, color: C.white, fontFace: F.body, align: "center", margin: 0 });
    if (i < flow.length - 1) {
      // Arrow pointing LEFT (next step is to the left)
      s.addText("←", { x: x - 0.35, y: 2.4, w: 0.3, h: 0.8, fontSize: 28, color: C.muted, fontFace: F.header, bold: true, align: "center", margin: 0 });
    }
  }
  section(s, 0.6, 4.0, 12.1, 1.4, "5 תבניות מוכנות",
    "Task Reminder · Overdue Alert · New Risk Notification · Daily Report · Weekly Summary",
    C.success);
  section(s, 0.6, 5.5, 12.1, 1.5, "אופן הבנייה",
    "3 שלבים ויזואליים: Trigger ← Conditions ← Actions. כרטיס סיכום סגול עם ולידציה ו-toast. אינטגרציה עם 2 פעולות AI (summarize, recommend).",
    C.purple);
  footer(s);
}

// ============================================================
// SLIDE 14 — Team & Email (stats+form on RIGHT, email mockup on LEFT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 14, "צוות והזמנות מייל", "Team & Email Invitations");

  // Stat boxes (intro) on the RIGHT
  statBox(s, 10.0, 1.8, 2.7, 1.2, "6", "חברי צוות", C.primary);
  statBox(s, 7.1,  1.8, 2.7, 1.2, "5", "תפקידים", C.indigo);

  // Email mockup on the LEFT (the "demo" output)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.7, w: 6.3, h: 3.5, fill: { color: C.offWhite }, line: { color: C.danger, width: 2 }, rectRadius: 0.15 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 1.7, w: 6.3, h: 0.55, fill: { color: C.danger }, line: { color: C.danger, width: 0 } });
  addTxt(s, "📧 מייל הזמנה (Demo)", { x: 0.6, y: 1.75, w: 6.3, h: 0.45, fontSize: 13, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  s.addText("From: noreply@mapi.gov.il\nTo: new.user@example.com\nSubject: הזמנה ל-PMO++ של המרכז למיפוי", { x: 0.8, y: 2.35, w: 6.0, h: 0.85, fontSize: 10, color: C.muted, fontFace: "Courier New", align: "right", margin: 0, rtlMode: true, lang: "he-IL" });
  addTxt(s, "שלום,\nהוזמנת להצטרף ל-PMO++ של המרכז למיפוי ישראל.\n\nתפקיד: מנהל פרויקט\nחטיבה: IT · אגף: יישומים", { x: 0.8, y: 3.2, w: 6.0, h: 1.05, fontSize: 11, color: C.dark, fontFace: F.body, align: "right", margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.6, y: 4.35, w: 2.3, h: 0.5, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, rectRadius: 0.08 });
  addTxt(s, "⚡ אישור הזמנה", { x: 2.6, y: 4.35, w: 2.3, h: 0.5, fontSize: 11, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0 });

  // Form (under stats) on the RIGHT
  section(s, 7.1, 3.1, 5.6, 2.1, "טופס הזמנת חבר",
    "InviteMemberDialog:\n• שם מלא (חובה)\n• תפקיד (10 אופציות)\n• חטיבה (8 אופציות)\n• אגף (8 אופציות)\n• טלפון (חובה)\n• מייל (חובה)\n+ אפשרות \"אחר…\" לכל dropdown",
    C.primary);
  section(s, 0.6, 5.3, 12.1, 1.7, "תוכן המייל ושליחה",
    "המייל נשלח אוטומטית עם שם המזמין, תפקיד מותאם וקישור הצטרפות חתום. במצב הדגמה הנוכחי — Toast מציין שהמייל היה נשלח. בייצור: SendGrid / SMTP דרך Vercel Functions עם תבנית HTML מותאמת + תרגום ל-5 שפות.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 15 — Admin (6 tabs in 3×2 grid; משתמשים first on top-right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 15, "ניהול מערכת — 6 לשוניות", "Admin — 6 tabs");
  const tabs = [
    { name: "משתמשים",  en: "Users",            desc: "טבלה + חיפוש + סינון + הוספה/עריכה/מחיקה", color: C.primary },
    { name: "הרשאות",    en: "Permissions",      desc: "5 תפקידים × 12 הרשאות",                 color: C.indigo },
    { name: "סוגי פריטים", en: "Item Types",     desc: "14 סוגים מובנים + צבע + emoji",         color: C.purple },
    { name: "שיוך היררכי", en: "Hierarchy",      desc: "העברת פרויקטים/משימות בין רמות",        color: C.pink },
    { name: "טבלת הרשאות", en: "Permission Table", desc: "6 משתמשים × 12 הרשאות (X מתוך 12)",   color: C.success },
    { name: "יומן פעילות", en: "Activity Log",    desc: "40+ פעילויות + סטטיסטיקות + ציר זמן",  color: C.warning },
  ];
  // RTL grid: index 0 is top-right
  const positions = [
    { col: 0, row: 0 }, // top-right
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: 0, row: 1 }, // bottom-right
    { col: 1, row: 1 },
    { col: 2, row: 1 },
  ];
  for (let i = 0; i < tabs.length; i++) {
    const t = tabs[i];
    const pos = positions[i];
    // col 0 = rightmost
    const x = 8.75 - pos.col * 4.15;
    const y = 1.9 + pos.row * 2.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.95, h: 2.3, fill: { color: C.offWhite }, line: { color: t.color, width: 1.5 }, rectRadius: 0.1 });
    // Accent strip on the right
    s.addShape(pres.shapes.RECTANGLE, { x: x + 3.83, y, w: 0.12, h: 2.3, fill: { color: t.color }, line: { color: t.color, width: 0 } });
    addTxt(s, t.name, { x: x + 0.15, y: y + 0.2, w: 3.5, h: 0.5, fontSize: 16, color: t.color, fontFace: F.header, bold: true, align: "right", margin: 0 });
    s.addText(t.en, { x: x + 0.15, y: y + 0.65, w: 3.5, h: 0.35, fontSize: 11, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0 });
    addTxt(s, t.desc, { x: x + 0.15, y: y + 1.05, w: 3.5, h: 1.2, fontSize: 11, color: C.dark, fontFace: F.body, align: "right", margin: 0, valign: "top" });
  }
  footer(s);
}

// ============================================================
// SLIDE 16 — RBAC matrix (Admin column on RIGHT, Guest on LEFT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 16, "RBAC: נראות שונה לפי תפקיד", "Role-Based Visibility Matrix");

  // Roles & their column index from RIGHT — Admin is column 0 (rightmost)
  const roles =       ["Admin",  "Manager", "Member", "Viewer", "Guest"];
  const roleColors = [C.danger, C.primary, C.indigo, C.purple, C.muted];
  const permissions = [
    { he: "צפייה כללית",   v: [1, 1, 1, 1, 0] },
    { he: "יצירת משימה",   v: [1, 1, 1, 0, 0] },
    { he: "עריכת משימה",   v: [1, 1, 1, 0, 0] },
    { he: "מחיקת משימה",   v: [1, 1, 0, 0, 0] },
    { he: "יצירת פרויקט",  v: [1, 1, 0, 0, 0] },
    { he: "מחיקת פרויקט",  v: [1, 0, 0, 0, 0] },
    { he: "ניהול צוות",     v: [1, 0, 0, 0, 0] },
    { he: "ניהול תפקידים", v: [1, 0, 0, 0, 0] },
    { he: "הגדרות מערכת",  v: [1, 0, 0, 0, 0] },
    { he: "צפייה בדוחות", v: [1, 1, 1, 1, 0] },
    { he: "אוטומציות",     v: [1, 1, 0, 0, 0] },
    { he: "גישה ל-AI",     v: [1, 1, 1, 0, 0] },
  ];

  const tableX = 0.6, tableY = 1.8, tableW = 12.1;
  const labelW = 3.5;
  const cellW = (tableW - labelW) / 5;
  const rowH = 0.36, headerH = 0.55;

  // Hebrew label column on the RIGHT
  const labelX = tableX + tableW - labelW;
  s.addShape(pres.shapes.RECTANGLE, { x: labelX, y: tableY, w: labelW, h: headerH, fill: { color: C.primaryDark }, line: { color: C.primaryDark, width: 0 } });
  addTxt(s, "הרשאה", { x: labelX + 0.1, y: tableY, w: labelW - 0.2, h: headerH, fontSize: 11, color: C.white, fontFace: F.header, bold: true, align: "right", valign: "middle", margin: 0 });

  // Role columns: Admin (i=0) goes to the slot just LEFT of the label column
  for (let i = 0; i < roles.length; i++) {
    const x = labelX - (i + 1) * cellW;
    s.addShape(pres.shapes.RECTANGLE, { x, y: tableY, w: cellW, h: headerH, fill: { color: roleColors[i] }, line: { color: C.white, width: 1 } });
    s.addText(roles[i], { x, y: tableY, w: cellW, h: headerH, fontSize: 12, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0 });
  }

  // Body rows
  for (let r = 0; r < permissions.length; r++) {
    const y = tableY + headerH + r * rowH;
    const rowBg = r % 2 === 0 ? C.white : C.offWhite;
    // Label cell on the right
    s.addShape(pres.shapes.RECTANGLE, { x: labelX, y, w: labelW, h: rowH, fill: { color: rowBg }, line: { color: C.lightGray, width: 0.5 } });
    addTxt(s, permissions[r].he, { x: labelX + 0.15, y, w: labelW - 0.25, h: rowH, fontSize: 10, color: C.dark, fontFace: F.body, align: "right", valign: "middle", margin: 0 });
    for (let c = 0; c < 5; c++) {
      const x = labelX - (c + 1) * cellW;
      const hasPerm = permissions[r].v[c] === 1;
      s.addShape(pres.shapes.RECTANGLE, { x, y, w: cellW, h: rowH, fill: { color: rowBg }, line: { color: C.lightGray, width: 0.5 } });
      s.addText(hasPerm ? "✓" : "✗", {
        x, y, w: cellW, h: rowH,
        fontSize: 14, color: hasPerm ? C.success : C.danger, fontFace: F.header, bold: true,
        align: "center", valign: "middle", margin: 0,
      });
    }
  }

  addTxt(s, "Role Switcher בסרגל מאפשר החלפת תפקיד מיידית — תפריט הניווט (15 פריטים) מסונן, כפתורים מוסתרים ודפים מוצגים/חסומים לפי תפקיד המשתמש הפעיל.", {
    x: 0.6, y: 6.55, w: 12.1, h: 0.55,
    fontSize: 11, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
  });
  footer(s);
}

// ============================================================
// SLIDE 17 — Notifications (Email primary, on RIGHT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 17, "התראות ומיילים למשתמש", "Notifications & Email System");

  const channels = [
    { icon: "📧", title: "Email",    desc: "SendGrid / SMTP\nתבנית HTML\n5 שפות",              color: C.danger },
    { icon: "🔔", title: "In-app",   desc: "פעמון בסרגל\nרשימת התראות\nסימון נקרא",            color: C.warning },
    { icon: "📅", title: "Calendar", desc: "אירוע ב-Google\nהזמנת משתתפים\nתזכורת אוטומטית", color: C.success },
  ];
  // Place Email (channel 0) on the RIGHT
  for (let i = 0; i < channels.length; i++) {
    const x = 8.75 - i * 4.15;
    const ch = channels[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.8, w: 3.95, h: 1.8, fill: { color: ch.color }, line: { color: ch.color, width: 0 }, rectRadius: 0.12 });
    s.addText(ch.icon, { x, y: 1.85, w: 3.95, h: 0.6, fontSize: 30, color: C.white, fontFace: F.header, align: "center", margin: 0 });
    s.addText(ch.title, { x, y: 2.45, w: 3.95, h: 0.4, fontSize: 16, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
    addTxt(s, ch.desc, { x, y: 2.85, w: 3.95, h: 0.7, fontSize: 10, color: C.white, fontFace: F.body, align: "center", margin: 0, lineSpacingMultiple: 1.2 });
  }

  // Auto-emails (primary list) on RIGHT
  section(s, 6.7, 3.8, 6.0, 3.2, "🚀 מיילים שנשלחים אוטומטית",
    "• הזמנת חבר צוות חדש\n• שיוך משימה למשתמש\n• משימה באיחור (סיכון Overdue)\n• תזכורת לפני תאריך יעד\n• סיכום יומי / שבועי לפי בקשה\n• אישור הצטרפות לפרויקט\n• דיווח על סיכון קריטי חדש\n• דוחות מתוזמנים מאוטומציות",
    C.primary);
  section(s, 0.6, 3.8, 5.9, 3.2, "⚙️ ניהול העדפות התראה",
    "כל משתמש קובע אילו אירועים יישלחו במייל ואילו רק בתוך האפליקציה.\n\nהגדרות בדף Settings:\n• Email digest (יומי / שבועי / מיידי)\n• ערוצים מועדפים לכל סוג אירוע\n• השתקה זמנית (Do-not-disturb)\n• שפת המייל (5 שפות)\n• פורמט HTML או טקסט",
    C.indigo);
  footer(s);
}

// ============================================================
// SLIDE 18 — Multi-language (Hebrew flag first, on RIGHT)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 18, "רב-לשוניות מלאה — 5 שפות + RTL", "Multi-language — 5 languages + RTL");
  const langs = [
    { flag: "🇮🇱", code: "he", name: "עברית",  dir: "RTL" },
    { flag: "🇬🇧", code: "en", name: "English", dir: "LTR" },
    { flag: "🇷🇺", code: "ru", name: "Русский", dir: "LTR" },
    { flag: "🇫🇷", code: "fr", name: "Français", dir: "LTR" },
    { flag: "🇪🇸", code: "es", name: "Español", dir: "LTR" },
  ];
  for (let i = 0; i < langs.length; i++) {
    // Hebrew (i=0) on the RIGHT
    const x = 10.4 - i * 2.5;
    const l = langs[i];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 2.3, h: 2.0, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, rectRadius: 0.15 });
    s.addText(l.flag, { x, y: 2.0, w: 2.3, h: 0.7, fontSize: 32, color: C.white, fontFace: F.header, align: "center", margin: 0 });
    addTxt(s, l.name, { x, y: 2.8, w: 2.3, h: 0.5, fontSize: 16, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
    s.addText(l.dir, { x, y: 3.3, w: 2.3, h: 0.4, fontSize: 11, color: C.primaryLight, fontFace: F.body, align: "center", margin: 0 });
  }
  // Helper / RTL sections: txt() helper is "first" — right
  section(s, 6.7, 4.2, 6.0, 1.4, "txt(locale, {he,en,ru,fr,es})", "Helper מרכזי. 346 דפוסי isHe ב-18 קבצים הומרו ל-txt().", C.primary);
  section(s, 0.6, 4.2, 5.9, 1.4, "RTL מלא", "Logical properties: ms / me / ps / pe / start / end. הגאנט בנוי ידנית כדי לתמוך ב-RTL.", C.purple);
  section(s, 0.6, 5.7, 12.1, 1.3, "Locale routing (next-intl)",
    "localePrefix: as-needed (עברית = /, אנגלית = /en). זיהוי שפה מטקסט: עברית / Cyrillic / Latin → locale → ברירת מחדל עברית.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 19 — Mobile & PWA (Sheet primary, on right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.white };
  header(s, 19, "מובייל ו-PWA", "Mobile & Progressive Web App");
  section(s, 6.7, 1.9, 6.0, 2.3, "תפריט נשלף (Sheet)",
    "Radix Sheet primitive. תפריט המבורגר ☰ במובייל. ניווט slide-in RTL. ה-Topbar מצמיד hamburger button.",
    C.primary);
  section(s, 0.6, 1.9, 5.9, 2.3, "Touch targets",
    "כל כפתור min-h-[44px] min-w-[44px] לפי Apple HIG. inputs בעלי font-size: 16px למניעת zoom ב-iOS. onFocus scroll into view.",
    C.indigo);
  section(s, 6.7, 4.3, 6.0, 2.5, "PWA Manifest",
    "שם עברי. theme color כחול Mapi. standalone mode. icons 192/512 PNG. apple-touch-icon.\n\nהתקנה: Chrome → Install app, Safari → Add to Home Screen.",
    C.purple);
  section(s, 0.6, 4.3, 5.9, 2.5, "Viewport ו-safe area",
    "viewportFit: cover\nenv(safe-area-inset-*)\n-webkit-text-size-adjust\ntouch-action: manipulation\n\nרגישות לפדינג של notch / camera punch.",
    C.success);
  footer(s);
}

// ============================================================
// SLIDE 20 — Tech Stack + Database (Frontend first, on right)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.primaryDark };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.3, h: 0.15, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
  addTxt(s, "20/20", { x: 0.4, y: 0.3, w: 0.8, h: 0.4, fontSize: 11, color: C.primaryLight, fontFace: F.body, align: "left", margin: 0 });
  addTxt(s, "טכנולוגיות ובסיס נתונים", { x: 0.6, y: 0.4, w: 12.1, h: 0.7, fontSize: 30, color: C.white, fontFace: F.header, bold: true, align: "right", margin: 0 });
  s.addText("Technology Stack & Database Engine", { x: 0.6, y: 1.05, w: 12.1, h: 0.35, fontSize: 13, color: C.primaryLight, fontFace: F.body, italic: true, align: "right", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 1.45, w: 12.1, h: 0.03, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });

  // Frontend (primary tier) on RIGHT
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.7, y: 1.8, w: 4.0, h: 2.5, fill: { color: C.primary }, line: { color: C.primary, width: 0 }, rectRadius: 0.12 });
  s.addText("Frontend", { x: 8.7, y: 1.9, w: 4.0, h: 0.5, fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  addTxt(s, "• Next.js 15.5 App Router\n• React 19\n• TypeScript strict\n• Tailwind CSS 3\n• shadcn/ui (ידני)\n• Radix UI primitives\n• Recharts (גרפים)\n• dnd-kit (Kanban)", { x: 8.9, y: 2.45, w: 3.6, h: 1.8, fontSize: 12, color: C.white, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.3 });

  // Backend (center)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.65, y: 1.8, w: 4.0, h: 2.5, fill: { color: C.indigo }, line: { color: C.indigo, width: 0 }, rectRadius: 0.12 });
  addTxt(s, "Backend ואינטגרציות", { x: 4.65, y: 1.9, w: 4.0, h: 0.5, fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  addTxt(s, "• Next.js API Routes\n• Node.js runtime\n• next-intl (5 שפות)\n• CASL (RBAC)\n• Google Calendar API\n• Email: SendGrid / SMTP\n• Webhooks דו-כיווניים", { x: 4.85, y: 2.45, w: 3.6, h: 1.8, fontSize: 12, color: C.white, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.3 });

  // AI Layer (left)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.8, w: 4.0, h: 2.5, fill: { color: C.purple }, line: { color: C.purple, width: 0 }, rectRadius: 0.12 });
  s.addText("AI Layer", { x: 0.6, y: 1.9, w: 4.0, h: 0.5, fontSize: 18, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  addTxt(s, "• Google Gemini 2.5 Flash\n• Anthropic Claude (אופציונלי)\n• Heuristic intent parser\n• App facts + live snapshot\n• Knowledge base (42+ Q&A)\n• Web Speech API (STT)\n• Speech Synthesis (TTS)", { x: 0.8, y: 2.45, w: 3.6, h: 1.8, fontSize: 12, color: C.white, fontFace: F.body, align: "right", margin: 0, valign: "top", lineSpacingMultiple: 1.3 });

  // Database (wide)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 4.5, w: 12.1, h: 2.4, fill: { color: C.accent }, line: { color: C.accent, width: 0 }, rectRadius: 0.15 });
  s.addText("Database Engine", { x: 0.6, y: 4.6, w: 12.1, h: 0.5, fontSize: 22, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0 });
  s.addText("Drizzle ORM — schema TypeScript-first, type-safe, Edge-compatible", { x: 0.6, y: 5.1, w: 12.1, h: 0.4, fontSize: 14, color: C.white, fontFace: F.body, bold: true, align: "center", margin: 0 });
  addTxt(s, "• 18 טבלאות מוכנות ב-lib/db/schema.ts: portfolios, programs, projects, wbs_nodes, tasks, task_dependencies, users, project_members, comments, audit_log, attachments, automations, ai_usage, ai_recommendations, notifications, calendar_events, item_types, sessions",
    { x: 1.0, y: 5.55, w: 11.3, h: 0.7, fontSize: 11, color: C.white, fontFace: F.body, align: "right", margin: 0, lineSpacingMultiple: 1.3 });
  addTxt(s, "ייצור: Neon Postgres / Supabase / Vercel Postgres — חיבור דרך drizzle() client. פיתוח: Mock data layer (lib/db/mock-data.ts) עם נתוני Salesforce אמיתיים מהאקסל.",
    { x: 1.0, y: 6.25, w: 11.3, h: 0.55, fontSize: 11, color: C.white, fontFace: F.body, italic: true, align: "right", margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 7.0, w: 13.3, h: 0.5, fill: { color: C.dark }, line: { color: C.dark, width: 0 } });
  addTxt(s, "Hosting: Vercel · Source: GitHub · CI/CD: auto deploy on push to main · OAuth 2.0 ל-Google Calendar",
    { x: 0.6, y: 7.1, w: 12.1, h: 0.35, fontSize: 11, color: C.white, fontFace: F.body, align: "center", margin: 0 });
}

// ============================================================
// Save
// ============================================================
const outPath = path.join(__dirname, "..", "PMO-Plus-Plus-Comprehensive-Presentation-v5.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log(`✓ Wrote: ${outPath}`);
  const stats = fs.statSync(outPath);
  console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB · 20 slides`);
});
