"use client";

import { useI18nStore } from "@/stores/i18nStore";
import { DEFAULT_LOCALE, messages } from "@/lib/i18n/messages";

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export function useI18n() {
  const locale = useI18nStore((s) => s.locale);
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];

  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw = dict[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    return interpolate(raw, vars);
  };

  return { locale, t };
}
