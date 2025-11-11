"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/private/toast/ToastContext";

type Status = "idle" | "checking" | "up" | "down";

type StoredStatus = {
  status: Exclude<Status, "checking">;
  lastChecked: number;
};

const STORAGE_KEY = "db-status:last-check";
const TWELVE_HOURS_MS = 1000 * 60 * 60 * 12;

export default function DbStatusDot({ className }: { className?: string }) {
  const { push } = useToast();
  const [status, setStatus] = useState<Status>("idle");
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredStatus;
      if (!parsed || typeof parsed.lastChecked !== "number") return;
      const storedStatus =
        parsed.status === "up" || parsed.status === "down"
          ? parsed.status
          : "idle";
      setStatus(storedStatus);
      setLastChecked(parsed.lastChecked);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const stale = useMemo(() => {
    if (!lastChecked) return false;
    return Date.now() - lastChecked > TWELVE_HOURS_MS;
  }, [lastChecked]);

  const toneClass = useMemo(() => {
    if (status === "checking")
      return "bg-amber-500 ring-amber-500/50 animate-pulse";
    if (stale) return "bg-sky-500 ring-sky-500/50";
    if (status === "up") return "bg-emerald-500 ring-emerald-500/50";
    if (status === "down") return "bg-red-500 ring-red-500/50";
    return "bg-muted-foreground/60 ring-muted-foreground/40";
  }, [status, stale]);

  const title = useMemo(() => {
    const lastCheckedLabel = lastChecked
      ? new Date(lastChecked).toLocaleString()
      : "Never";
    if (status === "checking") {
      return "Checking database connection…";
    }
    const base =
      status === "up"
        ? "Last check succeeded"
        : status === "down"
        ? "Last check failed"
        : "Database status unknown";
    const freshness = stale ? " (stale — re-check recommended)" : "";
    return `${base} • ${lastCheckedLabel}${freshness}`;
  }, [lastChecked, stale, status]);

  const handleClick = useCallback(async () => {
    if (status === "checking") return;
    setStatus("checking");
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Health check failed (${res.status})`);
      }
      const json = await res.json().catch(() => ({}));
      const connected = Boolean(json?.mongo?.connected);
      const nextStatus: Status = connected ? "up" : "down";
      const now = Date.now();
      setStatus(nextStatus);
      setLastChecked(now);
      if (typeof window !== "undefined") {
        const stored: StoredStatus = {
          status: nextStatus,
          lastChecked: now,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
      push({
        message: connected
          ? "Database connection verified"
          : "Database connection failed",
        variant: connected ? "success" : "error",
      });
    } catch (err) {
      const now = Date.now();
      setStatus("down");
      setLastChecked(now);
      if (typeof window !== "undefined") {
        const stored: StoredStatus = { status: "down", lastChecked: now };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
      const message =
        err instanceof Error ? err.message : "Database health request failed";
      push({ message, variant: "error" });
    }
  }, [push, status]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={status === "checking"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs font-medium transition hover:bg-muted disabled:opacity-70 disabled:cursor-progress ${
        className ?? ""
      }`}
      title={title}
      aria-label={`${title}. Click to check database connection.`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ring-1 ring-inset ${toneClass}`}
      />
    </button>
  );
}
