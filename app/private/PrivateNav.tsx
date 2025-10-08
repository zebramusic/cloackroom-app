"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Me = { id: string; fullName: string; type?: "staff" | "admin" } | null;

export default function PrivateNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // removed unused firstFocusable ref
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j.user || null))
      .catch(() => setMe(null));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // restore focus
    if (previouslyFocused.current) previouslyFocused.current.focus();
  }, []);
  const toggle = useCallback(() => {
    setOpen((o) => {
      if (!o) {
        previouslyFocused.current = document.activeElement as HTMLElement;
      }
      return !o;
    });
  }, []);

  // Focus trap when open
  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [role="menuitem"], [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        if (focusable.length === 0) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/private/admin/login";
  }

  const linkClasses = (active: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  const [reportCount, setReportCount] = useState<number | null>(null);
  useEffect(() => {
    void fetch("/api/handover?q=", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setReportCount(Array.isArray(j.items) ? j.items.length : 0))
      .catch(() => setReportCount(null));
  }, []);

  const links = [
    { href: "/private", label: "Home", active: pathname === "/private" },
    {
      href: "/private/handover",
      label: "Handover",
      active: pathname.startsWith("/private/handover"),
    },
    {
      href: "/private/handovers",
      label: `Reports${
        typeof reportCount === "number" ? ` (${reportCount})` : ""
      }`,
      active: pathname.startsWith("/private/handovers"),
    },
    me?.type === "admin"
      ? {
          href: "/private/admin",
          label: "Admin",
          active: pathname.startsWith("/private/admin"),
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; active: boolean }[];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav-panel"
              type="button"
            >
              <div className="relative w-5 h-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 bg-foreground transition-transform ${
                    open ? "translate-y-2.5 rotate-45" : "translate-y-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-2.5 h-0.5 w-5 bg-foreground transition-opacity ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 top-5 h-0.5 w-5 bg-foreground transition-transform ${
                    open ? "-translate-y-2.5 -rotate-45" : "translate-y-0"
                  }`}
                />
              </div>
            </button>
            <Link
              href="/private"
              className="text-sm font-semibold tracking-wide text-foreground"
            >
              Cloackroom
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={l.active ? "page" : undefined}
                  className={linkClasses(l.active)}
                  onClick={close}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {me ? (
              <>
                <span className="hidden sm:inline text-sm text-muted-foreground max-w-[140px] truncate">
                  {me.fullName}
                  {me.type ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {me.type}
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
      </header>
      {open && (
        <div>
          {/** Body scroll lock (imperative) */}
          <BodyScrollLock />
          <div
            className="md:hidden fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={close}
            />
            <div
              id="mobile-nav-panel"
              ref={dialogRef}
              className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-background border-r border-border shadow-xl flex flex-col animate-slide-in"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-border">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  onClick={close}
                  aria-label="Close menu"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={l.active ? "page" : undefined}
                    className={linkClasses(l.active)}
                    onClick={close}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-3 border-t border-border pt-3">
                  {me ? (
                    <button
                      onClick={() => void logout()}
                      className="w-full text-left px-3 py-2 rounded-md text-sm border border-border hover:bg-muted"
                      type="button"
                    >
                      Logout
                    </button>
                  ) : (
                    <Link
                      href="/private/admin/login"
                      className="block px-3 py-2 rounded-md text-sm border border-border hover:bg-muted"
                      onClick={close}
                    >
                      Login
                    </Link>
                  )}
                </div>
                {me ? (
                  <div className="mt-auto text-[11px] text-muted-foreground px-2 py-3">
                    Signed in as{" "}
                    <span className="font-medium">{me.fullName}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BodyScrollLock() {
  useEffect(() => {
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = original;
    };
  }, []);
  return null;
}
