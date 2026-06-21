"use client";
import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText,
  FileUp,
  Mic,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trash2,
  FileIcon,
  Image as ImageIcon,
  Volume2,
  ArrowRight,
  Plus,
  Pencil,
} from "lucide-react";
import { txt } from "@/lib/utils/locale-text";
import { cn } from "@/lib/utils";
import { mockUsers, mockWbsNodes } from "@/lib/db/mock-data";
import { pickResponsible } from "@/lib/ai/role-hierarchy";
import { AddTaskDialog, type AddTaskInitialValues } from "@/components/landing/add-task-dialog";

interface ExtractedTask {
  title: string;
  description?: string;
  assigneeHint?: string;
  dueDate?: string;
  estimateHours?: number;
  workTypeLabel?: string;
  confidence: number;
}

interface IntakeMeta {
  bytes?: number;
  filename?: string;
  mime?: string;
  estimatedPages?: number;
  estimatedDurationSec?: number;
}

interface IntakeResponse {
  kind: "text" | "docx" | "pptx" | "pdf" | "image" | "audio";
  sourceText: string;
  tasks: ExtractedTask[];
  count: number;
  /** Date detected in the document header (ISO YYYY-MM-DD) — used as the
   *  default plannedStart for every extracted task. */
  documentDate?: string;
  /** Title detected in the document — used as the source label. */
  documentTitle?: string;
  meta: IntakeMeta;
}

type Mode = "file" | "text" | "audio";

function fmtBytes(n: number | undefined): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDuration(s: number | undefined): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function kindIcon(kind: IntakeResponse["kind"]) {
  switch (kind) {
    case "pdf": case "docx": case "pptx": return FileIcon;
    case "image": return ImageIcon;
    case "audio": return Volume2;
    default: return FileText;
  }
}

/**
 * Read /api/intake's response robustly.
 *
 * The previous code did `await res.json()` blindly — but a large upload
 * never reaches our handler. The hosting platform (Vercel) and Next.js's
 * dev server both reject oversized request bodies at the proxy layer
 * with a plain-text response like `"Request Entity Too Large"`. JSON.parse
 * on that text throws `"Unexpected token 'R', \"Request En\"... is not
 * valid JSON"`, which is what the user was seeing. This helper:
 *
 *   1. Reads the body as text first (always succeeds).
 *   2. Tries JSON.parse; on success returns the typed object.
 *   3. On JSON-parse failure, returns the raw text snippet so the user
 *      sees the actual server/proxy message.
 *   4. Maps HTTP 413 to a localized "file too big for the server"
 *      message — useful even if the response did happen to be JSON.
 */
async function readIntakeResponse(
  res: Response,
  locale: string
): Promise<{ ok: true; data: IntakeResponse } | { ok: false; message: string }> {
  const raw = await res.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // not JSON — leave parsed null, raw still holds the text body
  }

  if (res.ok && parsed && typeof parsed === "object") {
    return { ok: true, data: parsed as IntakeResponse };
  }

  // Build a user-facing error message that is actually informative.
  if (res.status === 413) {
    return {
      ok: false,
      message: txt(locale, {
        he: "הקובץ גדול מדי עבור השרת. בפריסת Vercel, פונקציה ללא-שרת מקבלת גוף בקשה מוגבל. נסה קובץ קטן יותר, או הפעל פריסת Fluid Compute / העלאה ישירה ל-Vercel Blob.",
        en: "File is too large for the server. On Vercel, serverless functions cap the request body size. Try a smaller file, or switch to Fluid Compute / direct upload to Vercel Blob.",
      }) as string,
    };
  }

  if (parsed && typeof parsed === "object" && typeof parsed.error === "string") {
    return { ok: false, message: parsed.error };
  }

  // Non-JSON error body (typical for platform-level rejections). Surface
  // a short snippet of what the server actually said so the user can
  // recognize "Request Entity Too Large" / "Bad Gateway" / "Timeout" etc.
  const snippet = (raw || "").trim().slice(0, 200) || `HTTP ${res.status}`;
  return {
    ok: false,
    message: `HTTP ${res.status} — ${snippet}`,
  };
}

export function IntakeWorkflow() {
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("file");
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Keep the original uploaded File so we can pre-attach it to every task
  // created from this source. Cleared whenever the user resets.
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 300 * 1024 * 1024) {
      toast.error(txt(locale, { he: "קובץ גדול מ-300MB", en: "File over 300 MB" }));
      return;
    }
    setLoading(true);
    setResult(null);
    setSourceFile(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("locale", locale);
      const res = await fetch("/api/intake", { method: "POST", body: fd });
      const parsed = await readIntakeResponse(res, locale);
      if (!parsed.ok) throw new Error(parsed.message);
      setResult(parsed.data);
      setSelected(new Set(parsed.data.tasks.map((_, i) => i)));
      toast.success(
        txt(locale, {
          he: `זוהו ${parsed.data.count} משימות מתוך ${file.name}`,
          en: `Found ${parsed.data.count} tasks in ${file.name}`,
        })
      );
    } catch (err) {
      toast.error(
        (txt(locale, { he: "כשל בעיבוד", en: "Processing failed" }) as string) +
          ": " + (err instanceof Error ? err.message : "unknown")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleText = async () => {
    if (!textInput.trim()) {
      toast.error(txt(locale, { he: "הדבק טקסט תחילה", en: "Paste text first" }));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput, locale }),
      });
      const parsed = await readIntakeResponse(res, locale);
      if (!parsed.ok) throw new Error(parsed.message);
      setResult(parsed.data);
      setSelected(new Set(parsed.data.tasks.map((_, i) => i)));
      toast.success(
        txt(locale, {
          he: `זוהו ${parsed.data.count} משימות`,
          en: `Found ${parsed.data.count} tasks`,
        })
      );
    } catch (err) {
      toast.error(
        (txt(locale, { he: "כשל בעיבוד", en: "Processing failed" }) as string) +
          ": " + (err instanceof Error ? err.message : "unknown")
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const removeTask = (i: number) => {
    if (!result) return;
    const tasks = result.tasks.filter((_, idx) => idx !== i);
    setResult({ ...result, tasks, count: tasks.length });
    setSelected(new Set(tasks.map((_, idx) => idx)));
  };

  const handleCreateSelected = () => {
    if (!result) return;
    if (selected.size === 0) {
      toast.error(txt(locale, { he: "בחר משימה אחת לפחות", en: "Select at least one task" }));
      return;
    }
    toast.success(
      txt(locale, {
        he: `נוצרו ${selected.size} משימות`,
        en: `${selected.size} tasks created`,
      }),
      {
        description: txt(locale, {
          he: "במצב הדגמה — בייצור יישמרו ב-DB עם תיעוד מקור.",
          en: "Demo mode — production would persist with source provenance.",
        }),
      }
    );
    setResult(null);
    setSelected(new Set());
    setTextInput("");
    setSourceFile(null);
  };

  const reset = () => {
    setResult(null);
    setSelected(new Set());
    setTextInput("");
    setSourceFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-violet-600" />
              {txt(locale, { he: "בחר מקור לייבוא", en: "Choose source to import" })}
            </CardTitle>
            <CardDescription>
              {txt(locale, {
                he: "ה-AI יחלץ את כל המשימות מהמקור, יעריך מאמץ, וימצא את האחראי לפי בכירות (חוץ מהמנכ\"ל).",
                en: "AI extracts every task, estimates effort, and suggests the most senior responsible (excluding the CEO).",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode("file")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "file"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <FileUp className="size-8 text-violet-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "קובץ (PDF / Word / PowerPoint / תמונה)", en: "Document (PDF / Word / PowerPoint / Image)" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, { he: "סיכום פגישה, מסמך אפיון, מצגת — עד 300MB", en: "Meeting summary, spec, slide deck — up to 300 MB" })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("text")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "text"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <FileText className="size-8 text-blue-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "הדבק טקסט", en: "Paste text" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, { he: "סיכום חופשי, מייל, פרוטוקול — עד 50,000 תווים", en: "Free text, email, minutes — up to 50,000 chars" })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("audio")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[120px]",
                  mode === "audio"
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-border hover:border-violet-300"
                )}
              >
                <Mic className="size-8 text-emerald-600" />
                <span className="font-semibold text-sm">
                  {txt(locale, { he: "הקלטת שמע", en: "Audio recording" })}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">
                  {txt(locale, { he: "הקלטות Zoom / Google Meet — MP3/WAV/M4A/MP4/WebM/OGG/FLAC · עד 300MB", en: "Zoom / Google Meet recordings — MP3/WAV/M4A/MP4/WebM/OGG/FLAC · up to 300 MB" })}
                </span>
              </button>
            </div>

            <div className="mt-5">
              {mode === "file" && (
                <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-muted/20">
                  <FileUp className="size-12 text-muted-foreground" />
                  <p className="text-sm text-center text-muted-foreground">
                    {txt(locale, {
                      he: "גרור קובץ לכאן או לחץ לבחירה",
                      en: "Drop a file here or click to select",
                    })}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    {loading ? (<><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מעבד...", en: "Processing..." })}</>) : (<><FileUp className="size-4" />{txt(locale, { he: "בחר קובץ", en: "Choose file" })}</>)}
                  </Button>
                </div>
              )}

              {mode === "text" && (
                <div className="space-y-2">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={txt(locale, {
                      he: "לדוגמה: בסיכום הפגישה הוחלט שאלעד יכין מצגת לדירקטוריון עד יום חמישי. ניר יכתוב מסמך אפיון. אסתר תסכם את הישיבה ותשלח עד מחר...",
                      en: "Example: Meeting summary — Elad to prepare a board deck by Thursday. Nir to write the spec. Esther to summarize the meeting and send by tomorrow...",
                    })}
                    className="w-full min-h-[180px] bg-muted/30 border rounded-lg p-3 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ fontSize: "16px" }}
                    disabled={loading}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{textInput.length.toLocaleString()} / 50,000</span>
                    <Button onClick={handleText} disabled={loading || !textInput.trim()}>
                      {loading ? (<><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מעבד...", en: "Processing..." })}</>) : (<><Sparkles className="size-4" />{txt(locale, { he: "חלץ משימות", en: "Extract tasks" })}</>)}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "audio" && (
                <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-muted/20">
                  <Mic className="size-12 text-emerald-600" />
                  <p className="text-sm text-center text-muted-foreground">
                    {txt(locale, {
                      he: "העלה קובץ שמע — Gemini יתמלל וייצא משימות",
                      en: "Upload audio — Gemini will transcribe and extract tasks",
                    })}
                  </p>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac,.mp4,.mov"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                  <Button onClick={() => audioInputRef.current?.click()} disabled={loading}>
                    {loading ? (<><Loader2 className="size-4 animate-spin" />{txt(locale, { he: "מתמלל ומחלץ...", en: "Transcribing..." })}</>) : (<><Mic className="size-4" />{txt(locale, { he: "בחר קובץ שמע", en: "Choose audio file" })}</>)}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          <SourceMetadataCard result={result} onReset={reset} />
          <ExtractedTasksTable
            result={result}
            sourceFile={sourceFile}
            selected={selected}
            toggleSelect={toggleSelect}
            removeTask={removeTask}
            onCreate={handleCreateSelected}
          />
        </>
      )}
    </div>
  );
}

function SourceMetadataCard({ result, onReset }: { result: IntakeResponse; onReset: () => void }) {
  const locale = useLocale();
  const Icon = kindIcon(result.kind);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Icon className="size-6 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                {result.meta.filename || txt(locale, { he: "טקסט חופשי", en: "Free text" })}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {result.meta.mime || result.kind} · {fmtBytes(result.meta.bytes)}
                {result.meta.estimatedPages != null && (
                  <> · {result.meta.estimatedPages} {txt(locale, { he: "עמודים (משוער)", en: "pages (est.)" })}</>
                )}
                {result.meta.estimatedDurationSec != null && (
                  <> · {fmtDuration(result.meta.estimatedDurationSec)} {txt(locale, { he: "דקות (משוער)", en: "duration (est.)" })}</>
                )}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            {txt(locale, { he: "מקור חדש", en: "New source" })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label={txt(locale, { he: "משימות שזוהו", en: "Tasks found" })} value={String(result.count)} color="primary" />
          <Stat label={txt(locale, { he: "אורך המקור", en: "Source length" })} value={`${result.sourceText.length.toLocaleString()} ${txt(locale, { he: "תווים", en: "chars" })}`} color="indigo" />
          <Stat label={txt(locale, { he: "סוג מקור", en: "Source kind" })} value={result.kind.toUpperCase()} color="purple" />
        </div>
        <details>
          <summary className="text-xs font-semibold cursor-pointer hover:underline">
            {txt(locale, { he: "📄 טקסט מקור (הצג/הסתר)", en: "📄 Source text (show/hide)" })}
          </summary>
          <div className="mt-2 max-h-[220px] overflow-y-auto p-3 rounded-md bg-muted/40 text-xs whitespace-pre-wrap leading-relaxed">
            {result.sourceText}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }: { label: React.ReactNode; value: string; color: "primary" | "indigo" | "purple" }) {
  const colorMap = {
    primary: "from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 text-blue-900 dark:text-blue-100",
    indigo:  "from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/40 text-indigo-900 dark:text-indigo-100",
    purple:  "from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40 text-purple-900 dark:text-purple-100",
  };
  return (
    <div className={cn("rounded-lg bg-gradient-to-br p-3", colorMap[color])}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}

/** Tries to resolve an assignee-hint string to one of the mock users. */
function resolveAssignee(hint?: string) {
  if (!hint) return null;
  const h = hint.toLowerCase().trim();
  const direct = mockUsers.find((u) =>
    u.name.toLowerCase().includes(h) || h.includes(u.name.toLowerCase().split(" ")[0])
  );
  if (direct) return direct;
  return null;
}

function ExtractedTasksTable({
  result,
  sourceFile,
  selected,
  toggleSelect,
  removeTask,
  onCreate,
}: {
  result: IntakeResponse;
  sourceFile: File | null;
  selected: Set<number>;
  toggleSelect: (i: number) => void;
  removeTask: (i: number) => void;
  onCreate: () => void;
}) {
  const locale = useLocale();
  // Compute the org-wide auto-pick: most senior non-CEO from mockUsers, as fallback
  const autoFallback = pickResponsible(mockUsers, { excludeCEO: true });

  // Controlled-open dialog that gets pre-filled when the user clicks a row.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInit, setEditorInit] = useState<AddTaskInitialValues | null>(null);

  // Build the "source" label: document title (or filename) + document date.
  // This is what the task's "מקור" field will be pre-filled with so the
  // origin of each task is always traceable.
  const docTitleForLabel = result.documentTitle || result.meta.filename || "";
  const docDateForLabel = result.documentDate || "";
  const sourceLabel = docTitleForLabel && docDateForLabel
    ? `${docTitleForLabel} · ${docDateForLabel}`
    : docTitleForLabel || docDateForLabel || undefined;

  const openEditor = (task: ExtractedTask) => {
    const resolved = resolveAssignee(task.assigneeHint) || autoFallback?.user;
    setEditorInit({
      title: task.title,
      description: task.description,
      workTypeLabel: task.workTypeLabel,
      assigneeHint: task.assigneeHint,
      assigneeUserId: resolved?.id,
      // plannedStart defaults to the document's date — that's when the
      // decision to do the task was made.
      plannedStart: result.documentDate,
      plannedEnd: task.dueDate,
      estimateHours: task.estimateHours,
      sourceLabel,
      sourceFile: sourceFile || undefined,
    });
    setEditorOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {txt(locale, { he: "משימות שזוהו וניתן ליצור", en: "Detected tasks ready to create" })}
            </CardTitle>
            <CardDescription>
              {txt(locale, {
                he: `${selected.size} מתוך ${result.tasks.length} נבחרו. עיין במשימה, חלוף עליה, או הסר משלא רלוונטית.`,
                en: `${selected.size} of ${result.tasks.length} selected. Review, modify, or remove items that aren't relevant.`,
              })}
            </CardDescription>
          </div>
          <Button onClick={onCreate} disabled={selected.size === 0}>
            <Plus className="size-4" />
            {txt(locale, { he: `צור ${selected.size} משימות`, en: `Create ${selected.size} tasks` })}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.tasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {txt(locale, {
              he: "לא זוהו משימות במקור הזה.",
              en: "No tasks were detected in this source.",
            })}
          </div>
        ) : (
          result.tasks.map((task, i) => {
            const isSel = selected.has(i);
            const resolved = resolveAssignee(task.assigneeHint);
            const chosenAssignee = resolved || autoFallback?.user;
            return (
              <div
                key={i}
                className={cn(
                  "border rounded-lg p-3 transition-all cursor-pointer hover:border-violet-300",
                  isSel
                    ? "border-violet-400 bg-violet-50/40 dark:bg-violet-950/20"
                    : "border-border bg-muted/10"
                )}
                onClick={() => openEditor(task)}
                title={txt(locale, { he: "לחץ לפתיחת טופס משימה עם הפרטים מהמקור", en: "Click to open the task form prefilled from source" }) as string}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSelect(i)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="font-medium text-sm flex-1 min-w-0">{task.title}</h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {txt(locale, { he: "ביטחון", en: "Conf." })}: {Math.round(task.confidence * 100)}%
                      </span>
                    </div>
                    {task.description && task.description !== task.title && (
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {task.workTypeLabel && (
                        <Badge variant="secondary" className="text-[10px]">
                          <FileText className="size-3 me-1" />
                          {task.workTypeLabel}
                        </Badge>
                      )}
                      {task.estimateHours != null && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                          ⏱ {task.estimateHours} {txt(locale, { he: "שעות", en: "hrs" })}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                          📅 {task.dueDate}
                        </Badge>
                      )}
                      {task.assigneeHint && (
                        <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">
                          👤 {txt(locale, { he: "ציון במקור", en: "From source" })}: {task.assigneeHint}
                        </Badge>
                      )}
                      {chosenAssignee && (
                        <Badge variant="outline" className="text-[10px] text-violet-700 border-violet-300">
                          <ArrowRight className="size-3 me-1" />
                          {txt(locale, { he: "אחראי מוצע", en: "Auto-assigned" })}: {chosenAssignee.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(task);
                      }}
                      className="text-muted-foreground hover:text-violet-600 p-1"
                      title={txt(locale, { he: "פתח טופס מלא", en: "Open full form" }) as string}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTask(i);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1"
                      title={txt(locale, { he: "הסר", en: "Remove" }) as string}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Hidden controlled-open AddTaskDialog used for "click row → pre-filled form".
          It has no children (no trigger button) — opens/closes purely via state. */}
      <AddTaskDialog
        projects={mockWbsNodes}
        users={mockUsers}
        locale={locale}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialValues={editorInit ?? undefined}
      />
    </Card>
  );
}
