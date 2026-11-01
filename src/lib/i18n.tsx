"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useConfig, useFeature } from "@/lib/config";
import { en, hi, type StringKey } from "@/lib/strings";

export type Locale = "en" | "hi";
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

const TABLES: Record<Locale, Partial<Record<StringKey, string>>> = { en, hi };
const STORAGE_KEY = "mendyr:locale";

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  /** Hindi is offered only while the `hindi` feature flag is on. */
  canSwitch: boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const hindiOn = useFeature("hindi");
  const overrides = useConfig("app.copy").locales;
  const [chosen, setChosen] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
      if (saved === "hi" || saved === "en") setChosen(saved);
    } catch {
      // Storage blocked — stay on English.
    }
  }, []);

  const locale: Locale = hindiOn ? chosen : "en";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setChosen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      const text = overrides[locale]?.[key] ?? TABLES[locale][key] ?? overrides.en?.[key] ?? en[key] ?? key;
      return interpolate(text, vars);
    },
    [locale, overrides],
  );

  const value = useMemo(() => ({ locale, setLocale, t, canSwitch: hindiOn }), [locale, setLocale, t, hindiOn]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

export function useT(): Translate {
  return useI18n().t;
}
