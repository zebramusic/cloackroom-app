"use client";
import Link from "next/link";
import { useLocale } from "@/app/providers/LocaleProvider";

export default function Navbar() {
  const { t, locale, toggleLocale } = useLocale();
  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link
          href="#"
          aria-label="Cloackroom home"
          className="font-semibold text-foreground text-lg"
        >
          {t("navbar.brand")}
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navbar.features")}
          </a>
          <a
            href="#partners"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navbar.partners")}
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navbar.faq")}
          </a>
          <a
            href="#contact"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navbar.contact")}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={
              (t("navbar.switchTo") ?? "Switch language to ") +
              (locale === "en" ? "Română" : "English")
            }
            onClick={toggleLocale}
            className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            {locale === "en" ? "RO" : "EN"}
          </button>
          <a
            href="#contact"
            className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow hover:opacity-95"
          >
            {t("navbar.getStarted")}
          </a>
        </div>
      </nav>
    </header>
  );
}
