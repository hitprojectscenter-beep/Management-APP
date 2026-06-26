import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INTL_LOCALES: Record<string, string> = {
  he: "he-IL", en: "en-US", ru: "ru-RU", fr: "fr-FR", es: "es-ES",
};

export function formatDate(date: string | Date, _locale: string = "he"): string {
  // Team standard: a single universal numeric date format — dd/mm/yyyy —
  // in EVERY UI language. (The `locale` arg is kept for call-site
  // compatibility but no longer changes the format.)
  return formatDateDDMMYYYY(date);
}

/**
 * Israeli short date — always dd/mm/yyyy regardless of locale.
 * Use this for any place we render an ISO date that the user reads
 * as a calendar value (badges, list cells, status lines). The OS-driven
 * Intl format for he-IL produces "27 ביוני 2026" which the team wanted
 * replaced with the universal numeric form.
 */
export function formatDateDDMMYYYY(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === "string" ? date : "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(date: string | Date, _locale: string = "he"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  // dd/mm/yyyy HH:MM — universal numeric format in every UI language.
  return `${formatDateDDMMYYYY(d)} ${hh}:${min}`;
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
