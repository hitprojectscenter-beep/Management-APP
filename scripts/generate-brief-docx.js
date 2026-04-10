/**
 * Generate marketing brief in Hebrew + English as .docx files.
 * Run: node scripts/generate-brief-docx.js
 */
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
        Header, Footer, PageNumber, ImageRun, BorderStyle, PageBreak } = require("docx");
const fs = require("fs");
const path = require("path");

const BLUE = "1E5FA8";
const DARK = "1A1A2E";
const GRAY = "555555";

// Read logo
const logoPath = path.join(__dirname, "..", "public", "mapi-logo.png");
const logoData = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

function createBrief(lang) {
  const isHe = lang === "he";

  const title = isHe
    ? "Work OS — פלטפורמת ניהול פרויקטים של המרכז למיפוי ישראל"
    : "Work OS — Project Management Platform of the Israel Mapping Center";

  const subtitle = isHe ? "בריף שיווקי" : "Marketing Brief";

  const paragraphs = isHe ? [
    "Work OS היא פלטפורמת ניהול פרויקטים פנים-ארגונית שנבנתה במיוחד עבור המרכז למיפוי ישראל, ומגשרת על הפער בין אסטרטגיה לביצוע — במקום אחד, בעברית מלאה.",
    "המערכת מציגה לוח גאנט אינטראקטיבי עם תכנון מול ביצוע, נתיב קריטי, אבני דרך וחבילות עבודה (WBS) בהיררכיה של 8 רמות — מפורטפוליו ועד תת-משימה.",
    "עוזר אישי מבוסס AI מאפשר לנהל את המערכת בדיבור או בכתיבה: לפתוח משימות, לשאול \"מה הסיכונים?\", ולקבל תשובות מיידיות עם נתונים אמיתיים מהפרויקטים.",
    "מנוע זיהוי סיכונים פרואקטיבי סורק את כל המשימות ברצף, מזהה חסימות, איחורים וחריגות — ומפיק תוכנית גידור (Mitigation Plan) עם המלצות אקטיביות לשיבוץ מחדש חכם על בסיס כישורים, זמינות וביצועים.",
    "דשבורדים מותאמי תפקיד מציגים KPIs שונים למנהל פרויקט (תפעולי) ולמנהל PMO (אסטרטגי) — כולל Velocity, Budget Adherence, EVM, ROI ו-RAG.",
    "המערכת כוללת 4 תצוגות פרויקט — רשימה, קנבן (Drag & Drop), גאנט, ויומן — שמאפשרות לכל משתמש לעבוד בסגנון שמתאים לו.",
    "ניהול משתתפים עם FTE עוקב אחר אחוזי משרה לכל חבר צוות בכל פרויקט, ומתריע אוטומטית על הקצאת יתר מעל 80%.",
    "מערכת RBAC עם 5 תפקידים ומטריצת הרשאות מלאה מבטיחה שכל משתמש רואה ופועל רק בהתאם לסמכויותיו.",
    "מסך ניהול מערכת מאפשר לאדמין לנהל משתמשים, להגדיר תפקידים, ליצור סוגי משימות מותאמים, ולשייך פרויקטים לפרוגרמות — הכל מממשק אחד.",
    "המערכת תומכת בעברית RTL מלאה (כולל גאנט!) ובאנגלית, רוסית, צרפתית וספרדית, עם החלפת שפה בלחיצה אחת.",
    "אפליקציית PWA מותאמת לנייד, טאבלט, iOS ו-Android — כולל תפריט המבורגר, touch targets, ותמיכה ב-safe-area של iPhone.",
    "סיור אינטראקטיבי של 12 שלבים ובוט עזרה עם 16 שאלות נפוצות מבטיחים שכל משתמש — מהמנכ\"ל ועד חבר הצוות המתחיל — מתמצא במערכת תוך דקות.",
    "Work OS — כי ניהול פרויקטים ארגוני צריך להיות חכם, נגיש, ובעברית.",
  ] : [
    "Work OS is an internal project management platform built specifically for the Israel Mapping Center, bridging the gap between strategy and execution — in one place, with full Hebrew support.",
    "The system features an interactive Gantt chart with planned vs. actual tracking, critical path analysis, milestones, and an 8-level Work Breakdown Structure (WBS) — from portfolio down to subtask.",
    "An AI-powered Personal Assistant lets users manage the system by voice or text: create tasks, ask \"What are the risks?\", and receive instant answers with real project data.",
    "A proactive Risk Detection Engine continuously scans all tasks, identifies blockers, delays, and overruns — and generates a Mitigation Plan with smart reassignment recommendations based on skills, availability, and performance history.",
    "Role-based dashboards display different KPIs for Project Managers (operational) and PMO Managers (strategic) — including Velocity, Budget Adherence, EVM metrics (CPI/SPI), ROI, and RAG status.",
    "The system includes 4 project views — List, Kanban (Drag & Drop), Gantt, and Calendar — enabling each user to work in the style that suits them best.",
    "FTE-based participant management tracks allocation percentages per team member per project, with automatic warnings when allocations exceed the 80% safety threshold.",
    "An RBAC system with 5 roles and a full permissions matrix ensures every user sees and acts only within their authority level.",
    "An Admin Management screen allows administrators to manage users, define roles, create custom task types, and assign projects to programs — all from a single interface.",
    "The platform supports full Hebrew RTL (including Gantt!), English, Russian, French, and Spanish, with one-click language switching and automatic geo-based locale detection.",
    "A PWA app optimized for mobile, tablet, iOS, and Android — with a hamburger menu, touch-friendly targets, and iPhone safe-area support.",
    "A 12-step interactive tour and a Help Bot with 16 FAQs ensure every user — from the CEO to the newest team member — gets oriented within minutes.",
    "Work OS — because enterprise project management should be smart, accessible, and in your language.",
  ];

  const children = [];

  // Logo
  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new ImageRun({
        type: "png",
        data: logoData,
        transformation: { width: 120, height: 120 },
        altText: { title: "Mapi Logo", description: "Israel Mapping Center Logo", name: "mapi-logo" },
      })],
    }));
  }

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: title, bold: true, size: 36, color: BLUE, font: "Arial" })],
  }));

  // Subtitle
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: subtitle, size: 28, color: GRAY, font: "Arial", italics: true })],
  }));

  // Divider
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
    spacing: { after: 300 },
    children: [],
  }));

  // Body paragraphs
  for (const text of paragraphs) {
    children.push(new Paragraph({
      alignment: isHe ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: 200, line: 360 },
      children: [new TextRun({ text, size: 24, color: DARK, font: "Arial" })],
    }));
  }

  // Footer divider
  children.push(new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 1 } },
    spacing: { before: 400, after: 100 },
    children: [],
  }));

  // Footer text
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: isHe ? "המרכז למיפוי ישראל · אפריל 2026" : "Israel Mapping Center · April 2026",
      size: 18, color: GRAY, font: "Arial", italics: true,
    })],
  }));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: BLUE },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: "Work OS — Marketing Brief",
              size: 16, color: GRAY, font: "Arial", italics: true,
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: isHe ? "עמוד " : "Page ", size: 16, color: GRAY, font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Arial" }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return doc;
}

async function main() {
  const outDir = path.join(__dirname, "..", "docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Hebrew
  const heDoc = createBrief("he");
  const heBuffer = await Packer.toBuffer(heDoc);
  const hePath = path.join(outDir, "Work-OS-Marketing-Brief-HE.docx");
  fs.writeFileSync(hePath, heBuffer);
  console.log("✅ Hebrew:", hePath);

  // English
  const enDoc = createBrief("en");
  const enBuffer = await Packer.toBuffer(enDoc);
  const enPath = path.join(outDir, "Work-OS-Marketing-Brief-EN.docx");
  fs.writeFileSync(enPath, enBuffer);
  console.log("✅ English:", enPath);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
