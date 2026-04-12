"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { txt } from "@/lib/utils/locale-text";
import { toast } from "sonner";
import type { MockUser } from "@/lib/db/mock-data";

export function ReassignTaskDialog({
  taskTitle,
  currentAssigneeId,
  users,
  locale,
  children,
  onReassign,
}: {
  taskTitle: string;
  currentAssigneeId: string | null;
  users: MockUser[];
  locale: string;
  children: React.ReactNode;
  onReassign?: (newUserId: string, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [reason, setReason] = useState("");
  const Arrow = locale === "he" ? ArrowLeft : ArrowRight;

  const currentUser = users.find((u) => u.id === currentAssigneeId);
  const candidates = users.filter(
    (u) => u.id !== currentAssigneeId && u.role !== "guest" && u.role !== "viewer"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error(txt(locale, { he: "חובה לבחור משתמש חדש", en: "Must select a new user" }));
      return;
    }
    const newUser = users.find((u) => u.id === selected);
    toast.success(
      txt(locale, { he: `המשימה "${taskTitle}" שויכה מחדש`, en: `Task "${taskTitle}" reassigned` }),
      {
        description: txt(locale, {
          he: `מ-${currentUser?.name || "—"} ל-${newUser?.name || "—"}${reason ? ` · ${reason.slice(0, 60)}` : ""}`,
          en: `From ${currentUser?.name || "—"} to ${newUser?.name || "—"}`,
        }),
      }
    );
    if (onReassign) onReassign(selected, reason);
    setOpen(false);
    setSelected("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-blue-600" />
            {txt(locale, { he: "שיוך מחדש", en: "Reassign Task" })}
          </DialogTitle>
          <DialogDescription>
            {txt(locale, {
              he: `שיוך מחדש של "${taskTitle}" למשתמש אחר`,
              en: `Reassign "${taskTitle}" to another user`,
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current → New visualization */}
          {currentUser && (
            <div className="flex items-center gap-3 justify-center p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <Avatar src={currentUser.image} fallback={currentUser.name[0]} className="size-10 mx-auto mb-1" />
                <div className="text-xs font-medium">{currentUser.name}</div>
                <Badge variant="secondary" className="text-[9px]">{txt(locale, { he: "נוכחי", en: "Current" })}</Badge>
              </div>
              <Arrow className="size-5 text-muted-foreground" />
              <div className="text-center">
                {selected ? (
                  <>
                    <Avatar
                      src={users.find((u) => u.id === selected)?.image}
                      fallback={users.find((u) => u.id === selected)?.name[0] || "?"}
                      className="size-10 mx-auto mb-1 ring-2 ring-blue-500"
                    />
                    <div className="text-xs font-medium">{users.find((u) => u.id === selected)?.name}</div>
                    <Badge className="text-[9px]">{txt(locale, { he: "חדש", en: "New" })}</Badge>
                  </>
                ) : (
                  <>
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-1 border-2 border-dashed">
                      <span className="text-lg">?</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{txt(locale, { he: "בחר", en: "Select" })}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* User selection */}
          <div className="space-y-1.5">
            <Label>{txt(locale, { he: "בחר משתמש חדש", en: "Select new user" })} <span className="text-red-500">*</span></Label>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {candidates.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelected(user.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg border text-start transition-all min-h-[44px]",
                    selected === user.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <Avatar src={user.image} fallback={user.name[0]} className="size-8" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-[10px] text-muted-foreground">{user.role}</div>
                  </div>
                  {selected === user.id && <span className="text-blue-600 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>{txt(locale, { he: "סיבת השיוך מחדש", en: "Reason" })}</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder={txt(locale, { he: "אופציונלי - עד 200 תווים", en: "Optional - up to 200 chars" })}
              rows={2}
              maxLength={200}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              style={{ fontSize: "16px" }}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
              {txt(locale, { he: "ביטול", en: "Cancel", ru: "Отмена", fr: "Annuler", es: "Cancelar" })}
            </Button>
            <Button type="submit" disabled={!selected} className="min-h-[44px]">
              <Users className="size-4" />
              {txt(locale, { he: "שייך מחדש", en: "Reassign" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
