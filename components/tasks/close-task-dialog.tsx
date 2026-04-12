"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { toast } from "sonner";

const CLOSE_REASONS = [
  { value: "handled", labelHe: "טופל", labelEn: "Handled", icon: "✅" },
  { value: "postponed", labelHe: "נדחה", labelEn: "Postponed", icon: "⏳" },
  { value: "cancelled", labelHe: "בוטל", labelEn: "Cancelled", icon: "❌" },
  { value: "transferred", labelHe: "הועבר למשתמש אחר", labelEn: "Transferred", icon: "🔄" },
] as const;

export function CloseTaskDialog({
  taskTitle,
  locale,
  children,
  onClose,
}: {
  taskTitle: string;
  locale: string;
  children: React.ReactNode;
  onClose?: (reason: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ reason?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setErrors({ reason: txt(locale, { he: "חובה לבחור סיבת סגירה", en: "Must select a reason" }) });
      return;
    }

    toast.success(
      txt(locale, { he: `המשימה נסגרה: "${taskTitle}"`, en: `Task closed: "${taskTitle}"` }),
      {
        description: txt(locale, {
          he: `סיבה: ${CLOSE_REASONS.find((r) => r.value === reason)?.labelHe}${description ? ` · ${description.slice(0, 50)}...` : ""}`,
          en: `Reason: ${CLOSE_REASONS.find((r) => r.value === reason)?.labelEn}`,
        }),
      }
    );
    if (onClose) onClose(reason, description);
    setOpen(false);
    setReason("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            {txt(locale, { he: "סגירת משימה", en: "Close Task" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, {
              he: `סגירת "${taskTitle}" — בחר סיבה והוסף תיאור קצר`,
              en: `Closing "${taskTitle}" — select reason and add description`,
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Close reason */}
          <div className="space-y-2">
            <Label>{txt(locale, { he: "סיבת סגירה", en: "Close Reason" })} <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {CLOSE_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { setReason(r.value); setErrors({}); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all min-h-[44px]",
                    reason === r.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  <span>{r.icon}</span>
                  <span>{txt(locale, { he: r.labelHe, en: r.labelEn })}</span>
                </button>
              ))}
            </div>
            {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
          </div>

          {/* Description (max 300 chars) */}
          <div className="space-y-1.5">
            <Label>
              {txt(locale, { he: "תיאור קצר", en: "Short Description", ru: "Описание", fr: "Description", es: "Descripción" })}{" "}
              <span className="text-muted-foreground text-[10px]">({txt(locale, { he: "עד 300 תווים", en: "max 300 chars" })})</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder={txt(locale, { he: "פרט את סיבת הסגירה...", en: "Describe the closure reason..." })}
              rows={3}
              maxLength={300}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              style={{ fontSize: "16px" }}
            />
            <div className="text-[10px] text-muted-foreground text-end">{description.length}/300</div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {txt(locale, { he: "ביטול", en: "Cancel", ru: "Отмена", fr: "Annuler", es: "Cancelar" })}
            </Button>
            <Button type="submit" className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="size-4" />
              {txt(locale, { he: "סגור משימה", en: "Close Task" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
