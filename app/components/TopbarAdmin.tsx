"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopbarAdmin() {
  const [me, setMe] = useState<{
    id: string;
    fullName: string;
    email: string;
    type?: "staff" | "admin";
  } | null>(null);
  const [dbStatus, setDbStatus] = useState<"checking" | "up" | "down">(
    "checking"
  );
  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j.user || null))
      .catch(() => setMe(null));
    void fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.mongo?.connected) setDbStatus("up");
        else setDbStatus("down");
      })
      .catch(() => setDbStatus("down"));
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/admin/login";
  }
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/handover"
            className="text-sm hover:underline"
            aria-current={pathname.startsWith("/handover") ? "page" : undefined}
          >
            Handover
          </Link>
          {me?.type === "admin" ? (
            <>
              <Link
                href="/admin"
                className="text-sm hover:underline"
                aria-current={pathname === "/admin" ? "page" : undefined}
              >
                Admin
              </Link>
              <Link
                href="/admin/staff"
                className="text-sm hover:underline"
                aria-current={pathname.startsWith("/admin/staff") ? "page" : undefined}
              >
                Staff
              </Link>
              <Link
                href="/admin/admins"
                className="text-sm hover:underline"
                aria-current={pathname.startsWith("/admin/admins") ? "page" : undefined}
              >
                Admins
              </Link>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
            title={
              dbStatus === "checking"
                ? "Checking database connection..."
                : dbStatus === "up"
                ? "Database connected"
                : "Database not connected"
            }
          >
            <span
              className={
                "inline-block h-2 w-2 rounded-full " +
                (dbStatus === "checking"
                  ? "bg-amber-500 animate-pulse"
                  : dbStatus === "up"
                  ? "bg-emerald-500"
                  : "bg-red-500")
              }
            />
            <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground/80">
              {dbStatus === "checking"
                ? "DB"
                : dbStatus === "up"
                ? "DB OK"
                : "DB DOWN"}
            </span>
          </div>
          {me ? (
            <>
              <span className="text-sm text-muted-foreground">
                {me.fullName}
                {me.type === "staff" ? (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    Staff
                  </span>
                ) : me.type === "admin" ? (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    Admin
                  </span>
                ) : null}
              </span>
              <button
                onClick={() => void logout()}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
