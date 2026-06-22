"use client";

/**
 * A visual, step-by-step walkthrough for getting a shareable URL out of
 * Google Drive or Dropbox so the user can paste it into the intake's
 * "Link" mode. The user explicitly asked for "screenshots וצעדים מודרכים".
 *
 * Screenshots are hand-drawn as small SVG mocks (not real screenshots —
 * keeps the bundle small and avoids licensing concerns with cloud-provider
 * UI assets).
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { txt } from "@/lib/utils/locale-text";
import { HelpCircle, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

type Provider = "drive" | "dropbox";

interface Props {
  locale: string;
  children?: React.ReactNode;
}

export function LinkGuideDialog({ locale, children }: Props) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("drive");
  const [step, setStep] = useState(0);

  const driveSteps = [
    {
      title: txt(locale, { he: "1. העלה את ההקלטה ל-Drive", en: "1. Upload the recording to Drive" }) as string,
      body: txt(locale, {
        he: "פתח drive.google.com. גרור את קובץ ההקלטה לחלון (או לחץ \"חדש\" → \"העלאת קובץ\"). חכה שיסיים העלאה.",
        en: 'Open drive.google.com. Drag the file in (or click "New" → "File upload"). Wait for it to finish uploading.',
      }) as string,
      mock: <DriveMockStep1 />,
    },
    {
      title: txt(locale, { he: "2. שתף — כל מי שיש לו את הקישור", en: "2. Share — Anyone with the link" }) as string,
      body: txt(locale, {
        he: "קליק ימני על הקובץ → \"שתף\". בתחתית הדיאלוג: \"הגישה הכללית\" → שנה מ-\"מוגבל\" ל-\"כל מי שיש לו את הקישור\". אל תשנה את ההרשאה (Viewer זה מספיק).",
        en: 'Right-click the file → "Share". At the bottom: "General access" → change "Restricted" to "Anyone with the link". Leave the permission as "Viewer".',
      }) as string,
      mock: <DriveMockStep2 />,
    },
    {
      title: txt(locale, { he: "3. העתק קישור והדבק בפנים", en: "3. Copy link and paste here" }) as string,
      body: txt(locale, {
        he: "לחץ על \"העתק קישור\". חזור למרכז ייבוא של PMO++ → בחר \"קישור (Drive / Dropbox)\" → הדבק (Ctrl+V) → לחץ \"חלץ משימות מהקישור\".",
        en: 'Click "Copy link". Back in PMO++ Intake Center → click "Link (Drive / Dropbox)" → paste (Ctrl+V) → click "Extract tasks from URL".',
      }) as string,
      mock: <DriveMockStep3 />,
    },
  ];

  const dropboxSteps = [
    {
      title: txt(locale, { he: "1. העלה את ההקלטה ל-Dropbox", en: "1. Upload to Dropbox" }) as string,
      body: txt(locale, {
        he: "פתח dropbox.com. גרור את הקובץ או לחץ \"Upload\" → \"Files\".",
        en: 'Open dropbox.com. Drag the file in, or click "Upload" → "Files".',
      }) as string,
      mock: <DropboxMockStep1 />,
    },
    {
      title: txt(locale, { he: "2. Share → Create link", en: "2. Share → Create link" }) as string,
      body: txt(locale, {
        he: "ריחוף מעל הקובץ → לחץ \"Share\". אם הקישור עוד לא נוצר, לחץ \"Create link\". וודא שההרשאה היא \"Anyone with the link can view\".",
        en: 'Hover over the file → click "Share". If no link yet, click "Create link". Make sure permission is "Anyone with the link can view".',
      }) as string,
      mock: <DropboxMockStep2 />,
    },
    {
      title: txt(locale, { he: "3. Copy link והדבק בפנים", en: "3. Copy link and paste here" }) as string,
      body: txt(locale, {
        he: "לחץ \"Copy link\". חזור למרכז ייבוא → \"קישור (Drive / Dropbox)\" → הדבק. המערכת תמיר אוטומטית את dl=0 ל-dl=1 כדי לקבל את הקובץ הבינארי.",
        en: 'Click "Copy link". Back in Intake → "Link (Drive / Dropbox)" → paste. The system auto-flips dl=0 to dl=1 to get the binary file.',
      }) as string,
      mock: <DropboxMockStep3 />,
    },
  ];

  const steps = provider === "drive" ? driveSteps : dropboxSteps;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const reset = () => {
    setStep(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <HelpCircle className="size-4" />
            {txt(locale, { he: "איך לעשות זאת?", en: "How do I do this?" }) as string}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {txt(locale, {
              he: "הדבקת קישור מ-Drive / Dropbox — מדריך מהיר",
              en: "Pasting a Drive / Dropbox link — quick guide",
            })}
          </DialogTitle>
        </DialogHeader>

        {/* Provider tabs */}
        <div className="flex gap-2 border-b pb-3">
          <button
            type="button"
            onClick={() => {
              setProvider("drive");
              setStep(0);
            }}
            className={
              provider === "drive"
                ? "flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium min-h-[40px]"
                : "flex-1 px-3 py-2 rounded-md bg-muted/40 text-sm hover:bg-muted min-h-[40px]"
            }
          >
            Google Drive
          </button>
          <button
            type="button"
            onClick={() => {
              setProvider("dropbox");
              setStep(0);
            }}
            className={
              provider === "dropbox"
                ? "flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium min-h-[40px]"
                : "flex-1 px-3 py-2 rounded-md bg-muted/40 text-sm hover:bg-muted min-h-[40px]"
            }
          >
            Dropbox
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={
                "h-1.5 flex-1 rounded-full " +
                (i <= step ? "bg-primary" : "bg-muted")
              }
            />
          ))}
          <Badge variant="outline" className="ms-2 shrink-0">
            {step + 1} / {steps.length}
          </Badge>
        </div>

        {/* Step content */}
        <div className="space-y-3">
          <h3 className="font-semibold text-base">{current.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
          <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-center min-h-[200px]">
            {current.mock}
          </div>
        </div>

        {/* Open provider link */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{txt(locale, { he: "פתח עכשיו:", en: "Open now:" })}</span>
          <a
            href={provider === "drive" ? "https://drive.google.com" : "https://www.dropbox.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {provider === "drive" ? "drive.google.com" : "dropbox.com"}
            <ExternalLink className="size-3" />
          </a>
        </div>

        <DialogFooter className="flex !justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="min-h-[44px]"
          >
            <ChevronLeft className="size-4" />
            {txt(locale, { he: "הקודם", en: "Back" })}
          </Button>
          {isLast ? (
            <Button type="button" onClick={() => setOpen(false)} className="min-h-[44px]">
              {txt(locale, { he: "סגור — אני יודע מה לעשות", en: "Done — got it" })}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="min-h-[44px]"
            >
              {txt(locale, { he: "הבא", en: "Next" })}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * SVG mock screenshots. Drawn small so the bundle stays light.
 * The colors track --primary so they match the brand.
 * ============================================================ */

function DriveMockStep1() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-[360px]">
      <rect x="0" y="0" width="320" height="180" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      <rect x="0" y="0" width="320" height="32" rx="8" fill="#1a73e8" />
      <text x="14" y="22" fontSize="13" fontWeight="700" fill="#fff">Drive</text>
      <rect x="14" y="48" width="80" height="24" rx="12" fill="#fff" stroke="#dadce0" />
      <text x="54" y="64" fontSize="11" fontWeight="600" fill="#3c4043" textAnchor="middle">+ חדש</text>
      <rect x="14" y="86" width="292" height="80" rx="6" fill="hsl(var(--muted))" strokeDasharray="6 4" stroke="hsl(var(--primary))" />
      <text x="160" y="120" fontSize="13" fontWeight="600" fill="hsl(var(--primary))" textAnchor="middle">📁 גרור קובץ לכאן</text>
      <text x="160" y="142" fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="middle">או "+ חדש" → העלאת קובץ</text>
    </svg>
  );
}

function DriveMockStep2() {
  return (
    <svg viewBox="0 0 320 220" className="w-full max-w-[360px]">
      <rect x="0" y="0" width="320" height="220" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      <rect x="20" y="14" width="280" height="190" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
      <text x="36" y="36" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">שיתוף "meeting-2026-06.mp4"</text>
      <line x1="20" y1="50" x2="300" y2="50" stroke="hsl(var(--border))" />
      <text x="36" y="74" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))">אנשים</text>
      <text x="36" y="120" fontSize="11" fontWeight="600" fill="hsl(var(--muted-foreground))">הגישה הכללית</text>
      <rect x="36" y="130" width="248" height="44" rx="6" fill="#e8f0fe" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx="56" cy="152" r="10" fill="hsl(var(--primary))" />
      <text x="56" y="156" fontSize="10" fill="#fff" textAnchor="middle">🔗</text>
      <text x="76" y="148" fontSize="11" fontWeight="700" fill="hsl(var(--foreground))">כל מי שיש לו את הקישור</text>
      <text x="76" y="164" fontSize="9" fill="hsl(var(--muted-foreground))">ניתן להציג · בלי כניסה לחשבון</text>
      <text x="270" y="156" fontSize="14" fill="hsl(var(--primary))" textAnchor="middle">▾</text>
      <rect x="36" y="184" width="100" height="14" rx="3" fill="hsl(var(--muted))" />
    </svg>
  );
}

function DriveMockStep3() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-[360px]">
      <rect x="0" y="0" width="320" height="180" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      <rect x="14" y="14" width="200" height="32" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
      <text x="22" y="34" fontSize="9" fill="hsl(var(--foreground))" fontFamily="monospace">drive.google.com/file/d/1aBc…</text>
      <rect x="222" y="14" width="84" height="32" rx="6" fill="hsl(var(--primary))" />
      <text x="264" y="34" fontSize="11" fontWeight="700" fill="hsl(var(--primary-foreground))" textAnchor="middle">העתק קישור</text>
      <text x="160" y="80" fontSize="20" fill="hsl(var(--primary))" textAnchor="middle">↓</text>
      <text x="160" y="100" fontSize="11" fill="hsl(var(--muted-foreground))" textAnchor="middle">PMO++ — מרכז ייבוא — קישור</text>
      <rect x="14" y="116" width="292" height="32" rx="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
      <text x="22" y="135" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))" direction="ltr">https://drive.google.com/file/d/1aBc…</text>
      <rect x="14" y="154" width="292" height="20" rx="6" fill="hsl(var(--primary))" />
      <text x="160" y="168" fontSize="10" fontWeight="700" fill="hsl(var(--primary-foreground))" textAnchor="middle">חלץ משימות מהקישור ✨</text>
    </svg>
  );
}

function DropboxMockStep1() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-[360px]">
      <rect x="0" y="0" width="320" height="180" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      <rect x="0" y="0" width="320" height="32" rx="8" fill="#0061ff" />
      <text x="14" y="22" fontSize="13" fontWeight="700" fill="#fff">Dropbox</text>
      <rect x="226" y="48" width="78" height="24" rx="4" fill="#0061ff" />
      <text x="265" y="64" fontSize="11" fontWeight="600" fill="#fff" textAnchor="middle">Upload ▾</text>
      <rect x="14" y="86" width="292" height="80" rx="6" fill="hsl(var(--muted))" strokeDasharray="6 4" stroke="#0061ff" />
      <text x="160" y="120" fontSize="13" fontWeight="600" fill="#0061ff" textAnchor="middle">📁 Drag file here</text>
      <text x="160" y="142" fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="middle">or "Upload" → Files</text>
    </svg>
  );
}

function DropboxMockStep2() {
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-[360px]">
      <rect x="0" y="0" width="320" height="200" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      <rect x="20" y="14" width="280" height="170" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
      <text x="36" y="36" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">Share meeting-2026-06.mp4</text>
      <line x1="20" y1="50" x2="300" y2="50" stroke="hsl(var(--border))" />
      <rect x="36" y="64" width="248" height="40" rx="6" fill="hsl(var(--muted))" />
      <text x="48" y="88" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))" direction="ltr">https://www.dropbox.com/scl/fi/…?dl=0</text>
      <rect x="36" y="120" width="120" height="40" rx="6" fill="#0061ff" />
      <text x="96" y="144" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">Create link</text>
      <text x="180" y="144" fontSize="10" fill="hsl(var(--muted-foreground))">→ Copy link</text>
    </svg>
  );
}

function DropboxMockStep3() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-[360px]">
      <rect x="0" y="0" width="320" height="180" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
      <rect x="14" y="14" width="200" height="32" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
      <text x="22" y="34" fontSize="9" fill="hsl(var(--foreground))" fontFamily="monospace">dropbox.com/scl/fi/…?dl=0</text>
      <rect x="222" y="14" width="84" height="32" rx="6" fill="#0061ff" />
      <text x="264" y="34" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">Copy link</text>
      <text x="160" y="80" fontSize="20" fill="hsl(var(--primary))" textAnchor="middle">↓</text>
      <text x="160" y="100" fontSize="11" fill="hsl(var(--muted-foreground))" textAnchor="middle">PMO++ ממיר ל-dl=1 אוטומטית</text>
      <rect x="14" y="116" width="292" height="32" rx="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
      <text x="22" y="135" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))" direction="ltr">https://www.dropbox.com/scl/fi/…?dl=1</text>
      <rect x="14" y="154" width="292" height="20" rx="6" fill="hsl(var(--primary))" />
      <text x="160" y="168" fontSize="10" fontWeight="700" fill="hsl(var(--primary-foreground))" textAnchor="middle">חלץ משימות מהקישור ✨</text>
    </svg>
  );
}
