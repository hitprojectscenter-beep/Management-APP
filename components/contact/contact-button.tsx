"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Mail, X, Loader2, Send } from "lucide-react";
import { txt } from "@/lib/utils/locale-text";

/**
 * Prominent floating "צור קשר" (Contact us) button — for user questions /
 * improvement suggestions. Opens a small form; submitting POSTs to /api/contact,
 * which emails the PMO ops mailbox (pmoplusops@gmail.com). Stacked above the
 * help + assistant floating buttons so it doesn't overlap them.
 */
export function ContactButton() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      toast.error(txt(locale, { he: "נא לכתוב את תוכן הפנייה", en: "Please write your message" }));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      if (res.ok) {
        toast.success(txt(locale, { he: "הפנייה נשלחה — תודה! נחזור אליך בהקדם.", en: "Sent — thank you!" }));
        setOpen(false);
        setSubject("");
        setMessage("");
      } else if (res.status === 401) {
        toast.error(txt(locale, { he: "יש להתחבר תחילה", en: "Please sign in first" }));
      } else {
        toast.error(txt(locale, { he: "השליחה נכשלה, נסה/י שוב", en: "Failed to send, try again" }));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={txt(locale, { he: "צור קשר — שאלות והצעות", en: "Contact us" })}
        className="fixed bottom-24 end-6 z-[78] inline-flex items-center gap-2 h-12 ps-4 pe-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all"
        data-tour="contact"
      >
        <Mail className="size-5" />
        {txt(locale, { he: "צור קשר", en: "Contact" })}
      </button>

      {open && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/40 p-4" onClick={() => !sending && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="size-4 text-amber-600" />
                {txt(locale, { he: "צור קשר — שאלות והצעות לייעול", en: "Contact us — questions & suggestions" })}
              </h3>
              <button onClick={() => !sending && setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {txt(locale, {
                  he: "שאלה, תקלה או הצעה לייעול? נשמח לשמוע — הפנייה תגיע ישירות לצוות ה-PMO.",
                  en: "A question, issue, or improvement idea? It goes straight to the PMO team.",
                })}
              </p>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={txt(locale, { he: "נושא (רשות)", en: "Subject (optional)" })}
                className="w-full min-h-[40px] px-3 rounded-md border bg-background text-sm"
                style={{ fontSize: "16px" }}
                maxLength={150}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                autoFocus
                placeholder={txt(locale, { he: "כתוב/י את הפנייה כאן…", en: "Write your message…" })}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-y"
                style={{ fontSize: "16px" }}
                maxLength={4000}
              />
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button onClick={() => setOpen(false)} disabled={sending} className="px-3 h-10 rounded-xl border text-sm">
                {txt(locale, { he: "ביטול", en: "Cancel" })}
              </button>
              <button
                onClick={submit}
                disabled={sending || !message.trim()}
                className="px-4 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {txt(locale, { he: "שליחה", en: "Send" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
