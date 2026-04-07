/**
 * Export utilities for Gantt + WBS view.
 * - CSV export (Excel-compatible with BOM for Hebrew)
 * - Print/PDF via window.print()
 */
import type { MockTask, MockWbsNode } from "@/lib/db/mock-data";
import type { WbsRollup } from "./rollup";

interface ExportRow {
  number: string;
  level: string;
  name: string;
  type: "wbs" | "task";
  status: string;
  assignee?: string;
  plannedStart: string;
  plannedEnd: string;
  estimateHours: number;
  actualHours: number;
  progress: number;
  costPlanned?: number;
  costActual?: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL");
}

export function exportToCsv(rows: ExportRow[], filename: string): void {
  const headers = [
    "מספור",
    "רמה",
    "שם",
    "סוג",
    "סטטוס",
    "אחראי",
    "תאריך התחלה",
    "תאריך סיום",
    "שעות מתוכננות",
    "שעות בפועל",
    "התקדמות %",
    "עלות מתוכננת ₪",
    "עלות בפועל ₪",
  ];

  const escape = (v: string | number | undefined): string => {
    if (v === undefined || v === null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.number,
        r.level,
        r.name,
        r.type,
        r.status,
        r.assignee || "",
        formatDate(r.plannedStart),
        formatDate(r.plannedEnd),
        r.estimateHours,
        r.actualHours,
        Math.round(r.progress),
        r.costPlanned || "",
        r.costActual || "",
      ]
        .map(escape)
        .join(",")
    ),
  ];

  // BOM for Excel to recognize UTF-8 (so Hebrew renders correctly)
  const BOM = "\uFEFF";
  const csv = BOM + lines.join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildExportRows(
  nodes: MockWbsNode[],
  tasks: MockTask[],
  rollups: Map<string, WbsRollup>,
  numbering: Map<string, string>,
  users: { id: string; name: string }[]
): ExportRow[] {
  const rows: ExportRow[] = [];

  // WBS nodes
  for (const node of nodes) {
    const r = rollups.get(node.id);
    rows.push({
      number: numbering.get(node.id) || "",
      level: node.level,
      name: node.name,
      type: "wbs",
      status: "",
      plannedStart: r?.plannedStart || "",
      plannedEnd: r?.plannedEnd || "",
      estimateHours: r?.totalEstimateHours || 0,
      actualHours: r?.totalActualHours || 0,
      progress: r?.weightedProgress || 0,
      costPlanned: r?.costPlanned,
      costActual: r?.costActual,
    });
  }

  // Direct tasks
  tasks.forEach((task, idx) => {
    const parentNumber = numbering.get(task.wbsNodeId) || "";
    const assignee = users.find((u) => u.id === task.assigneeId)?.name;
    rows.push({
      number: `${parentNumber}.t${idx + 1}`,
      level: "task",
      name: task.title,
      type: "task",
      status: task.status,
      assignee,
      plannedStart: task.plannedStart,
      plannedEnd: task.plannedEnd,
      estimateHours: task.estimateHours,
      actualHours: task.actualHours,
      progress: task.progressPercent,
      costPlanned: task.estimateHours * 150,
      costActual: task.actualHours * 150,
    });
  });

  return rows;
}

export function printAsPdf(): void {
  window.print();
}
