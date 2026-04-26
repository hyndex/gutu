/** Minimal i18n primitives for the archetype runtime.
 *
 *  Production deployments swap the active translator (i18next, Lingui,
 *  FormatJS, …) by passing a custom `translate` to <I18nProvider>. The
 *  default is identity ("English passes through") so existing code
 *  needs no changes to keep working.
 *
 *  Usage:
 *
 *    const { t, locale, dir } = useArchetypeI18n();
 *    <h1>{t("crm.dashboard.title", { defaultValue: "Sales overview" })}</h1>
 *
 *  RTL: pages read `dir` from the context and the shell sets `dir`
 *  on the page root, so Tailwind `rtl:` modifiers work everywhere
 *  without a separate CSS bundle. */

import * as React from "react";

export type LocaleId = string;

export interface I18nMessageVars {
  /** When the key isn't found, fall back to this string. */
  defaultValue?: string;
  /** Variables for `{name}` interpolation. */
  [variable: string]: string | number | undefined;
}

export interface ArchetypeTranslator {
  (key: string, vars?: I18nMessageVars): string;
}

export interface I18nContextValue {
  locale: LocaleId;
  /** Text direction. "ltr" or "rtl". */
  dir: "ltr" | "rtl";
  /** The active translator. Always returns a string. */
  t: ArchetypeTranslator;
  /** Number formatter using the active locale. */
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
  /** Currency formatter using the active locale. */
  formatCurrency: (n: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  /** Date formatter using the active locale. */
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  /** Relative time ("3 days ago"). */
  formatRelative: (date: Date | number | string, base?: Date | number | string) => string;
}

const RTL_LOCALES = new Set([
  "ar",
  "ar-AE",
  "ar-EG",
  "ar-SA",
  "fa",
  "fa-IR",
  "he",
  "he-IL",
  "ur",
  "ur-PK",
]);

function detectDir(locale: LocaleId): "ltr" | "rtl" {
  const lower = locale.toLowerCase();
  if (RTL_LOCALES.has(lower)) return "rtl";
  // Match language prefix.
  const prefix = lower.split("-")[0];
  return RTL_LOCALES.has(prefix) ? "rtl" : "ltr";
}

const PASSTHROUGH_TRANSLATOR: ArchetypeTranslator = (key, vars) => {
  const base = vars?.defaultValue ?? key;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const v = vars[name];
    return v === undefined ? `{${name}}` : String(v);
  });
};

function buildDefaultValue(): I18nContextValue {
  const locale = detectLocale();
  return {
    locale,
    dir: detectDir(locale),
    t: PASSTHROUGH_TRANSLATOR,
    formatNumber: (n, options) =>
      new Intl.NumberFormat(locale, options).format(n),
    formatCurrency: (n, currency = "USD", options) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...options,
      }).format(n),
    formatDate: (date, options) =>
      new Intl.DateTimeFormat(locale, options).format(toDate(date)),
    formatRelative: (date, base) => formatRelativeDefault(toDate(date), toDate(base ?? Date.now())),
  };
}

function toDate(d: Date | number | string): Date {
  if (d instanceof Date) return d;
  if (typeof d === "number") return new Date(d);
  return new Date(d);
}

function detectLocale(): LocaleId {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-US";
}

function formatRelativeDefault(target: Date, base: Date): string {
  const diff = target.getTime() - base.getTime();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < minute) {
    return "just now";
  } else if (abs < hour) {
    value = Math.round(diff / minute);
    unit = "minute";
  } else if (abs < day) {
    value = Math.round(diff / hour);
    unit = "hour";
  } else if (abs < week) {
    value = Math.round(diff / day);
    unit = "day";
  } else if (abs < month) {
    value = Math.round(diff / week);
    unit = "week";
  } else if (abs < year) {
    value = Math.round(diff / month);
    unit = "month";
  } else {
    value = Math.round(diff / year);
    unit = "year";
  }
  try {
    return new Intl.RelativeTimeFormat(detectLocale(), { numeric: "auto" }).format(value, unit);
  } catch {
    return `${value} ${unit}${Math.abs(value) === 1 ? "" : "s"} ${value < 0 ? "ago" : "from now"}`;
  }
}

const I18nContext = React.createContext<I18nContextValue>(buildDefaultValue());

export interface I18nProviderProps {
  children: React.ReactNode;
  /** Locale id (BCP 47). Default: navigator.language or "en-US". */
  locale?: LocaleId;
  /** Translation messages keyed by id. */
  messages?: Readonly<Record<string, string>>;
  /** Override the translator entirely (for i18next / Lingui / FormatJS). */
  translate?: ArchetypeTranslator;
  /** Force text direction. Default: derived from locale. */
  dir?: "ltr" | "rtl";
}

export function I18nProvider({
  children,
  locale,
  messages,
  translate,
  dir,
}: I18nProviderProps) {
  const value = React.useMemo<I18nContextValue>(() => {
    const activeLocale = locale ?? detectLocale();
    const activeDir = dir ?? detectDir(activeLocale);
    const t: ArchetypeTranslator =
      translate ??
      ((key, vars) => {
        const raw = messages?.[key] ?? vars?.defaultValue ?? key;
        if (!vars) return raw;
        return raw.replace(/\{(\w+)\}/g, (_match, name: string) => {
          const v = vars[name];
          return v === undefined ? `{${name}}` : String(v);
        });
      });
    return {
      locale: activeLocale,
      dir: activeDir,
      t,
      formatNumber: (n, options) =>
        new Intl.NumberFormat(activeLocale, options).format(n),
      formatCurrency: (n, currency = "USD", options) =>
        new Intl.NumberFormat(activeLocale, {
          style: "currency",
          currency,
          ...options,
        }).format(n),
      formatDate: (date, options) =>
        new Intl.DateTimeFormat(activeLocale, options).format(toDate(date)),
      formatRelative: (date, base) => formatRelativeDefault(toDate(date), toDate(base ?? Date.now())),
    };
  }, [locale, messages, translate, dir]);

  // Apply dir attribute on the document root so global CSS / Tailwind
  // `rtl:` utilities work without per-component plumbing.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.documentElement.getAttribute("dir");
    document.documentElement.setAttribute("dir", value.dir);
    document.documentElement.setAttribute("lang", value.locale);
    return () => {
      if (prev) document.documentElement.setAttribute("dir", prev);
      else document.documentElement.removeAttribute("dir");
    };
  }, [value.dir, value.locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook used by every archetype page + widget. */
export function useArchetypeI18n(): I18nContextValue {
  return React.useContext(I18nContext);
}

/** Convenience to get just the translator. */
export function useT(): ArchetypeTranslator {
  return React.useContext(I18nContext).t;
}
