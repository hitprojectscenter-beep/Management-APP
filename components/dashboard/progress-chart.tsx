"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { week: "W1", done: 8, inProgress: 12, blocked: 1 },
  { week: "W2", done: 12, inProgress: 14, blocked: 2 },
  { week: "W3", done: 18, inProgress: 11, blocked: 1 },
  { week: "W4", done: 22, inProgress: 13, blocked: 3 },
  { week: "W5", done: 28, inProgress: 15, blocked: 2 },
  { week: "W6", done: 34, inProgress: 12, blocked: 1 },
];

export function ProgressChart({ locale }: { locale: string }) {
  const labels = locale === "he"
    ? { done: "הושלמו", inProgress: "בביצוע", blocked: "חסומות" }
    : { done: "Done", inProgress: "In Progress", blocked: "Blocked" };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cDone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cProg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cBlock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="done" name={labels.done} stroke="hsl(142, 71%, 45%)" fill="url(#cDone)" strokeWidth={2} />
        <Area type="monotone" dataKey="inProgress" name={labels.inProgress} stroke="hsl(217, 91%, 60%)" fill="url(#cProg)" strokeWidth={2} />
        <Area type="monotone" dataKey="blocked" name={labels.blocked} stroke="hsl(0, 84%, 60%)" fill="url(#cBlock)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
