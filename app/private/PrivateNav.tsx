"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DbStatusDot from "@/app/components/DbStatusDot";
import type { Locale } from "@/app/i18n/translations";

type Me = { id: string; fullName: string; type?: "staff" | "admin" } | null;

const NAV_COPY: Record<
  Locale,
  {
    publicPage: string;
    home: string;
    handover: string;
    reports: string;
    admin: string;
    openMenu: string;
    closeMenu: string;
    menuTitle: string;
    navigationMenu: string;
    logout: string;
    login: string;
    signedInAs: string;
    adminRole: string;
    staffRole: string;
  }
> = {
  en: {
    publicPage: "Public page",
    home: "Home",
    handover: "Handover",
    reports: "Reports",
    admin: "Admin",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menuTitle: "Menu",
    navigationMenu: "Navigation menu",
    logout: "Logout",
    login: "Login",
    signedInAs: "Signed in as",
    adminRole: "Admin",
    staffRole: "Staff",
  },
  ro: {
    publicPage: "Pagina publica",
    home: "Acasa",
    handover: "Predare",
    reports: "Rapoarte",
    admin: "Admin",
    openMenu: "Deschide meniul",
    closeMenu: "Inchide meniul",
    menuTitle: "Meniu",
    navigationMenu: "Meniu navigare",
    logout: "Deconectare",
    login: "Autentificare",
    signedInAs: "Conectat ca",
    adminRole: "Admin",
    staffRole: "Personal",
  },
};

function readCookieLocale(): Locale | undefined {
  if (typeof document === "undefined") return undefined;
  const cookies = document.cookie.split("; ");
  for (const entry of cookies) {
    if (!entry) continue;
    const [name, ...rest] = entry.split("=");
    if (name !== "lang") continue;
    const value = rest.join("=").toLowerCase();
    if (value === "en" || value === "ro") return value;
  }
  return undefined;
}

function persistCookieLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `lang=${locale}; path=/; max-age=${oneYear}`;
}

export default function PrivateNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [loginUnlocked, setLoginUnlocked] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // removed unused firstFocusable ref
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const admProgress = useRef(0);

  useEffect(() => {
    const requested = langParam;
    const normalized =
      requested === "ro" ? "ro" : requested === "en" ? "en" : undefined;
    if (normalized) {
      setLocale(normalized);
      persistCookieLocale(normalized);
      return;
    }
    const cookieLocale = readCookieLocale();
    if (cookieLocale) {
      setLocale(cookieLocale);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith("ro")) {
        setLocale("ro");
        persistCookieLocale("ro");
        return;
      }
    }
    setLocale("en");
    persistCookieLocale("en");
  }, [langParam]);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j.user || null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (me) {
      setLoginUnlocked(false);
      admProgress.current = 0;
      return;
    }
    if (loginUnlocked) return;
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      const sequence = ["a", "d", "m"];
      if (key === sequence[admProgress.current]) {
        admProgress.current += 1;
        if (admProgress.current === sequence.length) {
          setLoginUnlocked(true);
          admProgress.current = 0;
        }
        return;
      }
      admProgress.current = key === sequence[0] ? 1 : 0;
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      admProgress.current = 0;
    };
  }, [me, loginUnlocked]);

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

  const copy = NAV_COPY[locale];

  const linkClasses = (active: boolean) =>
    `inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
      active
        ? "border-transparent bg-accent text-accent-foreground shadow-sm"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const [reportCount, setReportCount] = useState<number | null>(null);
  useEffect(() => {
    void fetch("/api/handover?q=", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setReportCount(Array.isArray(j.items) ? j.items.length : 0))
      .catch(() => setReportCount(null));
  }, []);

  const links = [
    {
      href: "/private/handover",
      label: copy.handover,
      active: pathname.startsWith("/private/handover"),
    },
    {
      href: "/private/handovers",
      label: `${copy.reports}${
        typeof reportCount === "number" ? ` (${reportCount})` : ""
      }`,
      active: pathname.startsWith("/private/handovers"),
    },
    me?.type === "admin"
      ? {
          href: "/private/admin",
          label: copy.admin,
          active: pathname.startsWith("/private/admin"),
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; active: boolean }[];

  return (
    <>
      <header
        suppressHydrationWarning
        className="sticky top-12 z-50 border-b border-border bg-background/90 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:bg-muted"
              aria-label={open ? copy.closeMenu : copy.openMenu}
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
              Handovers section
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
            {/* DB connection witness */}
            <DbStatusDot />
            {me ? (
              <>
                <div className="hidden sm:flex items-center gap-2 max-w-[240px]">
                  <span className="text-sm text-muted-foreground truncate">
                    {me.fullName}
                  </span>
                  {me.type ? (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                      {me.type === "admin" ? copy.adminRole : copy.staffRole}
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => void logout()}
                  className="text-xs rounded-full border border-border bg-transparent px-3 py-1 text-foreground transition-colors hover:bg-muted"
                >
                  {copy.logout}
                </button>
              </>
            ) : loginUnlocked ? (
              <Link
                href="/private/admin/login"
                className="text-xs rounded-full border border-border bg-transparent px-3 py-1 text-foreground transition-colors hover:bg-muted"
              >
                {copy.login}
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      {open && (
        <div>
          {/** Body scroll lock (imperative) */}
          <BodyScrollLock />
          <div
            className="md:hidden fixed inset-x-0 top-12 bottom-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-label={copy.navigationMenu}
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
                <span className="text-sm font-semibold">{copy.menuTitle}</span>
                <button
                  onClick={close}
                  aria-label={copy.closeMenu}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:bg-muted"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-background p-3 text-foreground flex flex-col gap-1">
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
                      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      type="button"
                    >
                      {copy.logout}
                    </button>
                  ) : loginUnlocked ? (
                    <Link
                      href="/private/admin/login"
                      className="block rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                      onClick={close}
                    >
                      {copy.login}
                    </Link>
                  ) : null}
                </div>
                {me ? (
                  <div className="mt-auto text-[11px] text-muted-foreground px-2 py-3">
                    {copy.signedInAs}{" "}
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
