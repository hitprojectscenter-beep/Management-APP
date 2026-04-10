/**
 * Generate marketing brief in Hebrew (RTL) + English as .docx files.
 * Hebrew version: proper BiDi, RTL alignment, logo, section structure.
 * Run: node scripts/generate-brief-docx.js
 */
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
        Header, Footer, PageNumber, ImageRun, BorderStyle, PageBreak,
        ShadingType, WidthType, Table, TableRow, TableCell,
        VerticalAlign } = require("docx");
const fs = require("fs");
const path = require("path");

const BLUE = "1E5FA8";
const DARK = "1A1A2E";
const GRAY = "555555";
const LIGHT_BLUE = "E8F0FE";
const LIGHT_GRAY = "F5F5F5";

const logoPath = path.join(__dirname, "..", "public", "mapi-logo.png");
const logoData = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

// ============================================================
// Hebrew Brief (RTL)
// ============================================================
function createHebrewBrief() {
  const sections = [
    {
      icon: "🏢",
      title: "סקירה כללית",
      body: "Work OS היא פלטפורמת ניהול פרויקטים פנים-ארגונית שנבנתה במיוחד עבור המרכז למיפוי ישראל, ומגשרת על הפער בין אסטרטגיה לביצוע — במקום אחד, בעברית מלאה.",
    },
    {
      icon: "📊",
      title: "לוח גאנט ו-WBS",
      body: "לוח גאנט אינטראקטיבי עם תכנון מול ביצוע, נתיב קריטי, אבני דרך וחבילות עבודה (WBS) בהיררכיה של 8 רמות — מפורטפוליו ועד תת-משימה. כל שלב מציג פסים כפולים: תכנון (אפור) וביצוע (צבעוני לפי בריאות).",
      screenshot: "תצוגת גאנט עם WBS היררכי — כולל milestones, נתיב קריטי ופסי planned vs actual",
    },
    {
      icon: "🤖",
      title: "עוזר אישי מבוסס AI",
      body: "עוזר אישי חכם (Agentic AI) מאפשר לנהל את המערכת בדיבור או בכתיבה: לפתוח משימות, לשאול \"מה הסיכונים?\", ולקבל תשובות מיידיות עם נתונים אמיתיים. העוזר מזהה כוונות, משלים פערים בדיאלוג, ומבצע פעולות רק לאחר אישור המשתמש.",
      screenshot: "העוזר האישי — ממשק צ'אט עם זיהוי קולי, הצעות חכמות וכרטיס אישור לפני ביצוע",
    },
    {
      icon: "⚠️",
      title: "ניהול סיכונים פרואקטיבי",
      body: "מנוע AI סורק את כל המשימות ברצף, מזהה 5 סוגי סיכונים (איחור, חסימה, חריגה, התקדמות איטית, קריטי לא התחיל), ומפיק תוכנית גידור (Mitigation Plan) עם המלצות לשיבוץ מחדש על בסיס כישורים, זמינות וביצועים.",
      screenshot: "דף ניהול סיכונים — 14 סיכונים פעילים, המלצות AI, חיזוי תאריך סיום וצווארי בקבוק",
    },
    {
      icon: "📈",
      title: "דשבורדים מותאמי תפקיד",
      body: "KPIs שונים למנהל פרויקט (תפעולי: Velocity, Budget, Throughput) ולמנהל PMO (אסטרטגי: ROI, Alignment, Capacity, EVM). בורר תפקיד מחליף את כל הדשבורד בלחיצה.",
    },
    {
      icon: "🗂️",
      title: "4 תצוגות פרויקט",
      body: "רשימה, קנבן (Drag & Drop), גאנט, ויומן — לכל משתמש הסגנון שמתאים לו. כל התצוגות תומכות RTL מלא.",
    },
    {
      icon: "👥",
      title: "ניהול משתתפים ו-FTE",
      body: "מעקב אחר אחוזי משרה לכל חבר צוות בכל פרויקט, עם התרעה אוטומטית על הקצאת יתר מעל 80%. כל משתתף מוצג עם תפקיד, FTE, וצבע רמזור.",
    },
    {
      icon: "🔒",
      title: "הרשאות RBAC",
      body: "5 תפקידים (Admin, Manager, Member, Viewer, Guest) עם מטריצת הרשאות מלאה. מסך ניהול מערכת לאדמין — משתמשים, תפקידים, סוגי משימות ושיוך היררכי.",
    },
    {
      icon: "🌍",
      title: "רב-לשוניות ו-RTL",
      body: "עברית (RTL מלא כולל גאנט!), אנגלית, רוסית, צרפתית וספרדית. זיהוי שפה אוטומטי לפי מיקום המשתמש. בניגוד ל-Monday ו-ClickUp — ללא באגי עברית.",
    },
    {
      icon: "📱",
      title: "PWA לנייד וטאבלט",
      body: "אפליקציה מותאמת למובייל, iOS ו-Android — תפריט המבורגר, touch targets, safe-area. ניתנת להתקנה כאפליקציה native.",
    },
    {
      icon: "❓",
      title: "עזרה ולמידה",
      body: "סיור אינטראקטיבי של 12 שלבים ובוט עזרה עם 16 שאלות נפוצות. כל משתמש — מהמנכ\"ל ועד חבר צוות מתחיל — מתמצא תוך דקות.",
    },
  ];

  const children = [];

  // ---- Cover area ----
  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 200 },
      children: [new ImageRun({
        type: "png", data: logoData,
        transformation: { width: 140, height: 140 },
        altText: { title: "לוגו מפ\"י", description: "לוגו המרכז למיפוי ישראל", name: "mapi-logo" },
      })],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Work OS", bold: true, size: 56, color: BLUE, font: "Arial" })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { after: 80 },
    children: [new TextRun({
      text: "פלטפורמת ניהול פרויקטים של המרכז למיפוי ישראל",
      size: 28, color: DARK, font: "Arial", bold: true,
    })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { after: 300 },
    children: [new TextRun({
      text: "בריף שיווקי · אפריל 2026",
      size: 22, color: GRAY, font: "Arial", italics: true,
    })],
  }));

  // Divider
  children.push(new Paragraph({
    bidirectional: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 1 } },
    spacing: { after: 400 },
    children: [],
  }));

  // ---- Sections ----
  for (const section of sections) {
    // Section heading with icon
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 300, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE, space: 4 } },
      children: [
        new TextRun({ text: `${section.icon}  ${section.title}`, bold: true, size: 30, color: BLUE, font: "Arial" }),
      ],
    }));

    // Body text
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 160, line: 380 },
      children: [new TextRun({ text: section.body, size: 24, color: DARK, font: "Arial" })],
    }));

    // Screenshot placeholder (styled box with description)
    if (section.screenshot) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { before: 100, after: 200 },
        shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: BLUE, space: 8 },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: BLUE, space: 8 },
          left: { style: BorderStyle.SINGLE, size: 1, color: BLUE, space: 8 },
          right: { style: BorderStyle.SINGLE, size: 1, color: BLUE, space: 8 },
        },
        children: [
          new TextRun({ text: "📸 ", size: 20, font: "Arial" }),
          new TextRun({ text: section.screenshot, size: 20, color: BLUE, font: "Arial", italics: true }),
        ],
      }));
    }
  }

  // ---- Closing ----
  children.push(new Paragraph({
    bidirectional: true,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
    spacing: { before: 400, after: 200 },
    children: [],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { after: 100 },
    shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
    children: [new TextRun({
      text: "Work OS — כי ניהול פרויקטים ארגוני צריך להיות חכם, נגיש, ובעברית. 🇮🇱",
      bold: true, size: 26, color: BLUE, font: "Arial",
    })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    children: [new TextRun({
      text: "המרכז למיפוי ישראל · מפ\"י · 2026",
      size: 18, color: GRAY, font: "Arial", italics: true,
    })],
  }));

  return new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 40, bold: true, font: "Arial", color: BLUE },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0,
            bidirectional: true, alignment: AlignmentType.RIGHT } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Arial", color: BLUE },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1,
            bidirectional: true, alignment: AlignmentType.RIGHT } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1200, right: 1440, bottom: 1200, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [new TextRun({
              text: "Work OS — בריף שיווקי · המרכז למיפוי ישראל",
              size: 16, color: GRAY, font: "Arial", italics: true,
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [
              new TextRun({ text: "עמוד ", size: 16, color: GRAY, font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Arial" }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}

// ============================================================
// English Brief (same structure, LTR)
// ============================================================
function createEnglishBrief() {
  const paragraphs = [
    "Work OS is an internal project management platform built specifically for the Israel Mapping Center, bridging the gap between strategy and execution — in one place, with full Hebrew support.",
    "The system features an interactive Gantt chart with planned vs. actual tracking, critical path analysis, milestones, and an 8-level Work Breakdown Structure (WBS) — from portfolio down to subtask.",
    "An AI-powered Personal Assistant lets users manage the system by voice or text: create tasks, ask \"What are the risks?\", and receive instant answers with real project data.",
    "A proactive Risk Detection Engine continuously scans all tasks, identifies blockers, delays, and overruns — and generates a Mitigation Plan with smart reassignment recommendations based on skills, availability, and performance.",
    "Role-based dashboards display different KPIs for Project Managers (operational) and PMO Managers (strategic) — including Velocity, Budget, EVM (CPI/SPI), ROI, and RAG status.",
    "4 project views — List, Kanban (Drag & Drop), Gantt, and Calendar — enable each user to work in the style that suits them.",
    "FTE-based participant management tracks allocation per team member, with automatic warnings above 80%.",
    "RBAC with 5 roles and a full permissions matrix. Admin screen for users, roles, task types, and hierarchy.",
    "Full Hebrew RTL (including Gantt!), English, Russian, French, and Spanish. Auto locale detection by browser language.",
    "PWA optimized for mobile, tablet, iOS and Android. Installable as a native app.",
    "12-step interactive tour and Help Bot with 16 FAQs ensure every user gets oriented within minutes.",
    "Work OS — because enterprise project management should be smart, accessible, and in your language.",
  ];

  const children = [];

  if (logoData) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new ImageRun({
        type: "png", data: logoData,
        transformation: { width: 120, height: 120 },
        altText: { title: "Mapi Logo", description: "Israel Mapping Center Logo", name: "mapi-logo" },
      })],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Work OS — Marketing Brief", bold: true, size: 40, color: BLUE, font: "Arial" })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: "Israel Mapping Center · April 2026", size: 22, color: GRAY, font: "Arial", italics: true })],
  }));
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
    spacing: { after: 300 },
    children: [],
  }));

  for (const text of paragraphs) {
    children.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 200, line: 360 },
      children: [new TextRun({ text, size: 24, color: DARK, font: "Arial" })],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 300 },
    children: [new TextRun({ text: "Israel Mapping Center · 2026", size: 18, color: GRAY, font: "Arial", italics: true })],
  }));

  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, right: 1440, bottom: 1200, left: 1440 } },
      },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Work OS — Marketing Brief", size: 16, color: GRAY, font: "Arial", italics: true })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Page ", size: 16, color: GRAY, font: "Arial" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Arial" })] })] }) },
      children,
    }],
  });
}

async function main() {
  const outDir = path.join(__dirname, "..", "docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const heDoc = createHebrewBrief();
  const heBuffer = await Packer.toBuffer(heDoc);
  fs.writeFileSync(path.join(outDir, "Work-OS-Marketing-Brief-HE-v2.docx"), heBuffer);
  console.log("✅ Hebrew brief (RTL) generated");

  const enDoc = createEnglishBrief();
  const enBuffer = await Packer.toBuffer(enDoc);
  fs.writeFileSync(path.join(outDir, "Work-OS-Marketing-Brief-EN-v2.docx"), enBuffer);
  console.log("✅ English brief generated");
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
