"use client";
import Image from "next/image";
import SectionHeading from "./SectionHeading";
import { useLocale } from "@/app/providers/LocaleProvider";

type Work = {
  title: string;
  tag: string;
  image: string;
  description: string;
};

export default function Portfolio() {
  const { t } = useLocale();
  const works: Work[] = [
    {
      title: "Edge AI Monitoring",
      tag: "Computer Vision",
      image: "/window.svg",
      description:
        "Autonomous anomaly detection with on‑device inference and realtime alerts.",
    },
    {
      title: "Realtime Analytics Hub",
      tag: "Data Platform",
      image: "/globe.svg",
      description:
        "Unified telemetry pipeline with sub‑second dashboards and actionable KPIs.",
    },
    {
      title: "Secure Access Fabric",
      tag: "Zero‑Trust",
      image: "/file.svg",
      description:
        "Identity‑aware gateways with continuous verification and policy orchestration.",
    },
    {
      title: "Automation Studio",
      tag: "Workflow",
      image: "/next.svg",
      description:
        "No‑code builders that connect systems, automate approvals, and reduce toil.",
    },
    {
      title: "Experience Redesign",
      tag: "UX Modernization",
      image: "/window.svg",
      description:
        "Responsive design system with motion, dark mode, and accessibility baked‑in.",
    },
    {
      title: "Cloud Migration Kit",
      tag: "SaaS Platform",
      image: "/globe.svg",
      description:
        "Blueprints and tooling to lift‑and‑shift or refactor reliably, with observability.",
    },
  ];

  return (
    <section id="portfolio" className="relative py-16 sm:py-24">
      {/* Hi‑tech grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        style={{
          backgroundImage:
            "linear-gradient(0deg, transparent 24%, rgba(120,120,120,.15) 25%, rgba(120,120,120,.15) 26%, transparent 27%), linear-gradient(90deg, transparent 24%, rgba(120,120,120,.15) 25%, rgba(120,120,120,.15) 26%, transparent 27%)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={t("portfolio.title") || "Our Work"}
          subtitle={
            t("portfolio.subtitle") ||
            "Selected projects showcasing performance, security, and craft."
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => (
            <article
              key={w.title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {/* Neon corner glow */}
              <div className="absolute -inset-px -z-10 rounded-2xl bg-[radial-gradient(20%_40%_at_0%_0%,rgba(124,58,237,0.25),transparent),radial-gradient(20%_40%_at_100%_100%,rgba(16,185,129,0.25),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="p-5 flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-lg ring-1 ring-border/70 bg-background/60 backdrop-blur">
                  <Image
                    src={w.image}
                    alt=""
                    fill
                    className="object-contain p-2 dark:invert"
                  />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                    {w.tag}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold leading-tight">
                    {w.title}
                  </h3>
                </div>
              </div>
              <p className="px-5 text-sm text-muted-foreground">
                {w.description}
              </p>
              <div className="p-5 pt-4">
                <div className="h-36 rounded-xl bg-gradient-to-br from-foreground/5 to-transparent ring-1 ring-border/70" />
              </div>

              <div className="px-5 pb-5">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-muted"
                  type="button"
                >
                  {t("portfolio.viewCase") || "View case"}
                  <span aria-hidden>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
