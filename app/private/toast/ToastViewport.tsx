"use client";
import { useToast } from "./ToastContext";
import type { Toast } from "./ToastContext";
import { useState, useEffect } from "react";

function Icon({ variant }: { variant?: string }) {
  const base =
    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold";
  switch (variant) {
    case "success":
      return <span className={`${base} bg-green-600 text-white`}>✓</span>;
    case "error":
      return <span className={`${base} bg-red-600 text-white`}>!</span>;
    case "warning":
      return <span className={`${base} bg-amber-500 text-white`}>!</span>;
    default:
      return (
        <span className={`${base} bg-accent text-accent-foreground`}>i</span>
      );
  }
}

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[160] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (leaving) {
      const tm = setTimeout(onClose, 150);
      return () => clearTimeout(tm);
    }
  }, [leaving, onClose]);
  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card/95 backdrop-blur shadow-md p-3 flex gap-3 items-start text-sm transition-all ${
        leaving ? "opacity-0 translate-y-2" : "opacity-100"
      }`}
      role="status"
    >
      <Icon variant={t.variant} />
      <div className="flex-1 min-w-0">
        {t.title ? (
          <div className="font-semibold leading-tight mb-0.5">{t.title}</div>
        ) : null}
        <div className="leading-snug break-words whitespace-pre-line">
          {t.message}
        </div>
      </div>
      <button
        onClick={() => setLeaving(true)}
        className="ml-1 text-xs rounded-md px-2 py-1 hover:bg-muted"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
