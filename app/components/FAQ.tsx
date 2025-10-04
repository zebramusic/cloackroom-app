"use client";
import SectionHeading from "./SectionHeading";
import { useLocale } from "@/app/providers/LocaleProvider";

export default function FAQ() {
  const { t } = useLocale();
  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
  ];
  return (
    <section id="faq" className="py-16 sm:py-24">
      <SectionHeading title={t("faq.title")} subtitle={t("faq.subtitle")} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {faqs.map((item, idx) => (
          <details key={idx} className="group open:bg-muted/50 px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-foreground font-medium">
              <span>{item.q}</span>
              <span className="text-accent group-open:rotate-45 transition-transform text-xl">
                +
              </span>
            </summary>
            <p className="pb-6 text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
