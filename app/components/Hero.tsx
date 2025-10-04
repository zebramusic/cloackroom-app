"use client";
import { useLocale } from "@/app/providers/LocaleProvider";
import Image from "next/image";

export default function Hero() {
  const { t } = useLocale();
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/hero.jpg"
          alt="Event venue background"
          fill
          priority
          className="object-cover"
        />
      </div>
      {/* Gradient overlay with 0.4 alpha to keep current vibrant colors */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.40),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.40),transparent_55%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-accent/15 text-accent px-3 py-1 text-xs font-medium ring-1 ring-inset ring-accent/30">
              {t("hero.badge")}
            </span>
            <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
              {t("hero.title")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <a
                href="#contact"
                className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-5 py-3 text-sm font-medium shadow hover:opacity-95"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href="#features"
                className="inline-flex items-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative mx-auto max-w-md">
              <Image
                src="/window.svg"
                alt="Product screenshot"
                width={560}
                height={360}
                className="w-full h-auto dark:invert"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
