"use client";
import { createContext, useCallback, useContext, useState } from "react";

export type Toast = {
  id: string;
  message: string;
  title?: string;
  variant?: "info" | "success" | "error" | "warning";
  ttl?: number;
};

interface ToastCtx {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const ttl = t.ttl ?? 3500;
      setToasts((arr) => [...arr, { ...t, id, ttl }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );
  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
