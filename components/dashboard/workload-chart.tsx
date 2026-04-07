"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MockTask, MockUser } from "@/lib/db/mock-data";

export function WorkloadChart({
  users,
  tasks,
  locale,
}: {
  users: MockUser[];
  tasks: MockTask[];
  locale: string;
}) {
  const data = users.map((user) => {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    return {
      name: user.name.split(" ")[0],
      open: userTasks.filter((t) => t.status === "in_progress" || t.status === "not_started").length,
      done: userTasks.filter((t) => t.status === "done").length,
      blocked: userTasks.filter((t) => t.status === "blocked").length,
    };
  });

  const labels = locale === "he"
    ? { open: "פתוחות", done: "הושלמו", blocked: "חסומות" }
    : { open: "Open", done: "Done", blocked: "Blocked" };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="open" name={labels.open} stackId="a" fill="hsl(217, 91%, 60%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="done" name={labels.done} stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="blocked" name={labels.blocked} stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
