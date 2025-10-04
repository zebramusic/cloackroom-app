"use client";
import { useLocale } from "@/app/providers/LocaleProvider";

export default function Contact() {
  const { t } = useLocale();
  return (
    <section id="contact" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-center">
          {t("contact.title")}
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          {t("contact.subtitle")}
        </p>
        <form className="mt-8 grid gap-4 bg-card border border-border rounded-2xl p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground"
              >
                {t("contact.name")}
              </label>
              <input
                id="name"
                name="name"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                {t("contact.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="jane@example.com"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-foreground"
            >
              {t("contact.message")}
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
              placeholder="How can we help?"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow hover:opacity-95"
            >
              {t("contact.submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
