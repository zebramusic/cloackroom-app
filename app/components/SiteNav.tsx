"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/app/i18n/translations";
import LanguageToggle from "@/app/components/LanguageToggle";

type SessionUser = {
  id: string;
  fullName?: string;
  email?: string;
  type?: "staff" | "admin";
};

const SITE_NAV_COPY: Record<
  Locale,
  {
    home: string;
    products: string;
    dashboard: string;
    operational: string;
    logout: string;
    login: string;
  }
> = {
  en: {
    home: "Home",
    products: "Products",
    dashboard: "Dashboard",
    operational: "Operational",
    logout: "Logout",
    login: "Login",
  },
  ro: {
    home: "Acasa",
    products: "Produse",
    dashboard: "Panou",
    operational: "Operational",
    logout: "Deconectare",
    login: "Autentificare",
  },
};

export default function SiteNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const locale: Locale = search.get("lang") === "ro" ? "ro" : "en";
  const copy = SITE_NAV_COPY[locale];
  const withLang = (href: string) =>
    locale === "ro" ? `${href}?lang=ro` : href;
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loginUnlocked, setLoginUnlocked] = useState(false);
  const [roleHint, setRoleHint] = useState<"admin" | "staff" | null>(null);
  const admProgress = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setMe(j?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const entries = document.cookie.split("; ");
    for (const entry of entries) {
      if (!entry) continue;
      const [name, ...rest] = entry.split("=");
      if (name !== "cloack_role") continue;
      const value = rest.join("=").toLowerCase();
      if (value === "admin" || value === "staff") {
        setRoleHint(value);
        return;
      }
    }
    setRoleHint(null);
  }, []);

  useEffect(() => {
    if (me) {
      setLoginUnlocked(false);
      admProgress.current = 0;
      return;
    }
    if (loginUnlocked) return;
    const sequence = ["a", "d", "m"];
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
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

  const isAdmin = me?.type === "admin" || roleHint === "admin";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    setRoleHint(null);
    location.reload();
  }

  return (
    <nav
      suppressHydrationWarning
      className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex flex-1 items-center gap-4">
          <Link
            href={withLang("/")}
            aria-current={isActive("/") ? "page" : undefined}
            className={`text-sm hover:underline ${
              isActive("/") ? "font-semibold" : ""
            }`}
            style={{
              color: isActive("/") ? "#ffffff" : "rgba(255,255,255,0.7)",
            }}
          >
            {copy.home}
          </Link>
          <Link
            href={withLang("/products")}
            aria-current={isActive("/products") ? "page" : undefined}
            className={`text-sm hover:underline ${
              isActive("/products") ? "font-semibold" : ""
            }`}
            style={{
              color: isActive("/products")
                ? "#ffffff"
                : "rgba(255,255,255,0.7)",
            }}
          >
            {copy.products}
          </Link>
          {isAdmin ? (
            <Link
              href={withLang("/dashboard")}
              aria-current={isActive("/dashboard") ? "page" : undefined}
              className={`text-sm hover:underline ${
                isActive("/dashboard") ? "font-semibold" : ""
              }`}
              style={{
                color: isActive("/dashboard")
                  ? "#ffffff"
                  : "rgba(255,255,255,0.7)",
              }}
            >
              {copy.dashboard}
            </Link>
          ) : null}
          {me ? (
            <Link
              href={withLang("/private")}
              aria-current={isActive("/private") ? "page" : undefined}
              className={`text-sm hover:underline ${
                isActive("/private") ? "font-semibold" : ""
              }`}
              style={{
                color: isActive("/private")
                  ? "#ffffff"
                  : "rgba(255,255,255,0.7)",
              }}
            >
              {copy.operational}
            </Link>
          ) : null}
          {/* CMS links are available within the dashboard UI, not in the global navbar */}
          {me ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
              style={{
                backgroundColor: "#000000",
                color: "#ffffff",
                borderColor: "rgba(255,255,255,0.3)",
              }}
              data-skip-confirm="true"
            >
              {copy.logout}
            </button>
          ) : loginUnlocked ? (
            <Link
              href="/admin/login"
              className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
              style={{
                backgroundColor: "#000000",
                color: "#ffffff",
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              {copy.login}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 items-center">
          <LanguageToggle variant="inline" className="ml-4" />
        </div>
      </div>
    </nav>
  );
}
