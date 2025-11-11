"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import DbStatusDot from "@/app/components/DbStatusDot";

export default function TopbarAdmin() {
  const [me, setMe] = useState<{
    id: string;
    fullName: string;
    email: string;
    type?: "staff" | "admin";
  } | null>(null);
  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j.user || null))
      .catch(() => setMe(null));
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
        className="block px-3 py-2 rounded-lg text-sm border border-white/30 bg-black text-white hover:bg-black/80"
        aria-current={
          pathname.startsWith("/private/handover") ? "page" : undefined
        }
        onClick={closeMenu}
      >
        Handover
      </Link>
      <Link
        href="/private/admin"
        className="block px-3 py-2 rounded-lg text-sm border border-white/30 bg-black text-white hover:bg-black/80"
        aria-current={pathname === "/private/admin" ? "page" : undefined}
        onClick={closeMenu}
      >
        Admin
      </Link>
      {me?.type === "admin" ? (
        <Link
          href="/dashboard/admin/products"
          className="block px-3 py-2 rounded-lg text-sm border border-white/30 bg-black text-white hover:bg-black/80"
          aria-current={
            pathname.startsWith("/dashboard/admin/products")
              ? "page"
              : undefined
          }
          onClick={closeMenu}
        >
          Products
        </Link>
      ) : null}
      {me ? (
        <button
          onClick={() => void logout()}
          className="mt-2 w-full text-left px-3 py-2 rounded-lg text-sm border border-white/30 bg-black text-white hover:bg-black/80"
        >
          Logout
        </button>
      ) : (
        <Link
          href="/private/admin/login"
          className="mt-2 block px-3 py-2 rounded-lg text-sm border border-white/30 bg-black text-white hover:bg-black/80"
          onClick={closeMenu}
        >
          Login
        </Link>
      )}
    </>
  );
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-black text-white backdrop-blur supports-[backdrop-filter]:bg-black">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-12 flex items-center justify-between">
        {/* Left section: Hamburger (mobile) + inline links (desktop) */}
        <div className="flex items-center gap-2">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-white/30 bg-black text-white hover:bg-black/80"
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
              className="text-sm text-white hover:underline"
              aria-current={
                pathname.startsWith("/private/handover") ? "page" : undefined
              }
            >
              Handover
            </Link>
            <Link
              href="/private/admin"
              className="text-sm text-white hover:underline"
              aria-current={pathname === "/private/admin" ? "page" : undefined}
            >
              Admin
            </Link>
            {me?.type === "admin" ? (
              <Link
                href="/dashboard/admin/products"
                className="text-sm text-white hover:underline"
                aria-current={
                  pathname.startsWith("/dashboard/admin/products")
                    ? "page"
                    : undefined
                }
              >
                Products
              </Link>
            ) : null}
          </div>
        </div>
        {/* Right section: status + user */}
        <div className="flex items-center gap-3">
          <DbStatusDot />
          <div className="hidden md:flex items-center gap-3">
            {me ? (
              <>
                <div className="flex items-center gap-2 max-w-[280px]">
                  <span className="text-sm text-muted-foreground truncate">
                    {me.fullName}
                  </span>
                  {me.type === "staff" ? (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      Staff
                    </span>
                  ) : me.type === "admin" ? (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      Admin
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => void logout()}
                  className="text-xs rounded-full border border-white/30 bg-black px-3 py-1 text-white hover:bg-black/80"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/private/admin/login"
                className="text-xs rounded-full border border-white/30 bg-black px-3 py-1 text-white hover:bg-black/80"
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
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/30 bg-black text-white hover:bg-black/80"
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
