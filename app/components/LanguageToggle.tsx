"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/app/providers/LocaleProvider";

type ToggleVariant = "floating" | "inline";

type LanguageToggleProps = {
  variant?: ToggleVariant;
  className?: string;
};

export default function LanguageToggle({
  variant = "floating",
  className,
}: LanguageToggleProps = {}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { setLocale } = useLocale();
  if (pathname.startsWith("/private")) return null;
  const lang = search.get("lang") === "ro" ? "ro" : "en";
  const params = new URLSearchParams(search.toString());
  const nextLang = lang === "en" ? "ro" : "en";
  const toggle = () => {
    setLocale(nextLang);
    if (nextLang === "ro") params.set("lang", "ro");
    else params.delete("lang");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const baseClasses =
    variant === "inline"
      ? "inline-flex items-center justify-center rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
      : "fixed right-3 top-3 z-50 rounded-full border border-border bg-background/80 backdrop-blur px-3 py-1 text-xs hover:bg-muted shadow";
  const composed = className ? `${baseClasses} ${className}` : baseClasses;
  return (
    <button
      onClick={toggle}
      className={composed}
      aria-label="Toggle language"
      data-skip-confirm="true"
      style={{
        backgroundColor: "#000000",
        color: "#ffffff",
        borderColor: "rgba(255,255,255,0.3)",
      }}
    >
      {lang === "en" ? "RO" : "EN"}
    </button>
  );
}
