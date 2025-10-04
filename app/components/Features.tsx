"use client";
import SectionHeading from "./SectionHeading";
import { useLocale } from "@/app/providers/LocaleProvider";

export default function Features() {
  const { t } = useLocale();
  const features = [
    {
      title: t("features.item1.title"),
      desc: t("features.item1.desc"),
      icon: "⚡",
    },
    {
      title: t("features.item2.title"),
      desc: t("features.item2.desc"),
      icon: "🛡️",
    },
    {
      title: t("features.item3.title"),
      desc: t("features.item3.desc"),
      icon: "🎨",
    },
    {
      title: t("features.item4.title"),
      desc: t("features.item4.desc"),
      icon: "📈",
    },
  ];
  return (
    <section id="features" className="py-16 sm:py-24">
      <SectionHeading
        title={t("features.title")}
        subtitle={t("features.subtitle")}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
