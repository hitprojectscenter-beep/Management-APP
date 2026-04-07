export const locales = ["he", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "he";

export const localeNames: Record<Locale, string> = {
  he: "עברית",
  en: "English",
};

export const localeDirections: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
};

export function isRTL(locale: Locale): boolean {
  return localeDirections[locale] === "rtl";
}
