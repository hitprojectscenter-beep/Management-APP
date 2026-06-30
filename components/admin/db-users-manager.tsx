"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, KeyRound, Trash2, Copy, Shield, X, Loader2, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  title: string | null;
  phone: string | null;
  managerId: string | null;
  isActive: boolean;
}

const ROLES = [
  { value: "admin", he: "מנהל מערכת", en: "Admin" },
  { value: "manager", he: "מנהל", en: "Manager" },
  { value: "member", he: "חבר צוות", en: "Member" },
  { value: "viewer", he: "צופה", en: "Viewer" },
  { value: "guest", he: "אורח", en: "Guest" },
];
const roleLabel = (locale: string, r: string) => {
  const o = ROLES.find((x) => x.value === r);
  return o ? (txt(locale, { he: o.he, en: o.en }) as string) : r;
};

/**
 * DB-backed user administration (admin only). Talks to /api/admin/users —
 * every mutation persists to Postgres and is RBAC-checked server-side.
 * Used by the admin "users" tab whenever a database is configured.
 */
export function DbUsersManager({ locale }: { locale: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "member", managerId: "", title: "", phone: "" });
  const [tempPw, setTempPw] = useState<{ name: string; password: string } | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", title: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else toast.error(txt(locale, { he: "טעינת המשתמשים נכשלה", en: "Failed to load users" }) as string);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameById = (id: string | null) => (id ? users.find((u) => u.id === id)?.name || "—" : "—");

  const patchUser = async (id: string, body: Record<string, unknown>, okMsg: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)));
        toast.success(okMsg);
      } else {
        toast.error(
          data.error === "cannot_modify_self"
            ? (txt(locale, { he: "אינך יכול לשנות את ההרשאות/סטטוס של עצמך", en: "You can't change your own role/status" }) as string)
            : (txt(locale, { he: "העדכון נכשל", en: "Update failed" }) as string),
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditForm({ name: u.name || "", email: u.email, phone: u.phone || "", title: u.title || "" });
  };
  const saveEdit = async () => {
    if (!editUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error(txt(locale, { he: "נא למלא שם ומייל", en: "Name and email required" }) as string);
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, email: editForm.email, phone: editForm.phone || null, title: editForm.title || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...data.user } : u)));
        toast.success(txt(locale, { he: "פרטי המשתמש עודכנו", en: "User updated" }) as string);
        setEditUser(null);
      } else {
        toast.error(
          data.error === "email_exists" ? (txt(locale, { he: "המייל כבר קיים במערכת", en: "Email already exists" }) as string)
          : data.error === "invalid_email" ? (txt(locale, { he: "כתובת מייל לא תקינה", en: "Invalid email" }) as string)
          : (txt(locale, { he: "העדכון נכשל", en: "Update failed" }) as string),
        );
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const resetPassword = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/password`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setTempPw({ name: u.name || u.email, password: data.tempPassword });
      else toast.error(txt(locale, { he: "איפוס הסיסמה נכשל", en: "Password reset failed" }) as string);
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(txt(locale, { he: `למחוק את ${u.name}? פעולה זו בלתי הפיכה.`, en: `Delete ${u.name}? This cannot be undone.` }) as string)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        toast.success(txt(locale, { he: "המשתמש נמחק", en: "User deleted" }) as string);
      } else {
        const data = await res.json();
        toast.error(
          data.error === "cannot_delete_self"
            ? (txt(locale, { he: "אינך יכול למחוק את עצמך", en: "You can't delete yourself" }) as string)
            : (txt(locale, { he: "המחיקה נכשלה", en: "Delete failed" }) as string),
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const addUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error(txt(locale, { he: "נא למלא שם ומייל", en: "Name and email required" }) as string);
      return;
    }
    setBusyId("__add__");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role, managerId: form.managerId || null, title: form.title || null, phone: form.phone || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => [...prev, data.user]);
        setTempPw({ name: data.user.name, password: data.tempPassword });
        setShowAdd(false);
        setForm({ name: "", email: "", role: "member", managerId: "", title: "", phone: "" });
      } else {
        toast.error(
          data.error === "email_exists"
            ? (txt(locale, { he: "המייל כבר קיים במערכת", en: "Email already exists" }) as string)
            : (txt(locale, { he: "יצירת המשתמש נכשלה", en: "Create failed" }) as string),
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin me-2" /> {txt(locale, { he: "טוען משתמשים...", en: "Loading users..." })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* One-time temp password banner */}
      {tempPw && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
          <KeyRound className="size-5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-semibold text-emerald-900 dark:text-emerald-100">
              {txt(locale, { he: `סיסמה זמנית עבור ${tempPw.name}:`, en: `Temporary password for ${tempPw.name}:` })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono font-bold text-base bg-white dark:bg-black/30 px-2 py-1 rounded border" dir="ltr">{tempPw.password}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(tempPw.password); toast.success(txt(locale, { he: "הועתק", en: "Copied" }) as string); }}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                <Copy className="size-3.5" /> {txt(locale, { he: "העתק", en: "Copy" })}
              </button>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 mt-1">
              {txt(locale, { he: "מסור/י אותה למשתמש. הוא יתבקש להחליף סיסמה בכניסה הראשונה. (מוצגת פעם אחת בלבד.)", en: "Hand it to the user. They'll be asked to change it on first login. (Shown once.)" })}
            </p>
          </div>
          <button onClick={() => setTempPw(null)} className="text-emerald-700 dark:text-emerald-300 shrink-0"><X className="size-4" /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{users.length} {txt(locale, { he: "משתמשים", en: "users" })}</div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex items-center gap-2 px-3 min-h-[40px] rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-card hover:shadow-pop hover:-translate-y-0.5 transition-all"
        >
          <UserPlus className="size-4" /> {txt(locale, { he: "הוסף משתמש", en: "Add user" })}
        </button>
      </div>

      {/* Add-user form */}
      {showAdd && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border bg-card shadow-card">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={txt(locale, { he: "שם מלא", en: "Full name" }) as string}
            title={txt(locale, { he: "השם המלא של המשתמש כפי שיוצג בכל המערכת. הזן שם פרטי ושם משפחה. שדה חובה.", en: "The user's full name as shown throughout the system. Enter first and last name. Required field." }) as string}
            className="min-h-[44px] px-3 rounded-md border bg-background text-sm"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@mapi.gov.il"
            dir="ltr"
            title={txt(locale, { he: "כתובת הדואר האלקטרוני הארגונית. משמשת כשם המשתמש לכניסה ולקבלת התראות. חייבת להיות ייחודית במערכת. שדה חובה.", en: "The organizational email address. Used as the login username and for notifications. Must be unique in the system. Required field." }) as string}
            className="min-h-[44px] px-3 rounded-md border bg-background text-sm"
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} title={txt(locale, { he: "רמת ההרשאה של המשתמש: מנהל מערכת, מנהל, חבר צוות, צופה או אורח. ההרשאה קובעת לאילו מסכים ופעולות יש למשתמש גישה.", en: "The user's permission level: Admin, Manager, Member, Viewer or Guest. The role determines which screens and actions the user can access." }) as string} className="min-h-[44px] px-3 rounded-md border bg-background text-sm">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{roleLabel(locale, r.value)}</option>)}
          </select>
          <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} title={txt(locale, { he: "המנהל הישיר שאליו המשתמש כפוף. בונה את היררכיית הארגון וקובע אילו משימות המנהל יראה. שדה רשות.", en: "The direct manager this user reports to. Builds the org hierarchy and determines which tasks the manager can see. Optional field." }) as string} className="min-h-[44px] px-3 rounded-md border bg-background text-sm">
            <option value="">{txt(locale, { he: "— מנהל ישיר (רשות) —", en: "— Direct manager (optional) —" })}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={txt(locale, { he: "תפקיד / אגף (רשות)", en: "Title / department (optional)" }) as string}
            title={txt(locale, { he: "התפקיד או האגף של המשתמש בארגון (לדוגמה: מנהל פרויקטים, אגף יישומים). מוצג בכרטיס המשתמש ובבורר המנהל הישיר. שדה רשות.", en: "The user's job title or department (e.g. Project Manager, Applications Dept.). Shown in the user card and the direct-manager picker. Optional field." }) as string}
            className="min-h-[44px] px-3 rounded-md border bg-background text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={txt(locale, { he: "טלפון נייד (רשות)", en: "Mobile phone (optional)" }) as string}
            dir="ltr"
            title={txt(locale, { he: "מספר הטלפון הנייד של המשתמש. משמש ליצירת קשר ולשליחת הודעות (למשל WhatsApp). שדה רשות.", en: "The user's mobile phone number. Used for contact and for sending messages (e.g. WhatsApp). Optional field." }) as string}
            className="min-h-[44px] px-3 rounded-md border bg-background text-sm"
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 min-h-[40px] rounded-xl border text-sm">{txt(locale, { he: "ביטול", en: "Cancel" })}</button>
            <button onClick={addUser} disabled={busyId === "__add__"} className="px-4 min-h-[40px] rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
              {busyId === "__add__" ? txt(locale, { he: "יוצר...", en: "Creating..." }) : txt(locale, { he: "צור משתמש", en: "Create user" })}
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-start font-medium px-3 py-2.5">{txt(locale, { he: "משתמש", en: "User" })}</th>
                <th className="text-start font-medium px-3 py-2.5">{txt(locale, { he: "תפקיד", en: "Role" })}</th>
                <th className="text-start font-medium px-3 py-2.5 hidden md:table-cell">{txt(locale, { he: "מנהל ישיר", en: "Manager" })}</th>
                <th className="text-start font-medium px-3 py-2.5">{txt(locale, { he: "סטטוס", en: "Status" })}</th>
                <th className="text-end font-medium px-3 py-2.5">{txt(locale, { he: "פעולות", en: "Actions" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className={cn("hover:bg-accent/30 transition-colors", busyId === u.id && "opacity-50")}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u.image || undefined} fallback={(u.name || u.email)[0]} className="size-8 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          {u.name}
                          {u.role === "admin" && <Shield className="size-3 text-amber-500" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate" dir="ltr">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => patchUser(u.id, { role: e.target.value }, txt(locale, { he: "התפקיד עודכן", en: "Role updated" }) as string)}
                      className="min-h-[36px] px-2 rounded-md border bg-background text-xs"
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{roleLabel(locale, r.value)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <select
                      value={u.managerId || ""}
                      disabled={busyId === u.id}
                      onChange={(e) => patchUser(u.id, { managerId: e.target.value || null }, txt(locale, { he: "המנהל הישיר עודכן", en: "Manager updated" }) as string)}
                      className="min-h-[36px] px-2 rounded-md border bg-background text-xs max-w-[150px]"
                    >
                      <option value="">—</option>
                      {users.filter((x) => x.id !== u.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => patchUser(u.id, { isActive: !u.isActive }, txt(locale, { he: "הסטטוס עודכן", en: "Status updated" }) as string)}
                      disabled={busyId === u.id}
                    >
                      <Badge variant="outline" className={cn("cursor-pointer", u.isActive ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-slate-300 text-muted-foreground")}>
                        {u.isActive ? txt(locale, { he: "פעיל", en: "Active" }) : txt(locale, { he: "מושבת", en: "Disabled" })}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        disabled={busyId === u.id}
                        title={txt(locale, { he: "ערוך פרטים", en: "Edit details" }) as string}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={busyId === u.id}
                        title={txt(locale, { he: "איפוס סיסמה", en: "Reset password" }) as string}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        <KeyRound className="size-4" />
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        disabled={busyId === u.id}
                        title={txt(locale, { he: "מחק", en: "Delete" }) as string}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {txt(locale, {
          he: "כל שינוי נשמר מיידית ב-PostgreSQL ונרשם ב-audit log. השבתת חשבון מנתקת מיד את כל ה-sessions שלו.",
          en: "Every change persists to PostgreSQL and is written to the audit log. Disabling an account revokes all its sessions immediately.",
        })}
      </p>

      {/* Edit-user dialog — name / email / phone / title */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !savingEdit && setEditUser(null)}>
          <div className="w-full max-w-md rounded-xl bg-background shadow-xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-sm">{txt(locale, { he: "עריכת פרטי משתמש", en: "Edit user details" })}</h3>
              <button onClick={() => !savingEdit && setEditUser(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{txt(locale, { he: "שם מלא *", en: "Full name *" })}</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} title={txt(locale, { he: "השם המלא של המשתמש כפי שיוצג בכל המערכת. הזן שם פרטי ושם משפחה. שדה חובה.", en: "The user's full name as shown throughout the system. Enter first and last name. Required field." }) as string} className="w-full min-h-[40px] px-3 rounded-md border bg-background text-sm" style={{ fontSize: "16px" }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{txt(locale, { he: "מייל ארגוני *", en: "Email *" })}</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} dir="ltr" title={txt(locale, { he: "כתובת הדואר האלקטרוני הארגונית. משמשת כשם המשתמש לכניסה למערכת. חייבת להיות ייחודית. שדה חובה.", en: "The organizational email address. Used as the login username. Must be unique. Required field." }) as string} className="w-full min-h-[40px] px-3 rounded-md border bg-background text-sm" style={{ fontSize: "16px" }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{txt(locale, { he: "טלפון נייד", en: "Mobile phone" })}</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" title={txt(locale, { he: "מספר הטלפון הנייד של המשתמש. משמש ליצירת קשר ולשליחת הודעות. ניתן להשאיר ריק.", en: "The user's mobile phone number. Used for contact and messaging. May be left blank." }) as string} className="w-full min-h-[40px] px-3 rounded-md border bg-background text-sm" style={{ fontSize: "16px" }} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{txt(locale, { he: "תפקיד / אגף", en: "Title / department" })}</label>
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} title={txt(locale, { he: "התפקיד או האגף של המשתמש בארגון (לדוגמה: מנהל פרויקטים, אגף יישומים). מוצג בכרטיס המשתמש. ניתן להשאיר ריק.", en: "The user's job title or department (e.g. Project Manager, Applications Dept.). Shown in the user card. May be left blank." }) as string} className="w-full min-h-[40px] px-3 rounded-md border bg-background text-sm" style={{ fontSize: "16px" }} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button onClick={() => setEditUser(null)} disabled={savingEdit} className="px-3 min-h-[40px] rounded-xl border text-sm">{txt(locale, { he: "ביטול", en: "Cancel" })}</button>
              <button onClick={saveEdit} disabled={savingEdit} className="px-4 min-h-[40px] rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 inline-flex items-center gap-1">
                {savingEdit && <Loader2 className="size-3.5 animate-spin" />}
                {txt(locale, { he: "שמור", en: "Save" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
