"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { MockTask } from "@/lib/db/mock-data";
import { STATUS_COLORS } from "@/lib/db/types";

export function StatusDistribution({
  tasks,
  locale,
}: {
  tasks: MockTask[];
  locale: string;
}) {
  const statusLabels: Record<string, Record<string, string>> = {
    not_started: { he: "לא התחיל", en: "Not started", ru: "Не начата", fr: "Non démarré", es: "No iniciada" },
    in_progress: { he: "בביצוע", en: "In progress", ru: "В работе", fr: "En cours", es: "En progreso" },
    review: { he: "בבדיקה", en: "Review", ru: "Проверка", fr: "En revue", es: "En revisión" },
    done: { he: "הושלם", en: "Done", ru: "Завершена", fr: "Terminé", es: "Completada" },
    blocked: { he: "חסום", en: "Blocked", ru: "Заблокирована", fr: "Bloqué", es: "Bloqueada" },
    cancelled: { he: "בוטל", en: "Cancelled", ru: "Отменена", fr: "Annulé", es: "Cancelada" },
  };

  const counts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(counts).map(([status, value]) => ({
    name: statusLabels[status][locale],
    value,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
