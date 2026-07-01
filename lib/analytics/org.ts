/**
 * Org-hierarchy analytics + RBAC scoping for the distribution dashboards
 * (התפלגות לפי חטיבה / אגף / עובד).
 *
 * The org is a single tree rooted at the CEO (מנכ"ל, u6). A user's
 *  - **division (חטיבה)** = the ancestor (or self) that reports directly to the
 *    CEO — i.e. a סמנכ"ל / division head.
 *  - **department (אגף)**  = the nearest ancestor (or self) whose title mentions
 *    "אגף" — i.e. a ראש/מנהל אגף.
 *
 * Visibility (who a viewer may see in a distribution) follows the same subtree
 * rule the rest of the app uses:
 *  - מנכ"ל (u6), ניר ברלוביץ' (u2) ומארק (u1) — and any admin — see ALL.
 *  - a division head (סמנכ"ל) sees only their division — across its אגפים + עובדים.
 *  - a department head (מנהל אגף) sees only their department — its עובדים.
 *  - anyone else sees only their own reporting subtree (their team).
 *
 * Framework-free + pure so it can be unit-reasoned and reused server/client.
 */
import type { MockUser } from "@/lib/db/mock-data";

/** The CEO sits at the top of the org tree (no manager). */
export const CEO_ID = "u6";

/**
 * Users who may view every distribution regardless of where they sit:
 * מנכ"ל (u6), ניר ברלוביץ' (u2, admin over the whole activity), מארק (u1, PMO).
 * Any user with role "admin" is also all-access (kept in sync with the 3 admins).
 */
export const ALL_ACCESS_IDS = new Set(["u1", "u2", "u6"]);

export interface OrgIndex {
  byId: Map<string, MockUser>;
  /** managerId -> direct report ids */
  childrenOf: Map<string, string[]>;
}

export function buildOrgIndex(users: MockUser[]): OrgIndex {
  const byId = new Map<string, MockUser>();
  const childrenOf = new Map<string, string[]>();
  for (const u of users) byId.set(u.id, u);
  for (const u of users) {
    if (u.managerId) {
      const arr = childrenOf.get(u.managerId) ?? [];
      arr.push(u.id);
      childrenOf.set(u.managerId, arr);
    }
  }
  return { byId, childrenOf };
}

/** All transitive reports of `rootId` (excluding root). Cycle-safe. */
export function subtreeIds(rootId: string, idx: OrgIndex): Set<string> {
  const out = new Set<string>();
  let q = [rootId];
  while (q.length) {
    const next: string[] = [];
    for (const id of q) {
      for (const c of idx.childrenOf.get(id) ?? []) {
        if (!out.has(c)) {
          out.add(c);
          next.push(c);
        }
      }
    }
    q = next;
  }
  return out;
}

/** The division head (child-of-CEO ancestor, or self). null for the CEO / detached. */
export function divisionHeadOf(userId: string, idx: OrgIndex): string | null {
  let cur: string | undefined = userId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const u = idx.byId.get(cur);
    if (!u) return null;
    if (u.id === CEO_ID) return null; // CEO is above all divisions
    if (u.managerId === CEO_ID) return u.id;
    if (!u.managerId) return null;
    cur = u.managerId;
  }
  return null;
}

/** The department head (nearest "אגף" ancestor, or self). null if none on the chain. */
export function departmentHeadOf(userId: string, idx: OrgIndex): string | null {
  let cur: string | undefined = userId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const u = idx.byId.get(cur);
    if (!u) return null;
    if ((u.title ?? "").includes("אגף")) return u.id;
    if (!u.managerId) return null;
    cur = u.managerId;
  }
  return null;
}

export type ScopeLevel = "division" | "department" | "employee";

export interface ViewerScope {
  allAccess: boolean;
  /** Users whose work the viewer may see in distributions (includes the viewer). */
  visibleUserIds: Set<string>;
  scopeLabel: { he: string; en: string };
  /** Grouping levels available to this viewer (broadest first). */
  levels: ScopeLevel[];
  isDivisionHead: boolean;
  isDepartmentHead: boolean;
}

export function resolveViewerScope(viewer: MockUser, idx: OrgIndex): ViewerScope {
  const allAccess = ALL_ACCESS_IDS.has(viewer.id) || viewer.role === "admin";
  if (allAccess) {
    return {
      allAccess: true,
      visibleUserIds: new Set(idx.byId.keys()),
      scopeLabel: { he: "כל הארגון", en: "Whole organization" },
      levels: ["division", "department", "employee"],
      isDivisionHead: false,
      isDepartmentHead: false,
    };
  }

  const sub = subtreeIds(viewer.id, idx);
  const visible = new Set<string>(sub);
  visible.add(viewer.id);

  const isDivisionHead = viewer.managerId === CEO_ID;
  if (isDivisionHead) {
    return {
      allAccess: false,
      visibleUserIds: visible,
      scopeLabel: { he: `חטיבה — ${viewer.title ?? viewer.name}`, en: `Division — ${viewer.title ?? viewer.name}` },
      levels: ["department", "employee"],
      isDivisionHead: true,
      isDepartmentHead: false,
    };
  }

  const isDepartmentHead = (viewer.title ?? "").includes("אגף");
  if (isDepartmentHead) {
    return {
      allAccess: false,
      visibleUserIds: visible,
      scopeLabel: { he: `אגף — ${viewer.title ?? viewer.name}`, en: `Department — ${viewer.title ?? viewer.name}` },
      levels: ["employee"],
      isDivisionHead: false,
      isDepartmentHead: true,
    };
  }

  return {
    allAccess: false,
    visibleUserIds: visible,
    scopeLabel: { he: "הצוות שלי", en: "My team" },
    levels: ["employee"],
    isDivisionHead: false,
    isDepartmentHead: false,
  };
}

/** Group label for a user at a given level (falls back gracefully). */
export function groupLabelFor(userId: string | null, level: ScopeLevel, idx: OrgIndex): string {
  if (!userId) return "לא משויך";
  if (level === "employee") return idx.byId.get(userId)?.name ?? "לא ידוע";
  const headId = level === "division" ? divisionHeadOf(userId, idx) : departmentHeadOf(userId, idx);
  if (!headId) return level === "division" ? "הנהלה / ללא חטיבה" : "ללא אגף";
  const head = idx.byId.get(headId);
  if (!head) return "לא ידוע";
  return level === "division" ? head.name : head.title ?? head.name;
}
