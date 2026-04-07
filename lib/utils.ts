import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: "he" | "en" = "he"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date, locale: "he" | "en" = "he"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function daysBetween(start: string | Date, end: string | Date): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeTime(date: string | Date, locale: "he" | "en" = "he"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = d.getTime() - now;
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(locale === "he" ? "he-IL" : "en-US", { numeric: "auto" });
  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (Math.abs(hours) >= 1) return rtf.format(hours, "hour");
  const minutes = Math.round(diff / (1000 * 60));
  return rtf.format(minutes, "minute");
}

export function calculateVariance(
  plannedEnd: string | null,
  actualEnd: string | null
): { days: number; status: "on-time" | "early" | "late" | "pending" } {
  if (!plannedEnd) return { days: 0, status: "pending" };
  if (!actualEnd) return { days: 0, status: "pending" };
  const days = daysBetween(plannedEnd, actualEnd);
  if (days === 0) return { days: 0, status: "on-time" };
  if (days < 0) return { days, status: "early" };
  return { days, status: "late" };
}

export function isOverdue(plannedEnd: string | null, status: string): boolean {
  if (!plannedEnd || status === "done" || status === "cancelled") return false;
  return new Date(plannedEnd).getTime() < Date.now();
}
