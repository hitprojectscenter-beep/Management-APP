/**
 * Generate the Work OS introduction presentation (15 slides).
 * Run: node scripts/generate-presentation.js
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "Work OS";
pres.title = "Work OS - פלטפורמת ניהול פרויקטים פנים-ארגונית";
pres.company = "המרכז למיפוי ישראל";

// ========================================
// Color Palette - "Midnight Executive" + Mapi blue
// ========================================
const C = {
  primary: "1E5FA8",      // Mapi blue (main)
  primaryDark: "0D3A72",  // Dark blue
  primaryLight: "CADCFC", // Ice blue
  accent: "F59E0B",       // Amber accent
  success: "10B981",      // Emerald
  danger: "EF4444",       // Red
  warning: "F97316",      // Orange
  white: "FFFFFF",
  offWhite: "F8FAFC",
  light: "F1F5F9",
  muted: "64748B",
  dark: "0F172A",
  bg: "FFFFFF",
};

// Fonts
const F = {
  header: "Arial Black",
  body: "Calibri",
};

// Logo SVG path - inline as base64
const logoPath = path.join(__dirname, "..", "public", "mapi-logo.svg");
let logoBase64 = "";
if (fs.existsSync(logoPath)) {
  const svg = fs.readFileSync(logoPath, "utf8");
  logoBase64 = "image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

// ========================================
// Helper: Section header with colored bar
// ========================================
function addHeader(slide, titleHe, titleEn, sectionNum, sectionTotal) {
  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.3, h: 0.15,
    fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  // Section indicator (top right)
  slide.addText(`${sectionNum}/${sectionTotal}`, {
    x: 12.3, y: 0.3, w: 0.8, h: 0.4,
    fontSize: 12, color: C.muted, fontFace: F.body, align: "right", margin: 0,
  });
  // Title
  slide.addText(titleHe, {
    x: 0.6, y: 0.4, w: 11, h: 0.7,
    fontSize: 32, color: C.primaryDark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  // English subtitle
  slide.addText(titleEn, {
    x: 0.6, y: 1.05, w: 11, h: 0.35,
    fontSize: 14, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
  });
  // Divider line
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 1.45, w: 12.1, h: 0.03,
    fill: { color: C.primaryLight }, line: { color: C.primaryLight, width: 0 },
  });
}

function addFooter(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 7.35, w: 13.3, h: 0.15,
    fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  slide.addText("Work OS · המרכז למיפוי ישראל · 2026", {
    x: 0.6, y: 7.0, w: 12, h: 0.3,
    fontSize: 9, color: C.muted, fontFace: F.body, align: "right", margin: 0,
  });
}

// ============================================================
// SLIDE 1 - Title slide
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.primaryDark };
  // Decorative elements
  slide.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6, fill: { color: C.primary, transparency: 70 }, line: { color: C.primary, width: 0 },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 9, y: 4, w: 7, h: 7, fill: { color: C.primary, transparency: 80 }, line: { color: C.primary, width: 0 },
  });
  // Logo
  if (logoBase64) {
    slide.addImage({ data: logoBase64, x: 5.65, y: 0.8, w: 2, h: 2 });
  }
  // Mapi name
  slide.addText("המרכז למיפוי ישראל", {
    x: 0.5, y: 2.9, w: 12.3, h: 0.5,
    fontSize: 22, color: C.primaryLight, fontFace: F.body, align: "center", bold: true, margin: 0,
  });
  // Main title
  slide.addText("Work OS", {
    x: 0.5, y: 3.6, w: 12.3, h: 1.2,
    fontSize: 80, color: C.white, fontFace: F.header, align: "center", bold: true, charSpacing: 4, margin: 0,
  });
  // Subtitle
  slide.addText("פלטפורמת ניהול פרויקטים פנים-ארגונית", {
    x: 0.5, y: 4.85, w: 12.3, h: 0.5,
    fontSize: 26, color: C.white, fontFace: F.body, align: "center", margin: 0,
  });
  slide.addText("Internal Project Management Platform", {
    x: 0.5, y: 5.35, w: 12.3, h: 0.4,
    fontSize: 16, color: C.primaryLight, fontFace: F.body, align: "center", italic: true, margin: 0,
  });
  // Divider
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.65, y: 5.95, w: 2, h: 0.05, fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  // Date
  slide.addText("אפריל 2026 · April 2026", {
    x: 0.5, y: 6.15, w: 12.3, h: 0.4,
    fontSize: 14, color: C.primaryLight, fontFace: F.body, align: "center", margin: 0,
  });
  slide.addText("מצגת מבוא וסקירת פונקציונליות · 15 שקפים", {
    x: 0.5, y: 6.6, w: 12.3, h: 0.4,
    fontSize: 12, color: C.primaryLight, fontFace: F.body, align: "center", italic: true, margin: 0,
  });
}

// ============================================================
// SLIDE 2 - The Challenge
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "האתגר", "The Challenge - Why we built this", 2, 15);

  slide.addText("הבעיות עם מערכות ניהול הפרויקטים הקיימות בשוק:", {
    x: 0.6, y: 1.7, w: 12.1, h: 0.4,
    fontSize: 16, color: C.dark, fontFace: F.body, align: "right", margin: 0,
  });

  const problems = [
    { num: "01", titleHe: "כשלי RTL בעברית", titleEn: "Hebrew RTL failures",
      descHe: "Monday.com ו-ClickUp סובלות מבאגים קריטיים בתמיכת עברית בתיאורי משימות ובתגובות.", color: C.danger },
    { num: "02", titleHe: "עלויות גבוהות", titleEn: "High costs",
      descHe: "ServiceNow $160+ למשתמש. Monday העלתה ב-18% לאחרונה. עלויות לא מקובלות לארגוני ממשל.", color: C.warning },
    { num: "03", titleHe: "אין שילוב Agile/Waterfall", titleEn: "No Agile/Waterfall hybrid",
      descHe: "מערכות נעולות למתודולוגיה אחת. אין גמישות אמיתית לפרויקטים היברידיים.", color: C.accent },
    { num: "04", titleHe: "AI לא Proactive", titleEn: "AI is not proactive",
      descHe: "אין זיהוי אוטומטי של סיכונים, חסימות וחריגות. הכל ידני.", color: C.primary },
  ];

  problems.forEach((p, idx) => {
    const y = 2.4 + idx * 1.1;
    // Card bg
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y, w: 12.1, h: 0.95,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 4, offset: 1, angle: 90, opacity: 0.06 },
    });
    // Side accent
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 12.62, y, w: 0.08, h: 0.95,
      fill: { color: p.color }, line: { color: p.color, width: 0 },
    });
    // Number circle
    slide.addShape(pres.shapes.OVAL, {
      x: 11.95, y: y + 0.225, w: 0.5, h: 0.5,
      fill: { color: p.color }, line: { color: p.color, width: 0 },
    });
    slide.addText(p.num, {
      x: 11.95, y: y + 0.225, w: 0.5, h: 0.5,
      fontSize: 13, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // Title
    slide.addText(p.titleHe, {
      x: 0.9, y: y + 0.15, w: 10.9, h: 0.4,
      fontSize: 18, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    // Description
    slide.addText(p.descHe, {
      x: 0.9, y: y + 0.5, w: 10.9, h: 0.4,
      fontSize: 12, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 3 - The Solution / Vision
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "הפתרון: Work OS", "Strategy meets execution", 3, 15);

  // Main statement
  slide.addText("פלטפורמה אחת. כל הפרויקטים. עברית מלאה. AI חכם.", {
    x: 0.6, y: 1.85, w: 12.1, h: 0.6,
    fontSize: 24, color: C.primaryDark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });

  // 3 column layout - Strategy / Tools / AI
  const cols = [
    { iconColor: C.primary, titleHe: "אסטרטגיה", titleEn: "Strategy",
      pointsHe: ["היררכיית WBS מלאה", "תצוגת פורטפוליו ארגונית", "Planned vs Actual", "מעקב SLA"] },
    { iconColor: C.success, titleHe: "ביצוע", titleEn: "Execution",
      pointsHe: ["Gantt עם תמיכת RTL", "Kanban Drag & Drop", "יומן ולוח שנה", "WBS אינטראקטיבי"] },
    { iconColor: C.accent, titleHe: "אינטליגנציה", titleEn: "Intelligence",
      pointsHe: ["זיהוי סיכונים אוטומטי", "Claude AI Sidekick", "Digital Workers", "סנכרון Google Calendar"] },
  ];

  cols.forEach((col, idx) => {
    const x = 0.6 + idx * 4.15;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.7, w: 4.0, h: 4.2,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    // Top color stripe
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.7, w: 4.0, h: 0.15,
      fill: { color: col.iconColor }, line: { color: col.iconColor, width: 0 },
    });
    // Icon circle
    slide.addShape(pres.shapes.OVAL, {
      x: x + 1.5, y: 3.0, w: 1.0, h: 1.0,
      fill: { color: col.iconColor }, line: { color: col.iconColor, width: 0 },
    });
    slide.addText(["⚡", "🚀", "✨"][idx], {
      x: x + 1.5, y: 3.0, w: 1.0, h: 1.0,
      fontSize: 36, color: C.white, align: "center", valign: "middle", margin: 0,
    });
    // Title
    slide.addText(col.titleHe, {
      x, y: 4.15, w: 4.0, h: 0.5,
      fontSize: 22, color: C.dark, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    slide.addText(col.titleEn, {
      x, y: 4.6, w: 4.0, h: 0.3,
      fontSize: 11, color: C.muted, fontFace: F.body, italic: true, align: "center", margin: 0,
    });
    // Points
    const items = col.pointsHe.map((p, i) => ({
      text: p,
      options: { bullet: { code: "25CF" }, breakLine: i < col.pointsHe.length - 1 },
    }));
    slide.addText(items, {
      x: x + 0.3, y: 5.0, w: 3.4, h: 1.8,
      fontSize: 13, color: C.dark, fontFace: F.body, align: "right", paraSpaceAfter: 4,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 4 - Tech Stack
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "ארכיטקטורה טכנולוגית", "Tech Stack", 4, 15);

  // 2x4 grid of technologies
  const techs = [
    { name: "Next.js 15", desc: "React Framework + App Router", color: C.dark, layer: "Frontend" },
    { name: "React 19", desc: "UI Library + Server Components", color: "61DAFB", layer: "Frontend" },
    { name: "TypeScript", desc: "Type-safe codebase", color: "3178C6", layer: "Language" },
    { name: "Tailwind CSS", desc: "Utility-first styling + RTL", color: "06B6D4", layer: "Styling" },
    { name: "Drizzle ORM", desc: "Type-safe Postgres queries", color: "C5F74F", layer: "Database" },
    { name: "PostgreSQL", desc: "Relational database", color: "336791", layer: "Database" },
    { name: "Claude AI", desc: "Risk engine + chat assistant", color: "D97757", layer: "AI" },
    { name: "Vercel", desc: "Production deployment", color: "000000", layer: "Cloud" },
  ];

  techs.forEach((tech, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = 0.6 + col * 3.1;
    const y = 1.95 + row * 2.6;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.95, h: 2.4,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
    });
    // Top stripe
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.95, h: 0.12,
      fill: { color: tech.color }, line: { color: tech.color, width: 0 },
    });
    // Layer label
    slide.addText(tech.layer.toUpperCase(), {
      x: x + 0.2, y: y + 0.3, w: 2.55, h: 0.3,
      fontSize: 9, color: C.muted, fontFace: F.body, bold: true, charSpacing: 2, align: "right", margin: 0,
    });
    // Name
    slide.addText(tech.name, {
      x: x + 0.2, y: y + 0.7, w: 2.55, h: 0.6,
      fontSize: 22, color: tech.color === "000000" ? C.dark : tech.color, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    // Desc
    slide.addText(tech.desc, {
      x: x + 0.2, y: y + 1.45, w: 2.55, h: 0.7,
      fontSize: 12, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 5 - WBS Hierarchy
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "מבנה היררכי - WBS", "Work Breakdown Structure", 5, 15);

  slide.addText("היררכיה של 8 רמות מקנה שליטה מלאה - מהאסטרטגיה הארגונית עד תת-המשימה הקטנה ביותר:", {
    x: 0.6, y: 1.75, w: 12.1, h: 0.4,
    fontSize: 14, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
  });

  const levels = [
    { name: "Portfolio", he: "פורטפוליו", desc: "אוסף של תוכניות אסטרטגיות", color: "7C3AED", indent: 0 },
    { name: "Program", he: "תוכנית", desc: "קבוצת פרויקטים תחת יוזמה משותפת", color: "8B5CF6", indent: 1 },
    { name: "Project", he: "פרויקט", desc: "יוזמה עם תאריכי התחלה וסיום", color: "3B82F6", indent: 2 },
    { name: "Goal", he: "יעד", desc: "תוצאה מדידה ספציפית", color: "0EA5E9", indent: 3 },
    { name: "Milestone", he: "אבן דרך", desc: "נקודת ציון משמעותית", color: "06B6D4", indent: 4 },
    { name: "Activity", he: "פעילות", desc: "חבילת עבודה עם תוצר (Deliverable)", color: "10B981", indent: 5 },
    { name: "Task", he: "משימה", desc: "יחידת עבודה אישית", color: "F59E0B", indent: 6 },
    { name: "Subtask", he: "תת-משימה", desc: "פירוט של משימה", color: "F97316", indent: 7 },
  ];

  levels.forEach((level, idx) => {
    const y = 2.35 + idx * 0.6;
    const indentX = level.indent * 0.45;
    // Side bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 12.5, y: y + 0.04, w: 0.15, h: 0.45,
      fill: { color: level.color }, line: { color: level.color, width: 0 },
    });
    // Level number badge
    slide.addShape(pres.shapes.OVAL, {
      x: 12.7 - indentX, y: y + 0.04, w: 0.45, h: 0.45,
      fill: { color: level.color }, line: { color: level.color, width: 0 },
    });
    slide.addText(String(idx + 1), {
      x: 12.7 - indentX, y: y + 0.04, w: 0.45, h: 0.45,
      fontSize: 13, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // Hebrew name
    slide.addText(level.he, {
      x: 11.7 - indentX, y: y, w: 1.0, h: 0.55,
      fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "right", valign: "middle", margin: 0,
    });
    // English name
    slide.addText(level.name, {
      x: 10.4 - indentX, y: y, w: 1.3, h: 0.55,
      fontSize: 12, color: level.color, fontFace: F.body, italic: true, align: "right", valign: "middle", margin: 0,
    });
    // Description
    slide.addText(level.desc, {
      x: 0.6, y: y, w: 10.0 - indentX, h: 0.55,
      fontSize: 12, color: C.muted, fontFace: F.body, align: "right", valign: "middle", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 6 - Landing Page (My Tasks)
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "עמוד הבית: המשימות שלי", "Personal landing page", 6, 15);

  // Left: features list
  const features = [
    { icon: "🎯", titleHe: "תצוגה אישית", descHe: "כל המשימות הפתוחות שלך, ממוינות לפי דחיפות" },
    { icon: "🎨", titleHe: "סטטוסים צבעוניים", descHe: "ירוק/צהוב/אדום לפי זמן נותר עד הדדליין" },
    { icon: "🏷️", titleHe: "7 טאבים סינון", descHe: "הכל / בביצוע / לא התחילו / חסומות / באיחור / לפי פרויקט" },
    { icon: "➕", titleHe: "יצירת משימה", descHe: "כפתור + פותח חלון יצירה מהיר" },
    { icon: "📊", titleHe: "סטטיסטיקות אישיות", descHe: "4 KPI cards: סך פתוחות / בביצוע / באיחור / השבוע" },
    { icon: "👥", titleHe: "ההקצאה שלי", descHe: "FTE % לכל פרויקט עם אזהרת הקצאת יתר" },
  ];

  features.forEach((f, idx) => {
    const y = 2.0 + idx * 0.85;
    slide.addShape(pres.shapes.OVAL, {
      x: 12.0, y, w: 0.6, h: 0.6,
      fill: { color: C.primaryLight }, line: { color: C.primary, width: 1 },
    });
    slide.addText(f.icon, {
      x: 12.0, y, w: 0.6, h: 0.6,
      fontSize: 22, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(f.titleHe, {
      x: 7.0, y, w: 4.9, h: 0.35,
      fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    slide.addText(f.descHe, {
      x: 7.0, y: y + 0.35, w: 4.9, h: 0.35,
      fontSize: 11, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });

  // Right: mock screenshot illustration
  // Browser frame
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.0, w: 6.0, h: 4.9,
    fill: { color: C.dark }, line: { color: C.dark, width: 0 },
  });
  // 3 dots
  slide.addShape(pres.shapes.OVAL, { x: 0.8, y: 2.15, w: 0.18, h: 0.18, fill: { color: "EF4444" }, line: { color: "EF4444", width: 0 } });
  slide.addShape(pres.shapes.OVAL, { x: 1.05, y: 2.15, w: 0.18, h: 0.18, fill: { color: "F59E0B" }, line: { color: "F59E0B", width: 0 } });
  slide.addShape(pres.shapes.OVAL, { x: 1.3, y: 2.15, w: 0.18, h: 0.18, fill: { color: "10B981" }, line: { color: "10B981", width: 0 } });
  // App body
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: 2.4, w: 5.8, h: 4.4, fill: { color: C.offWhite }, line: { color: C.offWhite, width: 0 },
  });
  // Greeting
  slide.addText("שלום, משתמש 👋", {
    x: 0.85, y: 2.55, w: 5.5, h: 0.4,
    fontSize: 18, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });
  // KPI cards mock
  const kpis = [
    { label: "סך פתוחות", value: "7", color: C.primary },
    { label: "בביצוע", value: "3", color: C.success },
    { label: "באיחור", value: "3", color: C.danger },
    { label: "השבוע", value: "1", color: C.accent },
  ];
  kpis.forEach((k, i) => {
    const x = 0.85 + i * 1.4;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.1, w: 1.3, h: 0.85, fill: { color: C.white }, line: { color: C.light, width: 1 },
    });
    slide.addText(k.value, {
      x, y: 3.15, w: 1.3, h: 0.4, fontSize: 22, color: k.color, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    slide.addText(k.label, {
      x, y: 3.55, w: 1.3, h: 0.3, fontSize: 9, color: C.muted, fontFace: F.body, align: "center", margin: 0,
    });
  });
  // Tabs
  const tabs = ["הכל", "בביצוע", "באיחור", "חסומות"];
  tabs.forEach((t, i) => {
    const x = 0.85 + i * 1.4;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 4.15, w: 1.3, h: 0.35,
      fill: { color: i === 0 ? C.primary : C.white }, line: { color: C.light, width: 1 },
    });
    slide.addText(t, {
      x, y: 4.15, w: 1.3, h: 0.35, fontSize: 10, color: i === 0 ? C.white : C.dark,
      fontFace: F.body, align: "center", valign: "middle", margin: 0,
    });
  });
  // Task rows
  for (let i = 0; i < 3; i++) {
    const y = 4.7 + i * 0.65;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.85, y, w: 5.5, h: 0.55, fill: { color: C.white }, line: { color: C.light, width: 1 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.85, y, w: 0.06, h: 0.55, fill: { color: [C.danger, C.primary, C.accent][i] }, line: { color: "FFFFFF", width: 0 },
    });
    slide.addText(["פתרון חסימת אינטגרציה", "פרסום הבריף לספקים", "סקירת תחזוקה רבעונית"][i], {
      x: 1.0, y: y + 0.05, w: 4.0, h: 0.25,
      fontSize: 10, color: C.dark, fontFace: F.body, bold: true, align: "right", margin: 0,
    });
    slide.addText(["איחור 40 ימים", "22 ימים", "60 ימים"][i], {
      x: 1.0, y: y + 0.27, w: 4.0, h: 0.22,
      fontSize: 9, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  }
  addFooter(slide);
}

// ============================================================
// SLIDE 7 - Project Views (4 views)
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "תצוגות פרויקט מרובות", "4 ways to see the same data", 7, 15);

  const views = [
    { name: "List", he: "רשימה", icon: "📋", color: C.primary,
      desc: "טבלה מסודרת עם כל הפרטים: סטטוס, אחראי, תאריכים, התקדמות" },
    { name: "Kanban", he: "קנבן", icon: "🗂️", color: C.success,
      desc: "עמודות לפי סטטוס עם Drag & Drop. Workflow ויזואלי קלאסי" },
    { name: "Gantt", he: "גאנט", icon: "📊", color: C.accent,
      desc: "ציר זמן עם תלויות. תמיכת RTL מלאה - בניגוד למתחרים!" },
    { name: "Calendar", he: "יומן", icon: "📅", color: "8B5CF6",
      desc: "תצוגה חודשית עם משימות לפי תאריכי דדליין" },
  ];

  views.forEach((view, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.6 + col * 6.25;
    const y = 1.95 + row * 2.65;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 6.05, h: 2.45,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    // Side accent
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.12, h: 2.45,
      fill: { color: view.color }, line: { color: view.color, width: 0 },
    });
    // Icon circle
    slide.addShape(pres.shapes.OVAL, {
      x: 5.55 + col * 6.25, y: y + 0.4, w: 0.85, h: 0.85,
      fill: { color: view.color }, line: { color: view.color, width: 0 },
    });
    slide.addText(view.icon, {
      x: 5.55 + col * 6.25, y: y + 0.4, w: 0.85, h: 0.85,
      fontSize: 32, align: "center", valign: "middle", margin: 0,
    });
    // Hebrew name
    slide.addText(view.he, {
      x: x + 0.3, y: y + 0.4, w: 4.9, h: 0.5,
      fontSize: 26, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    // English name
    slide.addText(view.name, {
      x: x + 0.3, y: y + 0.95, w: 4.9, h: 0.35,
      fontSize: 13, color: view.color, fontFace: F.body, italic: true, align: "right", margin: 0,
    });
    // Desc
    slide.addText(view.desc, {
      x: x + 0.3, y: y + 1.4, w: 5.5, h: 0.95,
      fontSize: 12, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 8 - AI Risk Engine
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "מנוע זיהוי סיכונים AI", "Automatic risk detection engine", 8, 15);

  slide.addText("הסריקה רצה ברקע ומזהה אוטומטית 5 סוגי סיכונים על כל המשימות:", {
    x: 0.6, y: 1.75, w: 12.1, h: 0.4,
    fontSize: 14, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
  });

  const risks = [
    { num: "01", icon: "⏰", titleHe: "באיחור", titleEn: "Overdue",
      descHe: "המשימה עברה את תאריך היעד", color: C.danger },
    { num: "02", icon: "🚫", titleHe: "חסום", titleEn: "Blocked",
      descHe: "חסום יותר מ-24 שעות", color: C.danger },
    { num: "03", icon: "📈", titleHe: "חריגת מאמץ", titleEn: "Effort Overrun",
      descHe: "20%+ מעל הערכת השעות", color: C.warning },
    { num: "04", icon: "🐢", titleHe: "התקדמות איטית", titleEn: "Schedule Slip",
      descHe: "ההתקדמות מאחורי הזמן שעבר", color: C.accent },
    { num: "05", icon: "⚠️", titleHe: "קריטי לא התחיל", titleEn: "Critical Not Started",
      descHe: "עדיפות קריטית, פחות מ-3 ימים", color: "8B5CF6" },
  ];

  risks.forEach((risk, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 0.6 + col * 4.2;
    const y = 2.4 + row * 2.4;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.0, h: 2.2,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    // Number ribbon
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x + 3.4, y: y + 0.15, w: 0.5, h: 0.4,
      fill: { color: risk.color }, line: { color: risk.color, width: 0 },
    });
    slide.addText(risk.num, {
      x: x + 3.4, y: y + 0.15, w: 0.5, h: 0.4,
      fontSize: 12, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // Icon
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.3, y: y + 0.3, w: 0.9, h: 0.9,
      fill: { color: C.white }, line: { color: risk.color, width: 2 },
    });
    slide.addText(risk.icon, {
      x: x + 0.3, y: y + 0.3, w: 0.9, h: 0.9,
      fontSize: 32, align: "center", valign: "middle", margin: 0,
    });
    // Title
    slide.addText(risk.titleHe, {
      x: x + 0.3, y: y + 1.25, w: 3.4, h: 0.4,
      fontSize: 18, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    slide.addText(risk.titleEn, {
      x: x + 0.3, y: y + 1.6, w: 3.4, h: 0.3,
      fontSize: 11, color: risk.color, fontFace: F.body, italic: true, align: "right", margin: 0,
    });
    // Desc
    slide.addText(risk.descHe, {
      x: x + 0.3, y: y + 1.85, w: 3.4, h: 0.3,
      fontSize: 11, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 9 - AI Sidekick
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "AI Sidekick - העוזר החכם", "Conversational AI for your data", 9, 15);

  // Left side: features
  const features = [
    { titleHe: "🧠 הקשר מלא", descHe: "רואה את כל הנתונים שלך - פרויקטים, משימות, סיכונים" },
    { titleHe: "🇮🇱 עברית מלאה", descHe: "שואל בעברית, מקבל תשובה בעברית" },
    { titleHe: "📊 שאלות מורכבות", descHe: "'מי הכי עמוס?' / 'אילו פרויקטים בסיכון?' / 'סכם את השבוע'" },
    { titleHe: "⚡ מבוסס Claude", descHe: "מודל ה-LLM הטוב בעולם לעברית ולהבנת הקשר" },
  ];

  features.forEach((f, idx) => {
    const y = 2.05 + idx * 1.15;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 6.7, y, w: 6.0, h: 0.95,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 12.62, y, w: 0.08, h: 0.95,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    slide.addText(f.titleHe, {
      x: 6.85, y: y + 0.15, w: 5.7, h: 0.35,
      fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    slide.addText(f.descHe, {
      x: 6.85, y: y + 0.5, w: 5.7, h: 0.4,
      fontSize: 11, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });

  // Right side: chat illustration
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.0, w: 5.95, h: 5.0,
    fill: { color: C.offWhite }, line: { color: C.light, width: 2 },
    shadow: { type: "outer", color: "000000", blur: 12, offset: 3, angle: 90, opacity: 0.12 },
  });
  // Header bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.0, w: 5.95, h: 0.6,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  slide.addText("✨ AI Sidekick", {
    x: 0.85, y: 2.0, w: 5.5, h: 0.6,
    fontSize: 16, color: C.white, fontFace: F.header, bold: true, align: "right", valign: "middle", margin: 0,
  });
  // User message
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 1.8, y: 2.85, w: 4.5, h: 0.5, fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  slide.addText("מה הסיכונים בפרויקט Salesforce?", {
    x: 1.8, y: 2.85, w: 4.5, h: 0.5,
    fontSize: 12, color: C.white, fontFace: F.body, align: "right", valign: "middle", margin: 0,
  });
  // Bot response
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.85, y: 3.55, w: 5.45, h: 2.7,
    fill: { color: C.white }, line: { color: C.light, width: 1 },
  });
  slide.addText("זוהו 4 סיכונים פעילים בפרויקט יישומי Salesforce:", {
    x: 1.0, y: 3.65, w: 5.2, h: 0.35,
    fontSize: 11, color: C.dark, fontFace: F.body, bold: true, align: "right", margin: 0,
  });
  const insights = [
    "• המשימה 'אינטגרציה' חסומה 40 ימים",
    "• פרויקט ניהול משימות באיחור של חודשיים",
    "• ועדת הספקים טרם החלה (deadline 31/8)",
    "• 3 משימות עברו את הדדליין שלהן",
  ];
  insights.forEach((line, i) => {
    slide.addText(line, {
      x: 1.0, y: 4.05 + i * 0.45, w: 5.2, h: 0.4,
      fontSize: 10, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });
  // Recommendation
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.85, y: 6.4, w: 5.45, h: 0.5, fill: { color: "DCFCE7" }, line: { color: C.success, width: 1 },
  });
  slide.addText("💡 המלצה: הסלמת חסימת האינטגרציה", {
    x: 1.0, y: 6.4, w: 5.2, h: 0.5,
    fontSize: 11, color: "065F46", fontFace: F.body, bold: true, align: "right", valign: "middle", margin: 0,
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 10 - Help System (Tour + Bot)
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "מערכת עזרה אינטראקטיבית", "Onboarding tour + Help bot", 10, 15);

  slide.addText("שתי דרכים להתמצא במערכת - מבוסס מחקר UX מ-Nielsen Norman Group ו-Microsoft Fluent:", {
    x: 0.6, y: 1.75, w: 12.1, h: 0.4,
    fontSize: 13, color: C.muted, fontFace: F.body, italic: true, align: "right", margin: 0,
  });

  // Two big cards
  const items = [
    {
      titleHe: "סיור אינטראקטיבי", titleEn: "Interactive Tour", icon: "🎓", color: C.primary,
      pointsHe: [
        "12 שלבים מודרכים",
        "Spotlight effect מדגיש את האלמנט הנוכחי",
        "מתחיל אוטומטית בכניסה ראשונה",
        "ניווט עם חצים, Esc לסגירה",
        "ניתן להפעיל מחדש מכפתור העזרה",
      ],
    },
    {
      titleHe: "בוט עזרה חכם", titleEn: "Smart Help Bot", icon: "❓", color: C.success,
      pointsHe: [
        "16 שאלות נפוצות מובנות",
        "Keyword matching מהיר וחינמי",
        "Fallback ל-Claude עם knowledge base",
        "כפתור צף תמיד נגיש",
        "תשובות בעברית עם דוגמאות",
      ],
    },
  ];

  items.forEach((item, idx) => {
    const x = 0.6 + idx * 6.25;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.4, w: 6.05, h: 4.7,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 10, offset: 3, angle: 90, opacity: 0.1 },
    });
    // Top stripe
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.4, w: 6.05, h: 0.15, fill: { color: item.color }, line: { color: item.color, width: 0 },
    });
    // Big icon
    slide.addShape(pres.shapes.OVAL, {
      x: x + 2.42, y: 2.85, w: 1.2, h: 1.2,
      fill: { color: item.color }, line: { color: item.color, width: 0 },
    });
    slide.addText(item.icon, {
      x: x + 2.42, y: 2.85, w: 1.2, h: 1.2,
      fontSize: 50, align: "center", valign: "middle", margin: 0,
    });
    // Title
    slide.addText(item.titleHe, {
      x, y: 4.2, w: 6.05, h: 0.5,
      fontSize: 24, color: C.dark, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    slide.addText(item.titleEn, {
      x, y: 4.7, w: 6.05, h: 0.3,
      fontSize: 12, color: item.color, fontFace: F.body, italic: true, align: "center", margin: 0,
    });
    // Points
    const items_text = item.pointsHe.map((p, i) => ({
      text: p,
      options: { bullet: { code: "25CF" }, breakLine: i < item.pointsHe.length - 1 },
    }));
    slide.addText(items_text, {
      x: x + 0.4, y: 5.15, w: 5.25, h: 1.85,
      fontSize: 12, color: C.dark, fontFace: F.body, align: "right", paraSpaceAfter: 4,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 11 - Project Members & FTE
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "ניהול משתתפים ו-FTE", "Project members & FTE allocation", 11, 15);

  // Big stat
  slide.addText("100%", {
    x: 0.6, y: 2.0, w: 5.5, h: 1.8,
    fontSize: 110, color: C.primary, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  slide.addText("מקסימום הקצאת FTE למשתמש", {
    x: 0.6, y: 3.85, w: 5.5, h: 0.5,
    fontSize: 18, color: C.dark, fontFace: F.body, bold: true, align: "center", margin: 0,
  });
  slide.addText("מעל - אזהרה אדומה אוטומטית!", {
    x: 0.6, y: 4.35, w: 5.5, h: 0.4,
    fontSize: 12, color: C.danger, fontFace: F.body, italic: true, align: "center", margin: 0,
  });

  // Right: features
  const features = [
    { titleHe: "תפקיד בכל פרויקט", descHe: "Tech Lead / PM / QA / Developer / Sponsor" },
    { titleHe: "אחוז משרה (FTE)", descHe: "כמה מזמן העבודה מוקצה לפרויקט" },
    { titleHe: "צבעי רמזור", descHe: "ירוק 80%+ / כחול 50-80% / צהוב 25-50% / אפור" },
    { titleHe: "סיכום אישי", descHe: "תצוגה של 'ההשתתפות שלי' עם warning של overflow" },
    { titleHe: "תצוגת צוות", descHe: "כל המשתתפים בכל פרויקט/תוכנית/פורטפוליו" },
  ];

  features.forEach((f, idx) => {
    const y = 2.0 + idx * 1.0;
    slide.addShape(pres.shapes.OVAL, {
      x: 12.0, y: y + 0.15, w: 0.5, h: 0.5,
      fill: { color: C.primary }, line: { color: C.primary, width: 0 },
    });
    slide.addText(String(idx + 1), {
      x: 12.0, y: y + 0.15, w: 0.5, h: 0.5,
      fontSize: 14, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(f.titleHe, {
      x: 6.5, y: y, w: 5.4, h: 0.4,
      fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    slide.addText(f.descHe, {
      x: 6.5, y: y + 0.4, w: 5.4, h: 0.45,
      fontSize: 11, color: C.muted, fontFace: F.body, align: "right", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 12 - Dashboards & KPIs
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "דשבורדים ו-KPI", "Dashboards & key performance indicators", 12, 15);

  // 4 KPI cards at top
  const kpis = [
    { value: "12", label: "פרויקטים פעילים", color: C.primary },
    { value: "47", label: "משימות פתוחות", color: "8B5CF6" },
    { value: "82%", label: "אחוז ביצוע", color: C.success },
    { value: "4", label: "סיכונים פעילים", color: C.danger },
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.1;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.95, w: 2.95, h: 1.6,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.08 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.95, w: 2.95, h: 0.12, fill: { color: k.color }, line: { color: k.color, width: 0 },
    });
    slide.addText(k.value, {
      x, y: 2.2, w: 2.95, h: 0.9,
      fontSize: 50, color: k.color, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(k.label, {
      x, y: 3.1, w: 2.95, h: 0.4,
      fontSize: 13, color: C.muted, fontFace: F.body, align: "center", margin: 0,
    });
  });

  // Bottom: chart types
  slide.addText("גרפים שמסבירים את עצמם:", {
    x: 0.6, y: 3.85, w: 12.1, h: 0.4,
    fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });

  const charts = [
    { titleHe: "Velocity", descHe: "מהירות הצוות לאורך זמן", icon: "📈" },
    { titleHe: "Workload", descHe: "עומס לכל חבר צוות", icon: "📊" },
    { titleHe: "Status Distribution", descHe: "התפלגות סטטוסים בעוגה", icon: "🥧" },
    { titleHe: "Project Health", descHe: "ציון בריאות 0-100", icon: "💚" },
  ];

  charts.forEach((c, i) => {
    const x = 0.6 + i * 3.1;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 4.4, w: 2.95, h: 2.4,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
    });
    slide.addText(c.icon, {
      x, y: 4.55, w: 2.95, h: 0.85, fontSize: 44, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(c.titleHe, {
      x, y: 5.5, w: 2.95, h: 0.4,
      fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    slide.addText(c.descHe, {
      x: x + 0.15, y: 5.95, w: 2.65, h: 0.7,
      fontSize: 11, color: C.muted, fontFace: F.body, align: "center", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 13 - Risk Management
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "ניהול סיכונים", "Risk management & mitigation", 13, 15);

  // Severity matrix at top
  const severities = [
    { num: "8", label: "סך פעילים", color: C.dark, bg: C.offWhite },
    { num: "1", label: "קריטי", color: C.danger, bg: "FEE2E2" },
    { num: "3", label: "גבוה", color: C.warning, bg: "FED7AA" },
    { num: "3", label: "בינוני", color: C.accent, bg: "FEF3C7" },
    { num: "1", label: "נמוך", color: C.primary, bg: "DBEAFE" },
  ];

  severities.forEach((s, i) => {
    const x = 0.6 + i * 2.5;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.95, w: 2.4, h: 1.5,
      fill: { color: s.bg }, line: { color: s.color, width: 2 },
    });
    slide.addText(s.num, {
      x, y: 2.05, w: 2.4, h: 0.85,
      fontSize: 48, color: s.color, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(s.label, {
      x, y: 2.95, w: 2.4, h: 0.4,
      fontSize: 13, color: s.color, fontFace: F.body, bold: true, align: "center", margin: 0,
    });
  });

  // Risk lifecycle - bottom section
  slide.addText("מחזור חיי סיכון - אוטומציה מלאה:", {
    x: 0.6, y: 3.75, w: 12.1, h: 0.4,
    fontSize: 16, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
  });

  const lifecycle = [
    { num: "1", titleHe: "זיהוי", descHe: "סריקה אוטומטית של AI", color: C.primary },
    { num: "2", titleHe: "תיעדוף", descHe: "דרגה ופרויקט קשור", color: C.accent },
    { num: "3", titleHe: "המלצה", descHe: "פעולה מוצעת", color: C.success },
    { num: "4", titleHe: "מטופל / נדחה", descHe: "פעולה אנושית", color: "8B5CF6" },
  ];

  lifecycle.forEach((step, idx) => {
    const x = 0.6 + idx * 3.15;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 4.3, w: 3.0, h: 2.5,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.06 },
    });
    // Big number
    slide.addText(step.num, {
      x, y: 4.4, w: 3.0, h: 1.0,
      fontSize: 64, color: step.color, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // Title
    slide.addText(step.titleHe, {
      x, y: 5.45, w: 3.0, h: 0.45,
      fontSize: 18, color: C.dark, fontFace: F.header, bold: true, align: "center", margin: 0,
    });
    // Desc
    slide.addText(step.descHe, {
      x, y: 5.95, w: 3.0, h: 0.5,
      fontSize: 11, color: C.muted, fontFace: F.body, align: "center", margin: 0,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 14 - Roadmap
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  addHeader(slide, "מפת דרכים", "Development roadmap", 14, 15);

  const phases = [
    {
      label: "✅ Q1 2026", titleHe: "MVP מוכן", color: C.success, status: "הושלם",
      itemsHe: ["ארכיטקטורה", "12 דפים פעילים", "AI Risk Engine", "תמיכת RTL מלאה", "Help system"],
    },
    {
      label: "⚙️ Q2 2026", titleHe: "DB אמיתי + Auth", color: C.primary, status: "בעבודה",
      itemsHe: ["Neon Postgres", "Google OAuth", "Audit logs", "Real-time updates", "Mobile responsive"],
    },
    {
      label: "🚀 Q3 2026", titleHe: "אינטגרציות", color: C.accent, status: "מתוכנן",
      itemsHe: ["Google Calendar", "Jira sync", "Salesforce", "Slack notifications", "API public"],
    },
    {
      label: "🏆 Q4 2026", titleHe: "Enterprise", color: "8B5CF6", status: "חזון",
      itemsHe: ["SOC2 Type 2", "Multi-tenancy", "Advanced AI", "Mobile native apps", "Power BI export"],
    },
  ];

  phases.forEach((phase, idx) => {
    const x = 0.6 + idx * 3.15;
    // Card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.9, w: 3.0, h: 5.0,
      fill: { color: C.offWhite }, line: { color: C.light, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    // Top stripe
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.9, w: 3.0, h: 0.6, fill: { color: phase.color }, line: { color: phase.color, width: 0 },
    });
    slide.addText(phase.label, {
      x, y: 1.9, w: 3.0, h: 0.6,
      fontSize: 16, color: C.white, fontFace: F.header, bold: true, align: "center", valign: "middle", margin: 0,
    });
    // Title
    slide.addText(phase.titleHe, {
      x: x + 0.1, y: 2.65, w: 2.8, h: 0.45,
      fontSize: 18, color: C.dark, fontFace: F.header, bold: true, align: "right", margin: 0,
    });
    // Status badge
    slide.addText(phase.status, {
      x: x + 0.1, y: 3.1, w: 2.8, h: 0.3,
      fontSize: 11, color: phase.color, fontFace: F.body, italic: true, bold: true, align: "right", margin: 0,
    });
    // Items
    const items = phase.itemsHe.map((it, i) => ({
      text: it,
      options: { bullet: { code: "25CF" }, breakLine: i < phase.itemsHe.length - 1 },
    }));
    slide.addText(items, {
      x: x + 0.25, y: 3.55, w: 2.6, h: 3.2,
      fontSize: 11, color: C.dark, fontFace: F.body, align: "right", paraSpaceAfter: 4,
    });
  });
  addFooter(slide);
}

// ============================================================
// SLIDE 15 - Thank you / Contact
// ============================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.primaryDark };
  // Decorative
  slide.addShape(pres.shapes.OVAL, {
    x: -3, y: 3, w: 7, h: 7, fill: { color: C.primary, transparency: 75 }, line: { color: C.primary, width: 0 },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 9, y: -2, w: 7, h: 7, fill: { color: C.primary, transparency: 80 }, line: { color: C.primary, width: 0 },
  });
  // Logo
  if (logoBase64) {
    slide.addImage({ data: logoBase64, x: 6.15, y: 0.8, w: 1.0, h: 1.0 });
  }
  // Big text
  slide.addText("תודה!", {
    x: 0.5, y: 2.1, w: 12.3, h: 1.5,
    fontSize: 110, color: C.white, fontFace: F.header, bold: true, align: "center", margin: 0,
  });
  slide.addText("Thank You", {
    x: 0.5, y: 3.55, w: 12.3, h: 0.6,
    fontSize: 32, color: C.primaryLight, fontFace: F.body, italic: true, align: "center", margin: 0,
  });
  // Divider
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.65, y: 4.4, w: 2, h: 0.05, fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  // Contact
  slide.addText("שאלות? פתח את בוט העזרה במערכת ❓", {
    x: 0.5, y: 4.7, w: 12.3, h: 0.5,
    fontSize: 18, color: C.white, fontFace: F.body, align: "center", margin: 0,
  });
  slide.addText("github.com/hitprojectscenter-beep/Management-APP", {
    x: 0.5, y: 5.3, w: 12.3, h: 0.4,
    fontSize: 14, color: C.primaryLight, fontFace: F.body, italic: true, align: "center", margin: 0,
  });
  // Footer
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 6.6, w: 13.3, h: 0.9, fill: { color: C.primary }, line: { color: C.primary, width: 0 },
  });
  slide.addText("Work OS · המרכז למיפוי ישראל · אפריל 2026", {
    x: 0.5, y: 6.6, w: 12.3, h: 0.9,
    fontSize: 16, color: C.white, fontFace: F.body, align: "center", valign: "middle", margin: 0,
  });
}

// Save
const outputPath = path.join(__dirname, "..", "Work-OS-Presentation.pptx");
pres.writeFile({ fileName: outputPath })
  .then((file) => {
    console.log("✅ Presentation created:", file);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
