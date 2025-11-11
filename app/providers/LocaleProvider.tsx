"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translations, type Locale } from "@/app/i18n/translations";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

function normalizeLocale(input: string | null | undefined): Locale | null {
  if (!input) return null;
  const lower = input.toLowerCase();
  if (lower.startsWith("ro")) return "ro";
  if (lower.startsWith("en")) return "en";
  return null;
}

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("lang="));
  if (!entry) return null;
  const [, value] = entry.split("=");
  return normalizeLocale(value);
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const persistLocale = useCallback((l: Locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locale", l);
    }
    if (typeof document !== "undefined") {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `lang=${l}; path=/; max-age=${oneYear}`;
    }
  }, []);

  const applyLocale = useCallback(
    (l: Locale, shouldPersist = true) => {
      setLocaleState((prev) => (prev === l ? prev : l));
      if (shouldPersist) persistLocale(l);
    },
    [persistLocale]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const paramsLocale = normalizeLocale(
      new URLSearchParams(window.location.search).get("lang")
    );
    const stored = window.localStorage.getItem("locale");
    const storedLocale = normalizeLocale(stored);
    const cookieLocale = readCookieLocale();
    const navigatorLocale =
      typeof navigator !== "undefined"
        ? normalizeLocale(navigator.language)
        : null;
    const next =
      paramsLocale ?? storedLocale ?? cookieLocale ?? navigatorLocale ?? "en";
    applyLocale(next, true);
  }, [applyLocale]);

  const setLocale = useCallback(
    (l: Locale) => {
      applyLocale(l, true);
    },
    [applyLocale]
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ro" : "en");
  }, [locale, setLocale]);

  const t = useMemo(() => {
    const dict = translations[locale];
    return (key: string) => dict[key] ?? key;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, t, toggleLocale]
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
