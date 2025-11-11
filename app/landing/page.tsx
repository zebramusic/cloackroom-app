import Image from "next/image";
import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import { Suspense } from "react";
import { getHomeContent } from "@/lib/homeContent";
import type { TrustedByItem } from "@/lib/homeContent";
import { cookies, headers } from "next/headers";

export const metadata: Metadata = {
  title: "Cloackroom — Next‑Gen Solutions",
  description:
    "A hi‑tech landing showcasing our capabilities: engineered features, a portfolio of work, and trusted partners.",
};

export default async function Landing({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const requestedLangRaw =
    typeof resolvedParams?.lang === "string"
      ? resolvedParams.lang.toLowerCase()
      : undefined;

  const cookieStore = await cookies();
  const cookieLangRaw = cookieStore.get?.("lang")?.value?.toLowerCase();

  const headerList = await headers();
  const countryCode =
    headerList.get("x-vercel-ip-country") ??
    headerList.get("cf-ipcountry") ??
    headerList.get("fly-client-country") ??
    headerList.get("x-country-code");
  const isRomanianVisitor = countryCode?.toUpperCase() === "RO";

  let locale: "en" | "ro" = "en";
  if (requestedLangRaw === "ro") locale = "ro";
  else if (requestedLangRaw === "en") locale = "en";
  else if (cookieLangRaw === "ro") locale = "ro";
  else if (cookieLangRaw === "en") locale = "en";
  else if (isRomanianVisitor) locale = "ro";

  const content = await getHomeContent();
  const pick = <T extends string | undefined>(en: T, ro?: T) =>
    locale === "ro" ? ro || en : en;
  const featureCards = content.featureCards ?? [];
  const portfolioCards = content.portfolioCards ?? [];
  const trustedByItems = content.trustedBy ?? [];
  const eventsLocations = content.eventsLocations ?? [];
  const fallbackTrustedBy: TrustedByItem[] = [
    {
      id: "fallback-vercel",
      nameEn: "Vercel",
      blurbEn: "Deploy",
      imageUrl: "/vercel.svg",
    },
    {
      id: "fallback-next",
      nameEn: "Next.js",
      blurbEn: "Framework",
      imageUrl: "/next.svg",
    },
    {
      id: "fallback-globe",
      nameEn: "Globe",
      blurbEn: "Reach",
      imageUrl: "/globe.svg",
    },
    {
      id: "fallback-window",
      nameEn: "Window",
      blurbEn: "UI",
      imageUrl: "/window.svg",
    },
  ];
  return (
    <main className="landing-theme relative font-sans">
      <div className="pointer-events-none fixed inset-0 -z-50">
        <div className="absolute inset-0 bg-[#040611]" />
        <div
          className="absolute inset-0 opacity-50"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), radial-gradient(rgba(59,130,246,0.12) 1px, transparent 1px)",
            backgroundSize: "160px 160px, 220px 220px",
            backgroundPosition: "0 0, 60px 80px",
          }}
        />
        <div
          className="absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(65% 75% at 15% 20%, rgba(56,189,248,0.22), transparent 70%), radial-gradient(50% 60% at 82% 18%, rgba(244,114,182,0.2), transparent 75%), radial-gradient(55% 60% at 50% 95%, rgba(110,231,183,0.18), transparent 80%)",
          }}
        />
        <div
          className="absolute inset-0 mix-blend-screen opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(59,130,246,0.08) 0%, transparent 55%, rgba(20,184,166,0.08) 95%), linear-gradient(300deg, rgba(236,72,153,0.08) 10%, transparent 50%, rgba(125,211,252,0.08) 90%)",
          }}
        />
      </div>
      <Suspense fallback={null}>
        <SiteNav />
      </Suspense>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <span className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium ring-1 ring-inset ring-accent/40">
                {pick(content.heroBadge, content.heroBadgeRo)}
              </span>
              <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                  {pick(content.heroTitle, content.heroTitleRo)}
                </span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
                {pick(content.heroSubtitle, content.heroSubtitleRo)}
              </p>
              {content.heroIntro && (
                <p className="mt-4 text-sm text-muted-foreground max-w-xl">
                  {pick(content.heroIntro, content.heroIntroRo)}
                </p>
              )}

              {/* Quick value bullets */}
              <ul className="mt-6 grid gap-3 text-sm text-foreground/90 sm:grid-cols-2">
                {[
                  locale === "ro" ? "Configurare rapidă" : "Fast setup",
                  locale === "ro" ? "Securizat implicit" : "Secure by default",
                  locale === "ro"
                    ? "Performanță fiabilă"
                    : "Reliable performance",
                  locale === "ro" ? "Scalare fără efort" : "Effortless scaling",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground ring-1 ring-inset ring-accent/40">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: visual (plain image, no effects) */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto max-w-md">
                <div className="rounded-2xl border border-border bg-background/80 p-2 backdrop-blur-sm">
                  <div className="overflow-hidden rounded-xl">
                    <Image
                      src={content.heroImageUrl || "/window.svg"}
                      alt="Hero visual"
                      width={560}
                      height={360}
                      className="h-auto w-full"
                    />
                  </div>
                </div>
                {/* Floating badges removed per request */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {featureCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              {locale === "ro"
                ? "Nu există carduri configurate pentru această secțiune."
                : "No feature cards configured yet."}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCards.map((f, idx) => {
                const rawTitle = pick(f.titleEn || "", f.titleRo);
                const displayTitle =
                  rawTitle ||
                  `${locale === "ro" ? "Caracteristică" : "Feature"} ${
                    idx + 1
                  }`;
                const description = pick(
                  f.descriptionEn || "",
                  f.descriptionRo
                );
                return (
                  <div
                    key={f.id}
                    className="rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 text-3xl">{f.icon || "✨"}</div>
                    <h3 className="text-lg font-semibold">{displayTitle}</h3>
                    {description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* PORTFOLIO */}
      <section id="portfolio" className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10">
          {portfolioCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              {locale === "ro"
                ? "Nu există proiecte listate în acest moment."
                : "No portfolio cards configured yet."}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioCards.map((w, idx) => {
                const title = pick(w.titleEn || "", w.titleRo);
                const fallbackTitle =
                  title ||
                  `${locale === "ro" ? "Proiect" : "Project"} ${idx + 1}`;
                const tag =
                  pick(w.tagEn || "", w.tagRo) ||
                  (locale === "ro" ? "Categorie" : "Category");
                return (
                  <article
                    key={w.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="absolute -inset-px -z-10 rounded-2xl bg-[radial-gradient(20%_40%_at_0%_0%,rgba(124,58,237,0.25),transparent),radial-gradient(20%_40%_at_100%_100%,rgba(16,185,129,0.25),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="sr-only">
                      <div>{tag}</div>
                      <div>{fallbackTitle}</div>
                    </div>
                    <div className="p-5 pt-4">
                      {w.imageUrl ? (
                        <div className="relative h-[15.2rem] w-full overflow-hidden rounded-xl ring-1 ring-border/70">
                          <Image
                            src={w.imageUrl}
                            alt={title || fallbackTitle}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-[15.2rem] rounded-xl bg-gradient-to-br from-foreground/5 to-transparent ring-1 ring-border/70" />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* PARTNERS */}
      <section id="partners" className="py-16 sm:py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-8 text-center max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {pick(content.partnersHeading, content.partnersHeadingRo)}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 items-center">
            {(trustedByItems.length > 0
              ? trustedByItems
              : fallbackTrustedBy
            ).map((item, idx) => {
              const displayName =
                locale === "ro"
                  ? item.nameRo || item.nameEn || "Partener"
                  : item.nameEn || item.nameRo || "Partner";
              const blurb =
                locale === "ro"
                  ? item.blurbRo || item.blurbEn
                  : item.blurbEn || item.blurbRo;
              const src =
                item.imageUrl && item.imageUrl.length > 0
                  ? item.imageUrl
                  : "/vercel.svg";
              const key = item.id ?? `${idx}-${src}`;
              return (
                <div
                  key={key}
                  className="flex flex-col items-center justify-center text-center gap-2 opacity-80 transition-opacity hover:opacity-100"
                >
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-background shadow-sm">
                    <Image
                      src={src}
                      alt={displayName}
                      fill
                      sizes="(min-width: 1024px) 96px, (min-width: 640px) 96px, 96px"
                      className="object-cover"
                    />
                  </div>
                  {blurb ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {blurb}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* EVENTS & LOCATIONS */}
      <section id="events" className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {pick(content.eventsHeading, content.eventsHeadingRo)}
            </h2>
          </div>
          {eventsLocations.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-border/70 bg-background/80 px-8 py-12 text-center text-sm text-muted-foreground shadow-sm">
              {locale === "ro"
                ? "Nu există evenimente sau locații publicate momentan."
                : "No events or locations published yet."}
            </div>
          ) : (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {eventsLocations.map((entry, idx) => {
                const label = pick(entry.labelEn || "", entry.labelRo);
                const fallbackLabel =
                  label || `${locale === "ro" ? "Element" : "Item"} ${idx + 1}`;
                return (
                  <li
                    key={entry.id || idx}
                    className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-xl"
                  >
                    <div
                      className="absolute -inset-px -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(90% 110% at 10% 0%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(70% 90% at 110% 120%, rgba(16,185,129,0.2), transparent 65%)",
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        {locale === "ro" ? "Eveniment" : "Event"}
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/25">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-5 text-base font-medium leading-relaxed text-foreground">
                      {fallbackLabel}
                    </p>
                    <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
                    <p className="mt-4 text-[13px] text-muted-foreground">
                      {locale === "ro"
                        ? "Actualizează detaliile direct din dashboard când apar schimbări."
                        : "Keep the details fresh from the dashboard whenever plans evolve."}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
