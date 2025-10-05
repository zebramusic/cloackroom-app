"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Mobile bottom navigation for /handover and /admin areas.
 * Hidden on md+ screens. Shows key destinations contextually based on current user role.
 */
export default function MobileNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<{ id: string; fullName: string; type?: "staff" | "admin" } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then(r => r.json())
      .then(j => setMe(j.user || null))
      .catch(() => setMe(null));
  }, []);

  const baseClasses = "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-none";
  const linkClasses = (active: boolean) =>
    `${baseClasses} ${active ? "text-foreground" : "text-muted-foreground"}`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <ul className="grid grid-cols-3 gap-1 px-2 py-2">
        <li>
          <Link
            href="/handover"
            aria-current={pathname.startsWith("/handover") ? "page" : undefined}
            className={linkClasses(pathname.startsWith("/handover"))}
          >
            <span className="text-xs">Handover</span>
          </Link>
        </li>
        {me?.type === "admin" ? (
          <li>
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={linkClasses(pathname === "/admin")}
            >
              <span className="text-xs">Dashboard</span>
            </Link>
          </li>
        ) : (
          <li>
            <Link
              href="/admin/login"
              aria-current={pathname === "/admin/login" ? "page" : undefined}
              className={linkClasses(pathname === "/admin/login")}
            >
              <span className="text-xs">Login</span>
            </Link>
          </li>
        )}
        {me?.type === "admin" ? (
          <li>
            <Link
              href="/admin/staff"
              aria-current={pathname.startsWith("/admin/staff") ? "page" : undefined}
              className={linkClasses(pathname.startsWith("/admin/staff"))}
            >
              <span className="text-xs">Staff</span>
            </Link>
          </li>
        ) : (
          <li>
            <Link
              href="/admin/admins"
              aria-current={pathname.startsWith("/admin/admins") ? "page" : undefined}
              className={linkClasses(pathname.startsWith("/admin/admins"))}
            >
              <span className="text-xs">Admins</span>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
