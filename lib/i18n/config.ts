export const locales = ["he", "en", "ru", "fr", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "he";

export const localeNames: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ru: "Русский",
  fr: "Français",
  es: "Español",
};

export const localeDirections: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
  ru: "ltr",
  fr: "ltr",
  es: "ltr",
};

/** Native language labels for the language switcher */
export const localeFlags: Record<Locale, string> = {
  he: "🇮🇱",
  en: "🇬🇧",
  ru: "🇷🇺",
  fr: "🇫🇷",
  es: "🇪🇸",
};

export function isRTL(locale: Locale): boolean {
  return localeDirections[locale] === "rtl";
}
