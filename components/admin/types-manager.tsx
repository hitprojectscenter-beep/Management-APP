"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { mockItemTypes, type MockItemType } from "@/lib/db/mock-data";
import { Plus, Edit, Trash2, Lock, CheckSquare, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";

const EMOJI_OPTIONS = ["🐛", "✨", "📈", "🔬", "📝", "📅", "🛒", "💻", "🏗️", "📣", "🔧", "📋", "🚀", "🎨", "⚡", "🎯"];
const COLOR_OPTIONS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#10B981", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6",
  "#EC4899", "#64748B",
];

export function TypesManager({ locale }: { locale: string }) {
  const [types, setTypes] = useState<MockItemType[]>(mockItemTypes);
  const [scope, setScope] = useState<"task" | "project">("task");

  const filteredTypes = types.filter((t) => t.scope === scope);

  const handleSave = (type: MockItemType, isNew: boolean) => {
    if (isNew) {
      setTypes((prev) => [...prev, type]);
      toast.success(txt(locale, { he: `הסוג ${type.nameHe} נוסף`, en: `Type ${type.nameEn} added` }));
    } else {
      setTypes((prev) => prev.map((t) => (t.id === type.id ? type : t)));
      toast.success(txt(locale, { he: "הסוג עודכן", en: "Type updated" }));
    }
  };

  const handleDelete = (type: MockItemType) => {
    if (type.isSystem) {
      toast.error(txt(locale, { he: "לא ניתן למחוק סוג מערכת", en: "Cannot delete system type" }));
      return;
    }
    setTypes((prev) => prev.filter((t) => t.id !== type.id));
    toast.success(txt(locale, { he: `${type.nameHe} הוסר`, en: `${type.nameEn} removed` }));
  };

  return (
    <div className="space-y-4">
      {/* Scope toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex bg-muted/50 p-1 rounded-lg gap-1">
          <button
            onClick={() => setScope("task")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              scope === "task" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckSquare className="size-4" />
            {txt(locale, { he: "סוגי משימות", en: "Task Types" })}
            <Badge variant="outline" className="ms-1">
              {types.filter((t) => t.scope === "task").length}
            </Badge>
          </button>
          <button
            onClick={() => setScope("project")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              scope === "project" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Briefcase className="size-4" />
            {txt(locale, { he: "סוגי פרויקטים", en: "Project Types" })}
            <Badge variant="outline" className="ms-1">
              {types.filter((t) => t.scope === "project").length}
            </Badge>
          </button>
        </div>
        <TypeDialog scope={scope} onSave={handleSave} locale={locale}>
          <Button>
            <Plus className="size-4" />
            {txt(locale, { he: "הוסף סוג חדש", en: "Add New Type" })}
          </Button>
        </TypeDialog>
      </div>

      {/* Types grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTypes.map((type) => (
          <Card key={type.id} className="card-hover overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: type.color }} />
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="size-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: `${type.color}20`, color: type.color }}
                >
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold">{txt(locale, { he: type.nameHe, en: type.nameEn })}</h4>
                    {type.isSystem && <Lock className="size-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{type.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {type.scope === "task" ? txt(locale, { he: "משימה", en: "task" }) : txt(locale, { he: "פרויקט", en: "project" })}
                    </Badge>
                    {type.isSystem && (
                      <Badge variant="secondary" className="text-[10px]">
                        {txt(locale, { he: "מערכת", en: "system" })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t">
                <TypeDialog type={type} scope={scope} onSave={handleSave} locale={locale}>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Edit className="size-3.5" />
                  </Button>
                </TypeDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30"
                  onClick={() => handleDelete(type)}
                  disabled={type.isSystem}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TypeDialog({
  type,
  scope,
  children,
  onSave,
  locale,
}: {
  type?: MockItemType;
  scope: "task" | "project";
  children: React.ReactNode;
  onSave: (type: MockItemType, isNew: boolean) => void;
  locale: string;
}) {
  const isNew = !type;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MockItemType>(
    type || {
      id: `${scope === "task" ? "tt" : "pt"}-${Date.now()}`,
      scope,
      nameHe: "",
      nameEn: "",
      icon: "📌",
      color: "#3B82F6",
      description: "",
      isSystem: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameHe.trim() || !form.nameEn.trim()) {
      toast.error(txt(locale, { he: "שם נדרש בשתי השפות", en: "Name required in both languages" }));
      return;
    }
    onSave(form, isNew);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isNew
              ? txt(locale, {
                  he: `הוספת סוג ${scope === "task" ? "משימה" : "פרויקט"} חדש`,
                  en: `Add New ${scope === "task" ? "Task" : "Project"} Type`,
                })
              : txt(locale, { he: "עריכת סוג", en: "Edit Type" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, { he: "סוג מותאם להגדרות הארגון שלך", en: "Custom type tailored to your organization" })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nameHe">{txt(locale, { he: "שם בעברית", en: "Hebrew Name" })} *</Label>
              <Input
                id="nameHe"
                value={form.nameHe}
                onChange={(e) => setForm({ ...form, nameHe: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameEn">{txt(locale, { he: "שם באנגלית", en: "English Name" })} *</Label>
              <Input
                id="nameEn"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{txt(locale, { he: "תיאור", en: "Description" })}</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{txt(locale, { he: "אייקון", en: "Icon" })}</Label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm({ ...form, icon: e })}
                  className={cn(
                    "size-10 rounded-md text-2xl flex items-center justify-center border-2 transition-all",
                    form.icon === e ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{txt(locale, { he: "צבע", en: "Color" })}</Label>
            <div className="grid grid-cols-12 gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    "size-7 rounded-full border-2 transition-all",
                    form.color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                  )}
                  style={{ backgroundColor: c, borderColor: c }}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {txt(locale, { he: "ביטול", en: "Cancel" })}
            </Button>
            <Button type="submit">{isNew ? txt(locale, { he: "הוסף סוג", en: "Add Type" }) : txt(locale, { he: "שמור", en: "Save" })}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
