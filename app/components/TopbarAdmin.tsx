"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/private/admin/login";
  }
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  const NavLinks = () => (
    <>
      <Link
        href="/private/handover"
        className="block px-3 py-2 rounded-lg text-sm hover:bg-muted"
        aria-current={
          pathname.startsWith("/private/handover") ? "page" : undefined
        }
        onClick={closeMenu}
      >
        Handover
      </Link>
      <Link
        href="/private/admin"
        className="block px-3 py-2 rounded-lg text-sm hover:bg-muted"
        aria-current={pathname === "/private/admin" ? "page" : undefined}
        onClick={closeMenu}
      >
        Admin
      </Link>
      {me ? (
        <button
          onClick={() => void logout()}
          className="mt-2 w-full text-left px-3 py-2 rounded-lg text-sm border border-border hover:bg-muted"
        >
          Logout
        </button>
      ) : (
        <Link
          href="/private/admin/login"
          className="mt-2 block px-3 py-2 rounded-lg text-sm border border-border hover:bg-muted"
          onClick={closeMenu}
        >
          Login
        </Link>
      )}
    </>
  );
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-12 flex items-center justify-between">
        {/* Left section: Hamburger (mobile) + inline links (desktop) */}
        <div className="flex items-center gap-2">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-muted"
          >
            <span className="sr-only">Menu</span>
            <div className="relative w-5 h-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 bg-foreground transition-transform ${
                  menuOpen ? "translate-y-2.5 rotate-45" : "translate-y-0"
                }`}
              />
              <span
                className={`absolute left-0 top-2.5 h-0.5 w-5 bg-foreground transition-opacity ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-5 h-0.5 w-5 bg-foreground transition-transform ${
                  menuOpen ? "-translate-y-2.5 -rotate-45" : "translate-y-0"
                }`}
              />
            </div>
          </button>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/private/handover"
              className="text-sm hover:underline"
              aria-current={
                pathname.startsWith("/private/handover") ? "page" : undefined
              }
            >
              Handover
            </Link>
            <Link
              href="/private/admin"
              className="text-sm hover:underline"
              aria-current={pathname === "/private/admin" ? "page" : undefined}
            >
              Admin
            </Link>
          </div>
        </div>
        {/* Right section: status + user */}
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
          <div className="hidden md:flex items-center gap-3">
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
                href="/private/admin/login"
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Mobile slide-over menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeMenu}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-background border-r border-border shadow-xl flex flex-col">
            <div className="h-12 flex items-center justify-between px-4 border-b border-border">
              <span className="text-sm font-semibold">Menu</span>
              <button
                aria-label="Close menu"
                onClick={closeMenu}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <NavLinks />
            </div>
            {me ? (
              <div className="border-t border-border p-3 text-xs text-muted-foreground">
                Signed in as <span className="font-medium">{me.fullName}</span>{" "}
                {me.type ? (
                  <span className="ml-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {me.type}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
