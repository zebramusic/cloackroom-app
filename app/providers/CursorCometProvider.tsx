"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import CursorComet from "@/app/components/CursorComet";

type CursorCometContextValue = {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (value: boolean) => void;
};

const CursorCometContext = createContext<CursorCometContextValue | null>(null);
const STORAGE_KEY = "cloackroom:cursor-comet";

export function CursorCometProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(true);

  // hydrate from localStorage once on client
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "off") setEnabled(false);
      if (stored === "on") setEnabled(true);
    } catch (err) {
      console.warn("Failed to read comet preference", err);
    }
  }, []);

  // persist preference when toggled
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch (err) {
      console.warn("Failed to persist comet preference", err);
    }
  }, [enabled]);

  const value = useMemo<CursorCometContextValue>(
    () => ({
      enabled,
      toggle: () => setEnabled((prev) => !prev),
      setEnabled,
    }),
    [enabled]
  );

  return (
    <CursorCometContext.Provider value={value}>
      {children}
      {enabled ? <CursorComet /> : null}
    </CursorCometContext.Provider>
  );
}

export function useCursorComet() {
  const ctx = useContext(CursorCometContext);
  if (!ctx) {
    throw new Error("useCursorComet must be used within CursorCometProvider");
  }
  return ctx;
}
