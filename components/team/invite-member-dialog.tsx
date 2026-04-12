"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteFormData {
  fullName: string;
  role: string;
  division: string; // חטיבה
  department: string; // אגף
  phone: string;
  email: string;
}

export function InviteMemberDialog({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const isHe = locale === "he";
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<InviteFormData>({
    fullName: "", role: "", division: "", department: "", phone: "", email: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InviteFormData, string>>>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.fullName.trim()) errs.fullName = isHe ? "שם מלא חובה" : "Full name required";
    if (!form.phone.trim()) errs.phone = isHe ? "טלפון חובה" : "Phone required";
    else if (!/^[\d\-+() ]{7,15}$/.test(form.phone.trim()))
      errs.phone = isHe ? "מספר טלפון לא תקין" : "Invalid phone";
    if (!form.email.trim()) errs.email = isHe ? "מייל חובה" : "Email required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = isHe ? "כתובת מייל לא תקינה" : "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);

    // Simulate sending invitation
    await new Promise((r) => setTimeout(r, 800));

    const inviteLink = `${window.location.origin}/invite/${btoa(form.email).slice(0, 12)}`;

    toast.info(
      isHe ? `⚠️ מצב הדגמה — ${form.fullName} נרשם בהצלחה` : `⚠️ Demo mode — ${form.fullName} registered`,
      {
        description: isHe
          ? `במצב הדגמה לא נשלחים מיילים/SMS. בייצור: הזמנה תישלח ל-${form.email} ול-${form.phone}.`
          : `Demo mode: no emails/SMS sent. In production: invite would be sent to ${form.email} and ${form.phone}.`,
        duration: 8000,
      }
    );

    setSending(false);
    setOpen(false);
    setForm({ fullName: "", role: "", division: "", department: "", phone: "", email: "" });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isHe ? "הזמנת חבר צוות חדש" : "Invite Team Member"}</DialogTitle>
          <DialogDescription>
            {isHe
              ? "מלא את הפרטים ונשלח קישור הזמנה במייל. המוזמן ישלים את פרטיו."
              : "Fill in the details and we'll send an invitation link by email."}
            {" "}<span className="text-red-500">*</span> = {isHe ? "חובה" : "required"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full Name * */}
          <div className="space-y-1">
            <Label>{isHe ? "שם מלא" : "Full Name"} <span className="text-red-500">*</span></Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder={isHe ? "ישראל ישראלי" : "John Doe"}
              className={cn("min-h-[44px]", errors.fullName && "border-red-500")}
            />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1">
            <Label>{isHe ? "תפקיד" : "Role"}</Label>
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder={isHe ? "מנהל פרויקט / מפתח / אנליסט..." : "Project Manager / Developer..."}
              className="min-h-[44px]"
            />
          </div>

          {/* Division + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isHe ? "חטיבה" : "Division"}</Label>
              <Input
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
                placeholder={isHe ? "חטיבת IT" : "IT Division"}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1">
              <Label>{isHe ? "אגף" : "Department"}</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder={isHe ? "אגף פיתוח" : "Development"}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Phone * */}
          <div className="space-y-1">
            <Label>{isHe ? "טלפון נייד" : "Mobile Phone"} <span className="text-red-500">*</span></Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="050-1234567"
              dir="ltr"
              className={cn("min-h-[44px]", errors.phone && "border-red-500")}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* Email * */}
          <div className="space-y-1">
            <Label>{isHe ? "דואר אלקטרוני" : "Email"} <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@mapi.gov.il"
              dir="ltr"
              className={cn("min-h-[44px]", errors.email && "border-red-500")}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {isHe ? "ביטול" : "Cancel"}
            </Button>
            <Button type="submit" disabled={sending} className="min-h-[44px]">
              <Send className="size-4" />
              {sending ? (isHe ? "שולח..." : "Sending...") : isHe ? "שלח הזמנה" : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
