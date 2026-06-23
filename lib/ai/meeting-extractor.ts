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
/**
 * Conversational fillers that show up at the start of audio transcripts.
 * Stripped from a candidate title before we measure word count, so an
 * opening like "אהלן אביה ערב טוב מה שלומך התבקשתי להחליט" gets reduced
 * to the actionable verb-noun phrase.
 */
const HE_FILLERS = [
  "אהלן", "שלום", "ערב טוב", "בוקר טוב", "צהריים טובים", "לילה טוב",
  "מה שלומך", "מה נשמע", "מה קורה", "אוקיי", "אוקי", "אה", "אהמ",
  "תראי", "תראה", "כן", "לא", "תקשיב", "תקשיבי", "אז", "אז ככה",
  "קודם כל", "בעצם", "כאילו", "נו", "טוב",
];
const EN_FILLERS = [
  "hello", "hi", "hey", "good morning", "good evening", "good afternoon",
  "ok", "okay", "uh", "um", "ah", "well", "so", "like", "you know",
  "right", "alright", "listen",
];

/** Strip leading conversational fillers from a candidate title. */
function stripFillers(s: string): string {
  let out = s.replace(/^[\s,.\-—–:!?…]+/, "").trim();
  const all = [...HE_FILLERS, ...EN_FILLERS].sort((a, b) => b.length - a.length);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of all) {
      // Match the filler at the start, optionally followed by comma/period/space
      const re = new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[\\s,.\\-—–:!?…]*`, "i");
      if (re.test(out)) {
        out = out.replace(re, "").trim();
        changed = true;
        break;
      }
    }
  }
  return out;
}

/**
 * Squeeze a candidate title into a short, meaningful headline (≤ 8 words,
 * ≤ 60 chars). Specifically designed for audio-transcript inputs where
 * the "title" arriving from a weak extractor is the whole opening
 * monologue — we strip fillers, take the first sentence, and cap word
 * count so the UI shows a real headline instead of "אהלן אביה ערב טוב…".
 */
function trimTitle(s: string, maxWords = 5, maxChars = 50): string {
  const trimmed = s.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  // First, take just the first sentence (any of . ? ! ;)
  const firstSentence = trimmed.split(/[.!?;]\s+/)[0];

  // Drop conversational openers if present
  const cleaned = stripFillers(firstSentence) || firstSentence;

  // Cap on words
  const words = cleaned.split(/\s+/).filter(Boolean);
  let out = words.slice(0, maxWords).join(" ");

  // Cap on chars as a hard ceiling for very long single words
  if (out.length > maxChars) {
    out = out.slice(0, maxChars - 1).trim() + "…";
  } else if (words.length > maxWords) {
    out = out + "…";
  }
  return out;
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

/**
 * Heuristic: split text into action sentences and pull out structure per line.
 *
 * Wider net than the previous version — catches:
 *  • Infinitive forms ("לכתוב", "להכין", "להעביר", "to prepare")
 *  • Future tense including 2nd/3rd-person plural ("יכינו", "תכתבו", "ננסה")
 *  • Imperatives ("הכן", "כתוב", "תאם")
 *  • Deliverable nouns introducing an implicit task ("דוח שבועי", "מצגת",
 *    "מסמך אפיון", "פגישה עם...") — these almost always imply someone
 *    needs to produce them.
 *  • Decision markers ("הוחלט ש…", "סוכם ש…", "נקבע ש…") — what's after
 *    them is virtually always a task.
 *  • Hebrew responsible-followed-by-task pattern ("X ידאג ל…", "Y תכין את…").
 */
export function extractTasksHeuristic(text: string): ExtractedTask[] {
  if (!text) return [];
  // Prefer PARAGRAPH boundaries (\n\n+) over sentence boundaries — a single
  // task is typically discussed across several sentences in the same
  // paragraph ("X יכין מצגת. את המצגת יש להגיש עד..."). Treating each
  // paragraph as one task drastically reduces fragmentation. Markdown
  // bullets ("- ...") and numbered list items ("1. ...") also count as
  // paragraph separators because each bullet is a distinct action item.
  const blocks: string[] = [];
  for (const para of text.split(/\n\s*\n+/)) {
    // Inside a paragraph, split before any list-item marker at the start
    // of a line: numbers (1. 2)), bullets, Hebrew-letter ordinals
    // ("א." "ב." "ג.") and roman numerals ("i." "ii." "iv."). Hebrew
    // meeting docs nest items under א/ב/ג and i/ii — without splitting on
    // those, a whole multi-item section collapsed into one giant block
    // and the title became a header fragment ("משימות להמשך: א").
    const bulleted = para.split(/\n\s*(?=(?:\d+[.)]|[א-ת][.)]|[ivxIVX]{1,4}[.)]|[\-•·*●▪◦►])\s+)/);
    for (const b of bulleted) blocks.push(b.trim());
  }
  const lines = blocks
    .map((l) =>
      l
        // Strip leading list markers of every flavor we've seen in real
        // Hebrew meeting docs: "(1)" / "1." / "2)" numerics, bullets,
        // Hebrew-letter ordinals ("א." "ב." "ג.") and roman numerals
        // ("i." "ii." "iv."). Repeated so a nested "(1) א." prefix is
        // fully removed — without this the title for "א. סטאטוס…" became
        // just the bare letter "א".
        .replace(/^(?:\(?\d+[.)]\s*|[#\-•·*●▪◦►]+\s*|[א-ת][.)]\s+|[ivxIVX]{1,4}[.)]\s+)+/, "")
        .trim()
    )
    .filter((l) => l.length >= 4);

  // Hebrew verb stems — the most common task-bearing roots, written WITHOUT
  // their prefix so we can match all conjugations (infinitive ל-, future
  // י/ת/נ/א-, imperative as-is).
  const HE_VERB_STEMS = [
    "כין", "כתוב", "כתב", "סכם", "ייצר", "צור", "שלוח", "שלח", "עביר", "ציג",
    "בצע", "פתוח", "פתח", "בדוק", "בדק", "אסוף", "תאם", "חזיר", "עדכן", "אשר",
    "פנה", "פנות", "דאג", "טפל", "פרסם", "הזמין", "ענה", "ענו", "השלים",
    "הקים", "הוביל", "ארגן", "תכנן", "ייעץ", "ייסד", "מנה", "קבע", "מצא",
    "בנה", "הציג", "בדק", "אישר", "ספק", "סקור", "מסר", "החזיר", "פתר",
    "ערך", "ניתח", "אסף", "כנס", "כינס", "התקין", "ייעל",
  ];
  // English verbs commonly used in meeting minutes
  const EN_VERBS = [
    "prepare", "write", "create", "send", "review", "submit", "follow up",
    "coordinate", "deliver", "reply", "respond", "present", "draft", "build",
    "design", "schedule", "approve", "investigate", "analyze", "audit",
    "publish", "verify", "validate", "deploy", "ship", "fix", "update",
    "communicate", "collect", "compile", "summarize", "research", "test",
  ];
  // Pi'el / hif'il past tense — these don't fit the simple י/ת/נ/א + stem
  // pattern (they have an inserted 'י' between root letters: תיאם, סיכם,
  // כינס, פירסם, etc.). Enumerated explicitly so we don't miss action lines
  // like "אסתר תיאם פגישה" or "הצוות סיכם את הנושא".
  const HE_PIEL_PAST = [
    "תיאם", "תיאמה", "תיאמו", "כינס", "כינסה", "כינסו", "סיכם", "סיכמה",
    "סיכמו", "פירסם", "פירסמה", "פירסמו", "אישר", "אישרה", "אישרו", "ביקש",
    "ביקשה", "ביקשו", "ייצר", "ייצרה", "ייצרו", "ייעץ", "ייעצה", "ייעצו",
    "דיווח", "דיווחה", "דיווחו", "סיים", "סיימה", "סיימו", "דיבר", "דיברה",
    "דיברו", "ביצע", "ביצעה", "ביצעו", "בירר", "ביררה", "ביררו", "הכין",
    "הכינה", "הכינו", "העביר", "העבירה", "העבירו", "הזמין", "הזמינה",
    "הזמינו", "הכניס", "הכניסה", "הכניסו", "פתח", "פתחה", "פתחו", "סקר",
    "סקרה", "סקרו", "ניתח", "ניתחה", "ניתחו",
  ];

  // Decision markers — "הוחלט ש…", "סוכם ש…" — what follows is almost
  // always a task. These count as task-indicators on their own.
  const HE_DECISION_MARKER = /(?:הוחלט\s+(?:ש|כי|להמשיך)|סוכם\s+ש|נקבע\s+ש|אנחנו\s+(?:צריכים|חייבים|נעשה)|need\s+to|must|should|action\s+item)/i;

  // Detector for boring document-meta lines we want to SKIP entirely:
  // a date+title header ("סיכום פגישה Salesforce 27.06.2026"), a section
  // heading ("נושאים:"), a bare noun phrase with no verb.
  const HEADER_ONLY = /^(?:סיכום\s+פגישה|נושאים|רקע|מבוא|סדר\s+יום|agenda|summary|introduction)\b[^.]*[:—–-]?\s*$/i;

  // Lines that OPEN a background / context / administrative section are
  // narration, never action items — even when content continues on the
  // same line ("רקע: בתאריך 11.6.2025 התקיימה פגישה…"). User feedback:
  // a "רקע" section was being extracted as a task.
  const BACKGROUND_PREFIX = /^(?:רקע|כללי|מבוא|הקדמה|הנדון|בנדון|סדר\s+יום|נוכחים|משתתפים|נושאים\s+שעלו|להלן\s+הנושאים|background|agenda|attendees|present\b|general|introduction|context|minutes)/i;

  // Status / reporting lines ("סטאטוס X", "status of Y", "עדכון בנושא…")
  // describe a state, not an action to perform. Skip them.
  const STATUS_PREFIX = /^(?:סטאטוס|סטטוס|status\b|update\s+on|עדכון\s+(?:בנושא|לגבי|על))/i;

  // A "title" that is just an ordinal letter / roman numeral / number is a
  // list artifact, not a task name ("א", "ii", "3").
  const BARE_ORDINAL = /^(?:[א-ת]|[ivxlcdm]+|\d+)$/i;

  const heStems = HE_VERB_STEMS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Only real verbs (infinitive / future / imperative / past). Deliverable
  // nouns used to be here too, but they kept catching headers like
  // "סיכום פגישה — Salesforce" — too noisy.
  const actionRe = new RegExp(
    [
      `ל(?:${heStems})`,              // infinitive: לכתוב
      `(?:י|ת|נ|א)(?:${heStems})`,     // future: יכתוב / תכתבו
      `(?:${heStems})ו?\\b`,           // imperative/past: כתוב / כתבו
      HE_PIEL_PAST.join("|"),          // pi'el past: תיאם, סיכם, כינס...
      EN_VERBS.join("|"),
    ].join("|"),
    "i"
  );

  const out: ExtractedTask[] = [];
  for (const line of lines) {
    if (line.length < 8) continue;
    if (HEADER_ONLY.test(line)) continue;
    // Skip narration: background/context sections and status reports are
    // not tasks (user feedback: "רקע" and section letters were extracted
    // as tasks; a task should be an activity to perform).
    if (BACKGROUND_PREFIX.test(line)) continue;
    if (STATUS_PREFIX.test(line)) continue;
    if (!actionRe.test(line) && !HE_DECISION_MARKER.test(line)) continue;
    // Strip leading "הוחלט ש" / "סוכם ש" so the title reads as the action,
    // not as the meta-decision.
    const cleaned = line
      .replace(/^(?:הוחלט\s+(?:ש|כי)\s+|סוכם\s+ש\s+|נקבע\s+ש\s+)/, "")
      .trim();
    const responsibleHint = parseResponsibleOverride(cleaned) ?? undefined;
    // Title strips trailing "אחראי X" suffix so it's a clean task name.
    const title = trimTitle(
      cleaned.replace(/(?:אחראי|אחראית|אחריות|responsible|assign(?:ed)?\s+to|owner)[^.]*/i, "")
    );
    // Reject artifact titles: a bare ordinal/number, or a fragment with
    // fewer than two meaningful words. A real task title is a verb-phrase
    // of 2+ words ("הכנת דוח", "תיאום פגישה") — not "א" or "3".
    const trimmedTitle = title.trim();
    if (BARE_ORDINAL.test(trimmedTitle)) continue;
    const meaningfulWords = trimmedTitle
      .split(/\s+/)
      .filter((w) => w.replace(/[.,;:'"()]/g, "").length > 1);
    if (meaningfulWords.length < 2) continue;
    out.push({
      title,
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

/**
 * Build the Gemini extraction prompt for ONE chunk of source text.
 * Kept as its own function so we can call it many times for long documents
 * (chunking) and pool the results.
 */
function buildGeminiExtractionPrompt(text: string, isFirstChunk: boolean): string {
  const today = new Date().toISOString().slice(0, 10);
  return `אתה אנליסט פגישות בכיר. תפקידך: לקרוא טקסט חופשי — סיכום פגישה, מסמך, תעתיק שמע — ולחלץ ממנו את **המשימות הברורות לביצוע** בלבד. משימה היא **פעולה שמישהו צריך לבצע** — לא רקע, לא סטאטוס, לא תיאור של מה שכבר קרה. כשמשהו אינו פעולה ברורה — אל תכלול אותו. עדיף להחזיר 3 משימות אמיתיות מאשר 9 שכוללות רקע וכותרות.

החזר JSON בלבד (ללא טקסט נוסף) בפורמט הזה בדיוק:
{
  ${isFirstChunk ? `"documentDate": "YYYY-MM-DD אם הופיע תאריך בכותרת/בראש המסמך, אחרת \\"\\""` : `"documentDate": ""`},
  ${isFirstChunk ? `"documentTitle": "כותרת המסמך/הפגישה אם הופיעה (לדוגמה: \\"סיכום פגישה — Salesforce, 27.06.2026\\")"` : `"documentTitle": ""`},
  "tasks": [
    {
      "title": "כותרת מסכמת של עד 5-6 מילים שמתארת את הפעולה - לא ציטוט של המקור. דוגמאות טובות: 'הכנת דוח רבעוני', 'תיאום פגישה עם הספק', 'בדיקת אינטגרציית Salesforce'. אסור: ציטוט של פתיחה שיחתית ('אהלן, ערב טוב, התבקשתי...')",
      "description": "הפסקה המקורית ממקור המסמך שמדברת על המשימה — להעתיק את הטקסט המקורי כפי שהוא, בלי לסכם ובלי לקצר. אם המשימה משתרעת על כמה משפטים — להעתיק את כולם",
      "assigneeHint": "שם האחראי או התפקיד כפי שהוא כתוב במסמך — בלי לפרש (אם לא צוין מי האחראי, השאר \\"\\")",
      "dueDate": "YYYY-MM-DD אם הוזכר תאריך יעד מפורש; אם הוזכר תאריך יחסי (\\"עד יום חמישי\\", \\"בעוד שבועיים\\") — תרגם אותו ל-ISO לפי היום ${today}; אם לא הוזכר — השאר \\"\\"",
      "workTypeLabel": "אחד מאלה: מצגת / מסמך אפיון / מכתב / דוח / סיכום פגישה / מענה ללקוח / הכנה לפגישה / פיתוח / בדיקה / תיאום / סקירה / החלטה / אחר"
    }
  ]
}

**מה לכלול כמשימה:**
✓ פעולות ברורות עם פועל ("X יכין מצגת", "Y תכתוב מסמך אפיון")
✓ החלטות שמובילות לפעולה ("הוחלט שנפנה לספק החדש", "סוכם להעביר את הנתונים")
✓ deliverables שמישהו צריך להפיק ("צריך דוח שבועי", "נדרשת מצגת לדירקטוריון")
✓ בקשות והתחייבויות ("נביא תשובה עד יום חמישי", "אבדוק ואחזור")
✓ סעיפי action items בסיכומי פגישות

**מה לא לכלול (חשוב מאוד — אלה לא משימות):**
✗ **סעיף "רקע" / "כללי" / "מבוא" / "הנדון"** — תיאור הקשר, לא פעולה
✗ **שורות סטאטוס** ("סטאטוס פעילות IR", "סטאטוס פרויקטי ענן") — דיווח מצב, לא פעולה
✗ כותרות וכותרות-משנה ("נושאים שעלו", "להלן הנושאים")
✗ אותיות/מספרי סעיף בלבד ("א", "ii") — אלה סימני רשימה, לא משימות
✗ דעות, אבחנות, רקע כללי שאינו דורש פעולה
✗ מידע שכבר נעשה ("פגשנו את הלקוח אתמול", "התקיימה פגישה")
✗ חזון/אסטרטגיה ברמת על

**מבחן פשוט:** אם אי אפשר לכתוב את הפריט כ"מי עושה מה" — זו לא משימה.
- "סטאטוס הצגת ממצאי מבדק" → לא משימה (זה כותרת/סטאטוס)
- "אלעד יציג את ממצאי המבדק עד יום חמישי" → משימה ✓

**חוקים נוקשים:**
- description = פסקה מקורית מהמסמך, לא סיכום שלך. אם המשימה מוזכרת ב-3 משפטים — להעתיק את שלושתם.
- אם אותה משימה מוזכרת בכמה מקומות — לאחד לרשומה אחת.
- title חייב להיות שונה לכל משימה. אסור 2 משימות עם אותה כותרת.
- מקסימום 50 משימות בתגובה.

הטקסט לחילוץ:
${text}`;
}

/**
 * Split a long source text into overlapping chunks suitable for Gemini.
 * Overlap prevents losing a task that straddles a chunk boundary.
 */
function chunkText(text: string, chunkSize = 12_000, overlap = 600): string[] {
  if (text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    // Try to break on a paragraph or sentence boundary near `end`
    let cut = end;
    if (end < text.length) {
      const tail = text.slice(end - 400, end);
      const lastBreak = Math.max(tail.lastIndexOf("\n\n"), tail.lastIndexOf("\n"), tail.lastIndexOf(". "), tail.lastIndexOf("? "), tail.lastIndexOf("! "));
      if (lastBreak > 0) cut = end - 400 + lastBreak;
    }
    chunks.push(text.slice(start, cut));
    if (cut >= text.length) break;
    start = Math.max(cut - overlap, start + 1);
  }
  return chunks;
}

/** Parse a single Gemini JSON reply into typed tasks + meta. */
function parseGeminiReply(reply: string): {
  tasks: ExtractedTask[];
  documentDate?: string;
  documentTitle?: string;
} {
  const objMatch = reply.match(/\{[\s\S]*\}/);
  const arrMatch = reply.match(/\[[\s\S]*\]/);
  const raw = objMatch
    ? JSON.parse(objMatch[0])
    : arrMatch
    ? { tasks: JSON.parse(arrMatch[0]) }
    : null;
  if (!raw) return { tasks: [] };
  const out: { tasks: ExtractedTask[]; documentDate?: string; documentTitle?: string } = { tasks: [] };
  if (raw.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(raw.documentDate)) out.documentDate = raw.documentDate;
  if (raw.documentTitle && typeof raw.documentTitle === "string") out.documentTitle = String(raw.documentTitle).slice(0, 120);
  const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : Array.isArray(raw) ? raw : [];
  out.tasks = tasksRaw
    .filter((t: any) => typeof t?.title === "string" && t.title.trim().length > 0)
    .slice(0, 50)
    .map((t: any) => ({
      title: trimTitle(String(t.title)),
      description: t.description ? String(t.description) : undefined,
      assigneeHint: t.assigneeHint ? String(t.assigneeHint) : undefined,
      dueDate: t.dueDate ? String(t.dueDate) : undefined,
      workTypeLabel: t.workTypeLabel ? String(t.workTypeLabel) : undefined,
      confidence: 0.85,
    }));
  return out;
}

/** Main entry. AI when available, heuristic fallback. */
export async function extractTasksFromText(text: string, lang = "he"): Promise<ExtractionResult> {
  if (!text || !text.trim()) return { tasks: [] };

  let extracted: ExtractedTask[] = [];
  const documentMeta: { documentDate?: string; documentTitle?: string } = {};

  if (isGeminiAvailable()) {
    try {
      // Chunk long documents so nothing past 6000 chars gets silently dropped.
      // Sequential, not parallel, so we don't hammer Gemini's rate limit.
      const chunks = chunkText(text);
      for (let i = 0; i < chunks.length; i++) {
        const prompt = buildGeminiExtractionPrompt(chunks[i], i === 0);
        try {
          const reply = await askGemini(prompt, "", lang);
          const parsedChunk = parseGeminiReply(reply);
          if (i === 0) {
            if (parsedChunk.documentDate) documentMeta.documentDate = parsedChunk.documentDate;
            if (parsedChunk.documentTitle) documentMeta.documentTitle = parsedChunk.documentTitle;
          }
          extracted.push(...parsedChunk.tasks);
        } catch (chunkErr) {
          console.warn(`[meeting-extractor] Gemini chunk ${i + 1}/${chunks.length} failed:`, chunkErr);
          // Keep going — other chunks may still succeed
        }
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
