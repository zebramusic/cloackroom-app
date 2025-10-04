"use client";
import Image from "next/image";
import SectionHeading from "./SectionHeading";
import { useLocale } from "@/app/providers/LocaleProvider";

const logos = [
  { src: "/vercel.svg", alt: "Vercel" },
  { src: "/next.svg", alt: "Next.js" },
  { src: "/globe.svg", alt: "Globe" },
  { src: "/file.svg", alt: "File" },
  { src: "/window.svg", alt: "Window" },
];

export default function Partners() {
  const { t } = useLocale();
  return (
    <section id="partners" className="py-16 sm:py-24 bg-muted">
      <SectionHeading
        title={t("partners.title")}
        subtitle={t("partners.subtitle")}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 items-center">
        {logos.map((logo) => (
          <div
            key={logo.alt}
            className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={120}
              height={40}
              className="dark:invert"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
