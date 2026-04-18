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
import { Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

interface InviteFormData {
  fullName: string;
  role: string;
  roleOther: string;
  division: string;
  divisionOther: string;
  department: string;
  departmentOther: string;
  phone: string;
  email: string;
}

// Dropdown options with "Other" at the end
const ROLE_OPTIONS = [
  { value: "project_manager", he: "מנהל פרויקט", en: "Project Manager" },
  { value: "team_lead", he: "ראש צוות", en: "Team Lead" },
  { value: "developer", he: "מפתח/ת", en: "Developer" },
  { value: "analyst", he: "אנליסט/ית", en: "Analyst" },
  { value: "designer", he: "מעצב/ת", en: "Designer" },
  { value: "qa", he: "בודק/ת איכות", en: "QA Engineer" },
  { value: "devops", he: "DevOps", en: "DevOps" },
  { value: "product_manager", he: "מנהל/ת מוצר", en: "Product Manager" },
  { value: "data_analyst", he: "מנתח/ת נתונים", en: "Data Analyst" },
  { value: "admin_assistant", he: "עוזר/ת מנהל", en: "Admin Assistant" },
];

const DIVISION_OPTIONS = [
  { value: "it", he: "חטיבת IT", en: "IT Division" },
  { value: "operations", he: "חטיבת תפעול", en: "Operations" },
  { value: "engineering", he: "חטיבת הנדסה", en: "Engineering" },
  { value: "marketing", he: "חטיבת שיווק", en: "Marketing" },
  { value: "finance", he: "חטיבת כספים", en: "Finance" },
  { value: "hr", he: "חטיבת משאבי אנוש", en: "Human Resources" },
  { value: "legal", he: "חטיבה משפטית", en: "Legal" },
  { value: "gis", he: "חטיבת GIS ומיפוי", en: "GIS & Mapping" },
];

const DEPARTMENT_OPTIONS = [
  { value: "development", he: "אגף פיתוח", en: "Development Dept." },
  { value: "infrastructure", he: "אגף תשתיות", en: "Infrastructure" },
  { value: "applications", he: "אגף יישומים", en: "Applications" },
  { value: "data", he: "אגף מידע ונתונים", en: "Data & Information" },
  { value: "projects", he: "אגף פרויקטים", en: "Projects" },
  { value: "support", he: "אגף תמיכה", en: "Support" },
  { value: "planning", he: "אגף תכנון", en: "Planning" },
  { value: "quality", he: "אגף איכות", en: "Quality" },
];

/**
 * Select with "Other" option — shows text input when "other" is selected
 */
function SelectWithOther({
  label,
  options,
  value,
  otherValue,
  onChange,
  onOtherChange,
  placeholder,
  otherPlaceholder,
  locale,
  error,
}: {
  label: string;
  options: { value: string; he: string; en: string }[];
  value: string;
  otherValue: string;
  onChange: (v: string) => void;
  onOtherChange: (v: string) => void;
  placeholder: string;
  otherPlaceholder: string;
  locale: string;
  error?: string;
}) {
  const isOther = value === "other";
  const lang = locale === "en" ? "en" : "he";

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value !== "other") onOtherChange("");
          }}
          className={cn(
            "w-full min-h-[44px] px-3 pe-8 rounded-md border bg-background text-sm appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            error && "border-red-500"
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {lang === "he" ? opt.he : opt.en}
            </option>
          ))}
          <option value="other">{txt(locale, { he: "אחר...", en: "Other..." })}</option>
        </select>
        <ChevronDown className="absolute end-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      </div>
      {isOther && (
        <Input
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={otherPlaceholder}
          className="min-h-[44px] mt-1"
          autoFocus
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function InviteMemberDialog({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<InviteFormData>({
    fullName: "", role: "", roleOther: "", division: "", divisionOther: "",
    department: "", departmentOther: "", phone: "", email: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = txt(locale, { he: "שם מלא חובה", en: "Full name required" });
    if (!form.phone.trim()) errs.phone = txt(locale, { he: "טלפון חובה", en: "Phone required" });
    else if (!/^[\d\-+() ]{7,15}$/.test(form.phone.trim()))
      errs.phone = txt(locale, { he: "מספר טלפון לא תקין", en: "Invalid phone" });
    if (!form.email.trim()) errs.email = txt(locale, { he: "מייל חובה", en: "Email required" });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = txt(locale, { he: "כתובת מייל לא תקינה", en: "Invalid email" });
    if (form.role === "other" && !form.roleOther.trim())
      errs.role = txt(locale, { he: "הזן תפקיד", en: "Enter role" });
    if (form.division === "other" && !form.divisionOther.trim())
      errs.division = txt(locale, { he: "הזן חטיבה", en: "Enter division" });
    if (form.department === "other" && !form.departmentOther.trim())
      errs.department = txt(locale, { he: "הזן אגף", en: "Enter department" });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getEffectiveValue = (selected: string, other: string, options: { value: string; he: string; en: string }[]) => {
    if (selected === "other") return other;
    const opt = options.find((o) => o.value === selected);
    return opt ? (locale === "en" ? opt.en : opt.he) : selected;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);

    await new Promise((r) => setTimeout(r, 800));

    const effectiveRole = getEffectiveValue(form.role, form.roleOther, ROLE_OPTIONS);
    const effectiveDivision = getEffectiveValue(form.division, form.divisionOther, DIVISION_OPTIONS);
    const effectiveDepartment = getEffectiveValue(form.department, form.departmentOther, DEPARTMENT_OPTIONS);

    toast.info(
      txt(locale, {
        he: `⚠️ מצב הדגמה — ${form.fullName} נרשם בהצלחה`,
        en: `⚠️ Demo mode — ${form.fullName} registered`,
      }),
      {
        description: txt(locale, {
          he: `תפקיד: ${effectiveRole || "—"} · חטיבה: ${effectiveDivision || "—"} · אגף: ${effectiveDepartment || "—"}\nבמצב הדגמה לא נשלחים מיילים/SMS. בייצור: הזמנה תישלח ל-${form.email} ול-${form.phone}.`,
          en: `Role: ${effectiveRole || "—"} · Division: ${effectiveDivision || "—"} · Dept: ${effectiveDepartment || "—"}\nDemo: no emails/SMS. Production: invite sent to ${form.email} and ${form.phone}.`,
        }),
        duration: 8000,
      }
    );

    setSending(false);
    setOpen(false);
    setForm({ fullName: "", role: "", roleOther: "", division: "", divisionOther: "", department: "", departmentOther: "", phone: "", email: "" });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{txt(locale, { he: "הזמנת חבר צוות חדש", en: "Invite Team Member" })}</DialogTitle>
          <DialogDescription>
            {txt(locale, {
              he: "מלא את הפרטים ונשלח קישור הזמנה במייל.",
              en: "Fill in the details and we'll send an invitation link.",
            })}
            {" "}<span className="text-red-500">*</span> = {txt(locale, { he: "חובה", en: "required" })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full Name * */}
          <div className="space-y-1">
            <Label>{txt(locale, { he: "שם מלא", en: "Full Name" })} <span className="text-red-500">*</span></Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder={txt(locale, { he: "ישראל ישראלי", en: "John Doe" })}
              className={cn("min-h-[44px]", errors.fullName && "border-red-500")}
            />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
          </div>

          {/* Role — SELECT with Other */}
          <SelectWithOther
            label={txt(locale, { he: "תפקיד", en: "Role" })}
            options={ROLE_OPTIONS}
            value={form.role}
            otherValue={form.roleOther}
            onChange={(v) => setForm({ ...form, role: v })}
            onOtherChange={(v) => setForm({ ...form, roleOther: v })}
            placeholder={txt(locale, { he: "— בחר תפקיד —", en: "— Select role —" })}
            otherPlaceholder={txt(locale, { he: "הקלד תפקיד מותאם...", en: "Type custom role..." })}
            locale={locale}
            error={errors.role}
          />

          {/* Division + Department — side by side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectWithOther
              label={txt(locale, { he: "חטיבה", en: "Division" })}
              options={DIVISION_OPTIONS}
              value={form.division}
              otherValue={form.divisionOther}
              onChange={(v) => setForm({ ...form, division: v })}
              onOtherChange={(v) => setForm({ ...form, divisionOther: v })}
              placeholder={txt(locale, { he: "— בחר חטיבה —", en: "— Select —" })}
              otherPlaceholder={txt(locale, { he: "חטיבה אחרת...", en: "Other division..." })}
              locale={locale}
              error={errors.division}
            />
            <SelectWithOther
              label={txt(locale, { he: "אגף", en: "Department" })}
              options={DEPARTMENT_OPTIONS}
              value={form.department}
              otherValue={form.departmentOther}
              onChange={(v) => setForm({ ...form, department: v })}
              onOtherChange={(v) => setForm({ ...form, departmentOther: v })}
              placeholder={txt(locale, { he: "— בחר אגף —", en: "— Select —" })}
              otherPlaceholder={txt(locale, { he: "אגף אחר...", en: "Other dept..." })}
              locale={locale}
              error={errors.department}
            />
          </div>

          {/* Phone * */}
          <div className="space-y-1">
            <Label>{txt(locale, { he: "טלפון נייד", en: "Mobile Phone" })} <span className="text-red-500">*</span></Label>
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
            <Label>{txt(locale, { he: "דואר אלקטרוני", en: "Email" })} <span className="text-red-500">*</span></Label>
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
              {txt(locale, { he: "ביטול", en: "Cancel" })}
            </Button>
            <Button type="submit" disabled={sending} className="min-h-[44px]">
              <Send className="size-4" />
              {sending
                ? txt(locale, { he: "שולח...", en: "Sending..." })
                : txt(locale, { he: "שלח הזמנה", en: "Send Invite" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
