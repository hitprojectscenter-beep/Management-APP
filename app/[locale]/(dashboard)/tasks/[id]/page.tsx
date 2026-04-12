import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  getTaskById,
  getCommentsByTask,
  getRisksByTask,
  getUserById,
  getWbsNodeById,
  getAllMembersOfNodeRecursive,
  mockUsers,
} from "@/lib/db/mock-data";
import { ProjectMembers } from "@/components/members/project-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Tag,
  User as UserIcon,
  MessageSquare,
  Paperclip,
  History,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { cn, formatDate, formatDateTime, calculateVariance } from "@/lib/utils";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const task = getTaskById(id);
  if (!task) notFound();

  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
  const comments = getCommentsByTask(task.id);
  const risks = getRisksByTask(task.id);
  const wbsNode = getWbsNodeById(task.wbsNodeId);
  const variance = calculateVariance(task.plannedEnd, task.actualEnd);
  const members = getAllMembersOfNodeRecursive(task.wbsNodeId);

  const STATUS_LABELS: Record<string, Record<string, string>> = {
    not_started: { he: "לא התחיל", en: "Not started", ru: "Не начата", fr: "Non démarré", es: "No iniciada" },
    in_progress: { he: "בביצוע", en: "In progress", ru: "В работе", fr: "En cours", es: "En progreso" },
    review: { he: "בבדיקה", en: "Review", ru: "Проверка", fr: "En revue", es: "En revisión" },
    done: { he: "הושלם", en: "Done", ru: "Завершена", fr: "Terminé", es: "Completada" },
    blocked: { he: "חסום", en: "Blocked", ru: "Заблокирована", fr: "Bloqué", es: "Bloqueada" },
    cancelled: { he: "בוטל", en: "Cancelled", ru: "Отменена", fr: "Annulé", es: "Cancelada" },
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {wbsNode && (
            <>
              <GitBranch className="size-3" />
              <span>{locale === "he" ? wbsNode.name : wbsNode.nameEn || wbsNode.name}</span>
            </>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            {locale === "he" ? task.title : task.titleEn || task.title}
          </h1>
          <div className="flex gap-2">
            <span className={cn("status-badge", `status-${task.status}`)}>
              {STATUS_LABELS[task.status][locale]}
            </span>
            <span className={cn("status-badge", `priority-${task.priority}`)}>
              {task.priority}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {locale === "he" ? "תיאור" : "Description"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
              </CardContent>
            </Card>
          )}

          {/* AI Risks */}
          {risks.length > 0 && (
            <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/30 to-transparent dark:from-orange-950/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="size-4 text-orange-500" />
                  {locale === "he" ? "תובנות AI" : "AI Insights"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {risks.map((risk) => (
                  <div key={risk.id} className="flex gap-3 p-3 rounded-md bg-background/60 border-s-4 border-orange-500">
                    <AlertTriangle className="size-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="text-sm flex-1">
                      <div className="font-medium">
                        {locale === "he" ? risk.message : risk.messageEn || risk.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{risk.suggestion}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-4" />
                {locale === "he" ? "תגובות" : "Comments"} ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {locale === "he" ? "אין תגובות עדיין" : "No comments yet"}
                </div>
              )}
              {comments.map((c) => {
                const author = getUserById(c.authorId);
                return (
                  <div key={c.id} className="flex gap-3">
                    {author && (
                      <Avatar src={author.image} fallback={author.name[0]} className="size-9 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{author?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(c.createdAt, locale)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Side column - metadata */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {locale === "he" ? "התקדמות" : "Progress"}
                </div>
                <Progress value={task.progressPercent} className="h-2" />
                <div className="text-sm font-semibold mt-1">{task.progressPercent}%</div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                {assignee && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <UserIcon className="size-4" />
                      {locale === "he" ? "אחראי" : "Assignee"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Avatar src={assignee.image} fallback={assignee.name[0]} className="size-6" />
                      <span className="font-medium">{assignee.name}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-4" />
                    {locale === "he" ? "תאריך התחלה" : "Start"}
                  </span>
                  <span className="font-medium">{formatDate(task.plannedStart, locale)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-4" />
                    {locale === "he" ? "תאריך יעד" : "Due"}
                  </span>
                  <span className="font-medium">{formatDate(task.plannedEnd, locale)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="size-4" />
                    {locale === "he" ? "הערכה" : "Estimate"}
                  </span>
                  <span className="font-medium">
                    {task.actualHours}/{task.estimateHours}{locale === "he" ? " שעות" : "h"}
                  </span>
                </div>

                {variance.status !== "pending" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {locale === "he" ? "סטייה" : "Variance"}
                    </span>
                    <Badge
                      variant={
                        variance.status === "late" ? "destructive" : variance.status === "early" ? "success" : "secondary"
                      }
                    >
                      {variance.days > 0 ? "+" : ""}
                      {variance.days} {locale === "he" ? "ימים" : "days"}
                    </Badge>
                  </div>
                )}
              </div>

              {task.tags.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Tag className="size-3" />
                    {locale === "he" ? "תגיות" : "Tags"}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" variant="outline">
            <History className="size-4" />
            {locale === "he" ? "צפה בהיסטוריה" : "View history"}
          </Button>

          <ProjectMembers
            members={members}
            users={mockUsers}
            locale={locale}
            title={locale === "he" ? "צוות המשימה" : "Task Team"}
          />
        </div>
      </div>
    </div>
  );
}
