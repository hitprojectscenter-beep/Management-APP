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
  const isHe = locale === "he";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ reason?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setErrors({ reason: isHe ? "חובה לבחור סיבת סגירה" : "Must select a reason" });
      return;
    }

    toast.success(
      isHe ? `המשימה נסגרה: "${taskTitle}"` : `Task closed: "${taskTitle}"`,
      {
        description: isHe
          ? `סיבה: ${CLOSE_REASONS.find((r) => r.value === reason)?.labelHe}${description ? ` · ${description.slice(0, 50)}...` : ""}`
          : `Reason: ${CLOSE_REASONS.find((r) => r.value === reason)?.labelEn}`,
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
            {isHe ? "סגירת משימה" : "Close Task"}
          </DialogTitle>
          <DialogDescription>
            {isHe
              ? `סגירת "${taskTitle}" — בחר סיבה והוסף תיאור קצר`
              : `Closing "${taskTitle}" — select reason and add description`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Close reason */}
          <div className="space-y-2">
            <Label>{isHe ? "סיבת סגירה" : "Close Reason"} <span className="text-red-500">*</span></Label>
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
                  <span>{isHe ? r.labelHe : r.labelEn}</span>
                </button>
              ))}
            </div>
            {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
          </div>

          {/* Description (max 300 chars) */}
          <div className="space-y-1.5">
            <Label>
              {isHe ? "תיאור קצר" : "Short Description"}{" "}
              <span className="text-muted-foreground text-[10px]">({isHe ? "עד 300 תווים" : "max 300 chars"})</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder={isHe ? "פרט את סיבת הסגירה..." : "Describe the closure reason..."}
              rows={3}
              maxLength={300}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              style={{ fontSize: "16px" }}
            />
            <div className="text-[10px] text-muted-foreground text-end">{description.length}/300</div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {isHe ? "ביטול" : "Cancel"}
            </Button>
            <Button type="submit" className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="size-4" />
              {isHe ? "סגור משימה" : "Close Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
