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
  const statusLabels: Record<string, { he: string; en: string }> = {
    not_started: { he: "לא התחיל", en: "Not started" },
    in_progress: { he: "בביצוע", en: "In progress" },
    review: { he: "בבדיקה", en: "Review" },
    done: { he: "הושלם", en: "Done" },
    blocked: { he: "חסום", en: "Blocked" },
    cancelled: { he: "בוטל", en: "Cancelled" },
  };

  const counts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(counts).map(([status, value]) => ({
    name: statusLabels[status][locale as "he" | "en"],
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
