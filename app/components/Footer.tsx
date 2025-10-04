"use client";
import { useLocale } from "@/app/providers/LocaleProvider";

export default function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-border mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Cloackroom. {t("footer.rights")}
        </p>
        <div className="flex items-center gap-4">
          <a href="#features" className="hover:text-foreground">
            {t("navbar.features")}
          </a>
          <a href="#partners" className="hover:text-foreground">
            {t("navbar.partners")}
          </a>
          <a href="#faq" className="hover:text-foreground">
            {t("navbar.faq")}
          </a>
          <a href="#contact" className="hover:text-foreground">
            {t("navbar.contact")}
          </a>
        </div>
      </div>
    </footer>
  );
}
