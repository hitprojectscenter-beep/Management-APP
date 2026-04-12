"use client";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { mockUsers, type MockUser } from "@/lib/db/mock-data";
import { ROLE_LABELS } from "@/lib/rbac/abilities";
import { UserPlus, Mail, Edit, Trash2, Search, Filter, Crown } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

export function UsersManager({ locale }: { locale: string }) {
  const [users, setUsers] = useState<MockUser[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleSave = (user: MockUser, isNew: boolean) => {
    if (isNew) {
      setUsers((prev) => [...prev, user]);
      toast.success(txt(locale, { he: `המשתמש ${user.name} נוסף בהצלחה`, en: `User ${user.name} added successfully` }));
    } else {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      toast.success(txt(locale, { he: `המשתמש ${user.name} עודכן`, en: `User ${user.name} updated` }));
    }
  };

  const handleDelete = (user: MockUser) => {
    if (user.id === "u6") {
      toast.error(txt(locale, { he: "לא ניתן למחוק את המשתמש הנוכחי", en: "Cannot delete current user" }));
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    toast.success(txt(locale, { he: `${user.name} הוסר`, en: `${user.name} removed` }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={txt(locale, { he: "חיפוש לפי שם או אימייל...", en: "Search by name or email..." })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">{txt(locale, { he: "כל התפקידים", en: "All Roles" })}</option>
            <option value="admin">{ROLE_LABELS.admin[locale]}</option>
            <option value="manager">{ROLE_LABELS.manager[locale]}</option>
            <option value="member">{ROLE_LABELS.member[locale]}</option>
            <option value="viewer">{ROLE_LABELS.viewer[locale]}</option>
            <option value="guest">{ROLE_LABELS.guest[locale]}</option>
          </select>
        </div>
        <UserDialog onSave={handleSave} locale={locale}>
          <Button>
            <UserPlus className="size-4" />
            {txt(locale, { he: "הוסף משתמש", en: "Add User" })}
          </Button>
        </UserDialog>
      </div>

      {/* Users table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{txt(locale, { he: "משתמש", en: "User" })}</th>
              <th className="text-start px-4 py-3 font-medium hidden md:table-cell">{txt(locale, { he: "אימייל", en: "Email" })}</th>
              <th className="text-start px-4 py-3 font-medium">{txt(locale, { he: "תפקיד", en: "Role" })}</th>
              <th className="text-start px-4 py-3 font-medium hidden lg:table-cell">{txt(locale, { he: "שפה", en: "Locale" })}</th>
              <th className="text-end px-4 py-3 font-medium">{txt(locale, { he: "פעולות", en: "Actions" })}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  {txt(locale, { he: "לא נמצאו משתמשים", en: "No users found" })}
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t hover:bg-accent/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.image} fallback={user.name[0]} className="size-9" />
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{user.name}</span>
                      {user.role === "admin" && <Crown className="size-3.5 text-amber-500" />}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3" />
                    ●●●●@mapi.gov.il
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.role === "admin" ? "destructive" : user.role === "manager" ? "default" : "secondary"}>
                    {ROLE_LABELS[user.role][locale]}
                  </Badge>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs uppercase font-mono">{user.locale}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <UserDialog user={user} onSave={handleSave} locale={locale}>
                      <Button variant="ghost" size="icon" className="size-8">
                        <Edit className="size-3.5" />
                      </Button>
                    </UserDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {txt(locale, { he: `מציג ${filteredUsers.length} מתוך ${users.length} משתמשים`, en: `Showing ${filteredUsers.length} of ${users.length} users` })}
      </div>
    </div>
  );
}

function UserDialog({
  user,
  children,
  onSave,
  locale,
}: {
  user?: MockUser;
  children: React.ReactNode;
  onSave: (user: MockUser, isNew: boolean) => void;
  locale: string;
}) {
  const isNew = !user;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MockUser>(
    user || {
      id: `u${Date.now()}`,
      name: "",
      email: "",
      image: "",
      locale: "he",
      role: "member",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error(txt(locale, { he: "שם ואימייל נדרשים", en: "Name and email required" }));
      return;
    }
    const finalUser = {
      ...form,
      image: form.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.name)}`,
    };
    onSave(finalUser, isNew);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isNew ? txt(locale, { he: "הוספת משתמש חדש", en: "Add New User" }) : txt(locale, { he: "עריכת משתמש", en: "Edit User" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, { he: "מלא את פרטי המשתמש בטופס למטה", en: "Fill in the user details below" })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{txt(locale, { he: "שם מלא", en: "Full Name" })} *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{txt(locale, { he: "אימייל", en: "Email" })} *</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="role">{txt(locale, { he: "תפקיד", en: "Role" })}</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="admin">{ROLE_LABELS.admin[locale]}</option>
                <option value="manager">{ROLE_LABELS.manager[locale]}</option>
                <option value="member">{ROLE_LABELS.member[locale]}</option>
                <option value="viewer">{ROLE_LABELS.viewer[locale]}</option>
                <option value="guest">{ROLE_LABELS.guest[locale]}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">{txt(locale, { he: "שפה", en: "Language" })}</Label>
              <select
                id="locale"
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value as "he" | "en" })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="he">{txt(locale, { he: "עברית", en: "Hebrew" })}</option>
                <option value="en">{txt(locale, { he: "אנגלית", en: "English" })}</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {txt(locale, { he: "ביטול", en: "Cancel" })}
            </Button>
            <Button type="submit">
              {isNew ? txt(locale, { he: "הוסף משתמש", en: "Add User" }) : txt(locale, { he: "שמור", en: "Save" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
