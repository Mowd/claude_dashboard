"use client";

import { useEffect } from "react";
import { useI18nStore } from "@/stores/i18nStore";

export function I18nInitializer() {
  const initialized = useI18nStore((s) => s.initialized);
  const initialize = useI18nStore((s) => s.initialize);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  return null;
}
