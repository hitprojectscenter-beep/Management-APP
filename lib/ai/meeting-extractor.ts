/**
 * Meeting transcript / document → task list extractor.
 *
 * Use-cases:
 *   1) User pastes a meeting summary ("בסיכום פגישה הוחלט ש…X יכין מצגת,
 *      Y יכתוב מסמך אפיון, Z יענה ללקוח") and the system returns a structured
 *      list of tasks to review and confirm.
 *   2) Voice-driven flow: speech → text → extractTasksFromText.
 *
 * Strategy:
 *   - Try Gemini first (structured JSON output) — best for free-form text.
 *   - Heuristic fallback: split on action-bullet markers and verb cues.
 *   - Every extracted task is enriched with effort estimation +
 *     responsible-name override parsing, so the consumer gets actionable data.
 */

import { askGemini, isGeminiAvailable } from "./gemini";
import { estimateEffort } from "./effort-estimator";
import { parseResponsibleOverride } from "./role-hierarchy";

export interface ExtractedTask {
  /** Short title for the task */
  title: string;
  /** Full paragraph from the source describing this task — used as the
   *  pre-filled description so the user keeps all context from the source. */
  description?: string;
  /** Free-text assignee hint pulled from the source ("X" in "X יכין מצגת"). May be a name or a role. */
  assigneeHint?: string;
  /** ISO date when mentioned ("עד יום חמישי" → resolved date) */
  dueDate?: string;
  /** Estimated effort in hours (from effort-estimator) */
  estimateHours?: number;
  /** Short Hebrew label of the work type (e.g. "מצגת") */
  workTypeLabel?: string;
  /** Confidence 0..1 — heuristic always 0.5, AI usually higher */
  confidence: number;
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  /** ISO date detected in the document header / title (e.g. "27/06/2026"
   *  in a meeting summary). Used as the default plannedStart for every
   *  task that doesn't have its own start date. */
  documentDate?: string;
  /** Document title detected in the source (h1 / first heading / "סיכום
   *  פגישה — Salesforce 27.06.2026"). Used to build the source-label
   *  pre-filled into the task's "source" field. */
  documentTitle?: string;
}

/** Strip filler so the title fits in a task chip. */
function trimTitle(s: string, max = 120): string {
  const trimmed = s.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

/** Resolve relative dates ("עד יום חמישי", "by Thursday") to ISO. Conservative — returns undefined when unsure. */
function resolveDueDate(text: string, fromDate = new Date()): string | undefined {
  const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const WEEKDAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  // Hebrew: "עד יום חמישי", "ביום שלישי", "מחר", "בעוד שבוע"
  const heDay = WEEKDAYS_HE.findIndex((d) => new RegExp(`(?:עד|ב)\\s*יום\\s+${d}`).test(text));
  if (heDay >= 0) {
    const target = new Date(fromDate);
    const diff = (heDay - target.getDay() + 7) % 7 || 7;
    target.setDate(target.getDate() + diff);
    return target.toISOString().slice(0, 10);
  }
  const enDay = WEEKDAYS_EN.findIndex((d) => new RegExp(`by\\s+${d}`, "i").test(text));
  if (enDay >= 0) {
    const target = new Date(fromDate);
    const diff = (enDay - target.getDay() + 7) % 7 || 7;
    target.setDate(target.getDate() + diff);
    return target.toISOString().slice(0, 10);
  }
  if (/מחר|tomorrow/i.test(text)) {
    const t = new Date(fromDate);
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  const weekMatch = text.match(/בעוד\s+(\d+)\s+(?:ימים|שבועות)/);
  if (weekMatch) {
    const num = parseInt(weekMatch[1], 10);
    const t = new Date(fromDate);
    const isWeeks = /שבועות/.test(weekMatch[0]);
    t.setDate(t.getDate() + (isWeeks ? num * 7 : num));
    return t.toISOString().slice(0, 10);
  }
  return undefined;
}

/** Heuristic: split text into action sentences and pull out structure per line. */
export function extractTasksHeuristic(text: string): ExtractedTask[] {
  if (!text) return [];
  // Split into action lines: bullets, numbered list, or sentences with action verbs
  const lines = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((l) => l.trim().replace(/^[\d.\-•·*●▪◦►]+\s*/, ""))
    .filter(Boolean);

  // Match infinitive forms (לכתוב), future tense (יכתוב/תכתוב/יכתבו), and English verbs.
  // Hebrew future tense prefixes: י/ת/א/נ + 2-3 root letters.
  const actionRe = new RegExp(
    [
      // Hebrew infinitive
      "ל(?:הכין|כתוב|סכם|ייצר|שלוח|העביר|הציג|בצע|פתוח|בדוק|אסוף|תאם|החזיר|עדכן|אשר|פנות|דאוג|טפל|הכניס|פרסם|הזמין)",
      // Hebrew future tense — common 3-letter & 4-letter roots
      "(?:י|ת|נ|א)(?:כין|כתוב|סכם|ייצר|שלח|עביר|ציג|בצע|פתח|בדוק|אסוף|תאם|חזיר|עדכן|אשר|פנה|דאג|טפל|הכניס|פרסם|הזמין|כתבו|סכמו|ענה|ענו|לך|לכו)",
      // English
      "(?:prepare|write|create|send|review|submit|follow up|coordinate|deliver|reply|respond|present|draft)",
    ].join("|"),
    "i"
  );
  const out: ExtractedTask[] = [];
  for (const line of lines) {
    if (!actionRe.test(line)) continue;
    const responsibleHint = parseResponsibleOverride(line) ?? undefined;
    // Title: take up to the responsible-hint segment or up to ~100 chars
    const title = trimTitle(line.replace(/(?:אחראי|אחראית|אחריות|responsible|assign(?:ed)?\s+to|owner)[^.]*/i, ""));
    out.push({
      title,
      // Always keep the full source paragraph as the description so the user
      // sees the original wording, not just the trimmed title.
      description: line,
      assigneeHint: responsibleHint,
      dueDate: resolveDueDate(line),
      confidence: 0.5,
    });
  }
  return out;
}

/** Heuristic detector for document-level title + date — used when Gemini
 *  isn't available or doesn't populate the fields. */
function detectDocumentMeta(text: string): { documentDate?: string; documentTitle?: string } {
  const out: { documentDate?: string; documentTitle?: string } = {};
  // First non-empty line is treated as the document title.
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length) {
    out.documentTitle = lines[0]
      .replace(/^#+\s*/, "") // drop leading markdown heading hashes
      .slice(0, 120);
  }
  // Match common Hebrew/EU date formats in the top portion of the document.
  const head = text.slice(0, 1500);
  // 27.06.2026 / 27/06/2026 / 27-06-2026
  let m = head.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    out.documentDate = `${y}-${mo}-${d}`;
  } else {
    // ISO 2026-06-27
    m = head.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (m) {
      out.documentDate = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    }
  }
  return out;
}

/** Main entry. AI when available, heuristic fallback. */
export async function extractTasksFromText(text: string, lang = "he"): Promise<ExtractionResult> {
  if (!text || !text.trim()) return { tasks: [] };

  let extracted: ExtractedTask[] = [];
  const documentMeta: { documentDate?: string; documentTitle?: string } = {};

  if (isGeminiAvailable()) {
    try {
      const prompt = `אתה עוזר בניתוח סיכומי פגישות / מסמכים לרשימת משימות מבנית.
החזר JSON בלבד בפורמט אובייקט עם שני שדות:
{
  "documentDate": "YYYY-MM-DD אם נמצא תאריך בכותרת המסמך, אחרת ריק",
  "documentTitle": "כותרת המסמך/הפגישה אם מופיעה (לדוגמה: 'סיכום פגישה Salesforce')",
  "tasks": [
    {
      "title": "כותרת משימה קצרה ברורה",
      "description": "הפסקה השלמה ממקור המסמך שמדברת על המשימה הזו (לא לסכם — להעתיק כפי שכתוב)",
      "assigneeHint": "השם או התפקיד שמופיע במסמך כאחראי על המשימה — בדיוק כפי שכתוב",
      "dueDate": "YYYY-MM-DD אם נאמר תאריך יעד",
      "workTypeLabel": "מצגת/מסמך אפיון/מכתב/דוח/סיכום פגישה/מענה ללקוח/הכנה לפגישה/אחר"
    }
  ]
}
חוקים:
- חלץ רק משימות מפורשות (לא דעות, לא חזון).
- description = הפסקה המלאה ממקור המסמך, לא סיכום שלך.
- assigneeHint = הטקסט המלא של האחראי במסמך (שם + תפקיד אם יש).
- תאריכים יחסיים ("עד יום חמישי") → תאריך ISO לפי היום ${new Date().toISOString().slice(0, 10)}.
- מקסימום 20 משימות.

הטקסט:
${text.slice(0, 6000)}`;
      const reply = await askGemini(prompt, "", lang);
      // Accept both object-shape and legacy array-shape responses for backward compat
      const objMatch = reply.match(/\{[\s\S]*\}/);
      const arrMatch = reply.match(/\[[\s\S]*\]/);
      const raw = objMatch ? JSON.parse(objMatch[0]) : arrMatch ? { tasks: JSON.parse(arrMatch[0]) } : null;
      if (raw) {
        if (raw.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(raw.documentDate)) documentMeta.documentDate = raw.documentDate;
        if (raw.documentTitle && typeof raw.documentTitle === "string") documentMeta.documentTitle = String(raw.documentTitle).slice(0, 120);
        const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : Array.isArray(raw) ? raw : [];
        extracted = tasksRaw
          .filter((t: any) => typeof t?.title === "string" && t.title.trim().length > 0)
          .slice(0, 20)
          .map((t: any) => ({
            title: trimTitle(String(t.title)),
            description: t.description ? String(t.description) : undefined,
            assigneeHint: t.assigneeHint ? String(t.assigneeHint) : undefined,
            dueDate: t.dueDate ? String(t.dueDate) : undefined,
            workTypeLabel: t.workTypeLabel ? String(t.workTypeLabel) : undefined,
            confidence: 0.8,
          }));
      }
    } catch (err) {
      console.warn("[meeting-extractor] Gemini failed, using heuristic:", err);
    }
  }

  if (extracted.length === 0) {
    extracted = extractTasksHeuristic(text);
  }

  // De-duplicate: every task must have a unique title. Identical titles
  // (case-insensitive, after whitespace collapse) are merged. If Gemini
  // returned the same title for several action lines, we keep the first
  // occurrence and discard the rest. Titles that differ only by a trailing
  // period or whitespace count as the same.
  const seen = new Map<string, ExtractedTask>();
  for (const task of extracted) {
    const norm = task.title.toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim();
    if (!norm) continue;
    if (!seen.has(norm)) {
      seen.set(norm, task);
    } else {
      // Merge missing fields into the kept task so we don't lose context
      const kept = seen.get(norm)!;
      if (!kept.assigneeHint && task.assigneeHint) kept.assigneeHint = task.assigneeHint;
      if (!kept.dueDate && task.dueDate) kept.dueDate = task.dueDate;
      if (!kept.description && task.description) kept.description = task.description;
      if (!kept.workTypeLabel && task.workTypeLabel) kept.workTypeLabel = task.workTypeLabel;
    }
  }
  extracted = Array.from(seen.values());

  // Enrich each task with an effort estimate (uses catalog — instant, no API call)
  for (const task of extracted) {
    const est = await estimateEffort({ title: task.title, description: task.description, lang });
    task.estimateHours = est.hours;
    if (est.matchedLabel && !task.workTypeLabel) {
      task.workTypeLabel = est.matchedLabel.he;
    }
  }

  // Fall back to heuristic document meta if Gemini didn't fill them
  const fallbackMeta = detectDocumentMeta(text);
  if (!documentMeta.documentDate && fallbackMeta.documentDate) documentMeta.documentDate = fallbackMeta.documentDate;
  if (!documentMeta.documentTitle && fallbackMeta.documentTitle) documentMeta.documentTitle = fallbackMeta.documentTitle;

  return { tasks: extracted, ...documentMeta };
}
