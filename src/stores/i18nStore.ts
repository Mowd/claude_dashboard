"use client";

import { create } from "zustand";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/messages";

const STORAGE_KEY = "cdb-locale";

interface I18nState {
  locale: Locale;
  initialized: boolean;
  setLocale: (locale: Locale) => void;
  initialize: () => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: DEFAULT_LOCALE,
  initialized: false,

  setLocale: (locale) => {
    set({ locale });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
  },

  initialize: () => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      set({ locale: saved, initialized: true });
      return;
    }

    const browser = window.navigator.language.toLowerCase();
    const picked: Locale = browser.startsWith("zh") ? "zh-TW" : "en";
    set({ locale: picked, initialized: true });
    window.localStorage.setItem(STORAGE_KEY, picked);
  },
}));
