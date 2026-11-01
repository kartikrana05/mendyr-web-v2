"use client";

import { Card, Chip } from "@/components/ui";
import { LOCALES, useI18n } from "@/lib/i18n";

/** English / Hindi, shown only while the `hindi` feature flag is on. */
export function LanguageSwitch() {
  const { locale, setLocale, canSwitch, t } = useI18n();
  if (!canSwitch) return null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <h2 className="font-semibold text-slate-900">{t("common.language")}</h2>
        <p className="mt-0.5 text-sm text-slate-500">English · हिन्दी</p>
      </div>
      <div className="flex gap-2">
        {LOCALES.map((option) => (
          <Chip key={option.code} selected={locale === option.code} onClick={() => setLocale(option.code)}>
            {option.label}
          </Chip>
        ))}
      </div>
    </Card>
  );
}
