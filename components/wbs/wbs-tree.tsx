"use client";
import { useState } from "react";
import type { MockWbsNode } from "@/lib/db/mock-data";
import { ChevronDown, ChevronRight, Target, Flag, Activity, CheckSquare, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVEL_ICONS: Record<string, typeof Target> = {
  portfolio: Folder,
  program: Folder,
  project: Folder,
  goal: Target,
  milestone: Flag,
  activity: Activity,
  task: CheckSquare,
  subtask: CheckSquare,
};

const LEVEL_COLORS: Record<string, string> = {
  portfolio: "text-purple-600",
  program: "text-indigo-600",
  project: "text-blue-600",
  goal: "text-emerald-600",
  milestone: "text-amber-600",
  activity: "text-cyan-600",
  task: "text-slate-600",
  subtask: "text-slate-500",
};

interface WbsTreeProps {
  nodes: MockWbsNode[];
  allNodes: MockWbsNode[];
  locale: string;
  level?: number;
}

export function WbsTree({ nodes, allNodes, locale, level = 0 }: WbsTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        {locale === "he" ? "אין פריטים" : "No items"}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-0.5", level > 0 && "ms-4 ps-2 border-s border-border")}>
      {nodes.map((node) => (
        <WbsTreeNode
          key={node.id}
          node={node}
          allNodes={allNodes}
          locale={locale}
          level={level}
        />
      ))}
    </ul>
  );
}

function WbsTreeNode({
  node,
  allNodes,
  locale,
  level,
}: {
  node: MockWbsNode;
  allNodes: MockWbsNode[];
  locale: string;
  level: number;
}) {
  const [open, setOpen] = useState(level < 2);
  const children = allNodes.filter((n) => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const Icon = LEVEL_ICONS[node.level] || CheckSquare;
  const colorClass = LEVEL_COLORS[node.level] || "text-slate-600";

  return (
    <li>
      <div
        className="group flex items-center gap-1.5 px-1.5 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <Icon className={cn("size-3.5 shrink-0", colorClass)} />
        <span className="truncate flex-1 text-xs font-medium">
          {locale === "he" ? node.name : node.nameEn || node.name}
        </span>
        <span className="text-[9px] text-muted-foreground uppercase">{node.level}</span>
      </div>
      {hasChildren && open && (
        <WbsTree nodes={children} allNodes={allNodes} locale={locale} level={level + 1} />
      )}
    </li>
  );
}
