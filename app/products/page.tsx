import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Product } from "@/app/models/product";
import { getPublicProducts } from "@/lib/productsPublic";
import { getFeaturedProducts } from "@/lib/productsPublic";
import { getProductsContent } from "@/lib/productsContent";

export const metadata: Metadata = { title: "Products" };

async function loadProducts(
  page: number
): Promise<{ items: Product[]; page: number; hasMore: boolean }> {
  // Prefer direct DB access on the server to avoid auth-protected middleware for public pages.
  // Falls back to empty if DB isn't configured.
  return getPublicProducts(page, 24);
}

export default async function ProductsPage(props: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  // Await searchParams per Next.js async dynamic route API requirement.
  const searchParams = await props.searchParams;
  const langParam = Array.isArray(searchParams.lang)
    ? searchParams.lang[0]
    : searchParams.lang;
  const lang = (langParam || "en").toLowerCase() === "ro" ? "ro" : "en";
  const pageParam = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const { items: products, hasMore } = await loadProducts(page);
  const featured = await getFeaturedProducts(3);
  const content = await getProductsContent();
  const pick = (en: string, ro?: string) => (lang === "ro" ? ro || en : en);
  const heroTitle = pick(content.heroTitle, content.heroTitleRo);
  const heroSubtitle = pick(content.heroSubtitle, content.heroSubtitleRo);
  const heroIntro = pick(content.heroIntro, content.heroIntroRo);
  const featuredHeading = pick(
    content.featuredHeading,
    content.featuredHeadingRo
  );
  const whyHeading = pick(content.whyHeading, content.whyHeadingRo);
  const testimonialsHeading = pick(
    content.testimonialsHeading,
    content.testimonialsHeadingRo
  );
  const faqHeading = pick(content.faqHeading, content.faqHeadingRo);
  const valuesHeading = pick(content.valuesHeading, content.valuesHeadingRo);
  const valuesParagraph = pick(
    content.valuesParagraph,
    content.valuesParagraphRo
  );
  const makeUrl = (p: number, l: string) => {
    const usp = new URLSearchParams();
    usp.set("page", String(p));
    if (l === "ro") usp.set("lang", "ro");
    return `?${usp.toString()}`;
  };
  return (
    <main className="landing-theme relative min-h-screen font-sans">
      <div className="pointer-events-none absolute inset-0 -z-10">
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
      <div className="relative mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 text-foreground">
        {/* Language toggle */}
        <div className="mb-4 flex items-center gap-2 text-xs">
          <Link
            href={makeUrl(page, "en")}
            className={`rounded-full border border-white/30 px-3 py-1 font-semibold transition-colors ${
              lang === "en"
                ? "bg-accent text-black shadow"
                : "bg-black/50 text-white hover:bg-black/30"
            }`}
          >
            EN
          </Link>
          <Link
            href={makeUrl(page, "ro")}
            className={`rounded-full border border-white/30 px-3 py-1 font-semibold transition-colors ${
              lang === "ro"
                ? "bg-accent text-black shadow"
                : "bg-black/50 text-white hover:bg-black/30"
            }`}
          >
            RO
          </Link>
        </div>
        {/* Hero */}
        <section aria-labelledby="products-hero">
          <h1
            id="products-hero"
            className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight"
          >
            {heroTitle}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-muted-foreground max-w-3xl">
            {heroSubtitle}
          </p>
          <p className="mt-4 text-sm sm:text-base text-foreground/80 max-w-3xl">
            {heroIntro}
          </p>
          <div className="mt-5">
            <Link
              href="#catalogue"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-accent px-4 py-2 text-sm font-semibold text-black shadow transition hover:bg-accent/90"
            >
              {lang === "ro" ? "Vezi catalogul" : "Shop the catalogue"}
            </Link>
          </div>
          {/* Image placeholder */}
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 text-muted-foreground text-sm flex items-center justify-center h-[31.25rem]">
            {content.heroImageUrl ? (
              <Image
                src={content.heroImageUrl}
                alt="Hero banner"
                width={800}
                height={160}
                className="object-cover w-full h-full rounded-2xl"
              />
            ) : (
              <span>Image placeholder: hero banner</span>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section aria-labelledby="featured" className="mt-12 sm:mt-14 lg:mt-16">
          <h2 id="featured" className="text-2xl font-semibold">
            {featuredHeading}
          </h2>
          {featured.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "ro"
                ? "Nu există produse recomandate momentan."
                : "No featured products yet."}
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
              {featured.map((p) => {
                const mainSrc = p.photos[p.mainPhotoIndex || 0];
                return (
                  <Link
                    key={p.id}
                    href={`/products/${encodeURIComponent(p.id)}`}
                    aria-label={`View ${p.name}`}
                    className="group relative block rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="relative h-40 sm:h-44 w-full overflow-hidden">
                      {mainSrc ? (
                        <Image
                          src={mainSrc}
                          alt={p.name}
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                      {typeof p.price === "number" ? (
                        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent text-accent-foreground px-2 py-1 text-[11px] shadow">
                          ${p.price}
                        </div>
                      ) : null}
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold truncate text-base sm:text-lg">
                          {p.name}
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-600/10 text-emerald-700 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          {lang === "ro" ? "Recomandat" : "Featured"}
                        </span>
                      </div>
                      {p.description ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {p.description}
                        </p>
                      ) : null}
                      <div className="mt-3 text-xs text-foreground/70 inline-flex items-center gap-1">
                        {lang === "ro" ? "Descoperă" : "Explore"}
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M5.22 3.22a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L8.94 8 5.22 4.28a.75.75 0 0 1 0-1.06Z" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Why choose us */}
        <section aria-labelledby="why" className="mt-12 sm:mt-14 lg:mt-16">
          <h2 id="why" className="text-2xl font-semibold">
            {whyHeading}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl border border-border bg-background p-4">
              <div className="font-medium">
                {lang === "ro" ? "Design premiat" : "Award-winning design"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "ro"
                  ? "Șasiu ergonomic al imprimantei recunoscut pentru reducerea oboselii la stație."
                  : "Ergonomic printer chassis recognized for reducing workstation fatigue."}
              </p>
            </li>
            <li className="rounded-xl border border-border bg-background p-4">
              <div className="font-medium">
                {lang === "ro"
                  ? "Materiale sustenabile"
                  : "Sustainable materials"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "ro"
                  ? "Consumabile certificate FSC și tehnologie termică cu consum redus pentru o amprentă minimă."
                  : "FSC-certified media and low-energy thermal tech to lower footprint."}
              </p>
            </li>
            <li className="rounded-xl border border-border bg-background p-4 sm:col-span-2">
              <div className="font-medium">
                {lang === "ro"
                  ? "Garanție pe viață pentru componentele esențiale"
                  : "Lifetime core warranty"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "ro"
                  ? "Susținem durabilitatea — componentele critice sunt acoperite pe toată durata abonamentului."
                  : "We stand behind durability—critical components covered for the life of your subscription."}
              </p>
            </li>
          </ul>
        </section>

        {/* Testimonials */}
        <section
          aria-labelledby="testimonials"
          className="mt-12 sm:mt-14 lg:mt-16"
        >
          <h2 id="testimonials" className="text-2xl font-semibold">
            {testimonialsHeading}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <blockquote className="rounded-xl border border-border bg-card p-5 text-sm">
              {lang === "ro"
                ? "„Înainte de Cloackroom, garderoba era cel mai mare blocaj. Acum oaspeții intră și ies în câteva secunde — stresul personalului a scăzut, bacșișurile au crescut.”"
                : "“Before Cloackroom, coat check was our slowest choke-point. Now guests are in and out in seconds—staff stress dropped, tips went up.”"}
              <footer className="mt-2 text-muted-foreground">
                {lang === "ro"
                  ? "— Lena R., Proprietar locație boutique"
                  : "— Lena R., Boutique Venue Owner"}
              </footer>
            </blockquote>
            <blockquote className="rounded-xl border border-border bg-card p-5 text-sm">
              {lang === "ro"
                ? "„Fiabilitatea a fost totul. O defecțiune la imprimantă ne dădea planurile peste cap. CloackPrint Pro nu a avut nicio problemă, iar analiticele ne-au ajutat să planificăm personalul mai inteligent.”"
                : "“Reliability was everything. One printer failure used to derail the night. CloackPrint Pro hasn’t hiccupped once, and the analytics helped us plan staffing smarter.”"}
              <footer className="mt-2 text-muted-foreground">
                {lang === "ro"
                  ? "— Marc T., Producător serie de evenimente"
                  : "— Marc T., Event Series Producer"}
              </footer>
            </blockquote>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mt-12 sm:mt-14 lg:mt-16">
          <h2 id="faq" className="text-2xl font-semibold">
            {faqHeading}
          </h2>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-background">
            <div className="p-4">
              <h3 className="font-medium">
                {lang === "ro"
                  ? "Cât de repede imprimă, de fapt, imprimantele?"
                  : "How fast do the printers really print?"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "ro"
                  ? "Sub o secundă per tichet — menținând viteza (da, „viteză”) în vârf de flux fără supraîncălzire."
                  : "Under a second per ticket—maintaining speed (and yes, “spped”) during peak bursts without overheating."}
              </p>
            </div>
            <div className="p-4">
              <h3 className="font-medium">
                {lang === "ro"
                  ? "Care este timpul obișnuit de livrare?"
                  : "What’s the typical shipping time?"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "ro"
                  ? "Comenzile standard se expediază în 2 zile lucrătoare. Opțiuni rapide și internaționale sunt disponibile cu tracking în timp real."
                  : "Standard orders ship within 2 business days. Expedited and international options are available with real-time tracking."}
              </p>
            </div>
            <div className="p-4">
              <h3 className="font-medium">
                {lang === "ro"
                  ? "Este nevoie de personal tehnic pentru instalare?"
                  : "Do I need technical staff for setup?"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "ro"
                  ? "Nu. Unitățile sosesc preconfigurate cu un onboarding ghidat de 10 minute și un card QR de pornire rapidă."
                  : "No. Units arrive pre-configured with a guided 10‑minute onboarding and a QR quick start card."}
              </p>
            </div>
            <div className="p-4">
              <h3 className="font-medium">
                {lang === "ro"
                  ? "Cât de rezistente sunt tichetele?"
                  : "How durable are the tickets?"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "ro"
                  ? "Rezistente la murdărire, umezeală și abraziune. Imprimarea termică rămâne lizibilă chiar și după utilizare intensă."
                  : "Resistant to smudging, moisture, and abrasion. Thermal imprint remains legible after heavy handling."}
              </p>
            </div>
          </div>
        </section>

        {/* Footer micro-copy */}
        <section aria-labelledby="values" className="mt-12 sm:mt-14 lg:mt-16">
          <h2 id="values" className="text-2xl font-semibold">
            {valuesHeading}
          </h2>
          <p className="mt-2 text-sm text-foreground/80 max-w-3xl">
            {valuesParagraph}
          </p>
          <div className="mt-3">
            <Link
              href="/contact"
              className="text-sm rounded-full border border-white/30 bg-black px-3 py-1 text-white transition hover:bg-black/80"
            >
              {lang === "ro" ? "Contactează-ne" : "Contact us"}
            </Link>
          </div>
        </section>

        {/* All products catalogue */}
        <section
          aria-labelledby="catalogue-heading"
          id="catalogue"
          className="mt-12 sm:mt-14 lg:mt-16"
        >
          <h2 id="catalogue-heading" className="text-2xl font-semibold">
            {lang === "ro" ? "Toate produsele" : "All products"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ro"
              ? "Răsfoiește întregul catalog mai jos."
              : "Browse the full catalogue below."}
          </p>
        </section>
        <div className="mt-6 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {products.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {lang === "ro"
                ? "Nu există produse momentan."
                : "No products yet."}
            </div>
          ) : (
            products.map((p) => {
              const mainSrc = p.photos[p.mainPhotoIndex || 0];
              return (
                <Link
                  key={p.id}
                  href={`/products/${encodeURIComponent(p.id)}`}
                  aria-label={`View ${p.name}`}
                  className="group relative block rounded-2xl border border-border bg-card/90 text-card-foreground overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="relative h-48 sm:h-56 lg:h-64 w-full overflow-hidden">
                    {mainSrc ? (
                      <Image
                        src={mainSrc}
                        alt={p.name}
                        fill
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
                    )}
                    {/* gradient overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                    {/* price pill */}
                    {typeof p.price === "number" ? (
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent text-accent-foreground px-2 py-1 text-xs shadow">
                        ${p.price}
                      </div>
                    ) : null}
                    {/* stock status */}
                    <div
                      className={`pointer-events-none absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] uppercase tracking-wide shadow ${
                        p.stock > 0
                          ? "bg-emerald-600/15 text-emerald-700"
                          : "bg-red-600/15 text-red-700"
                      }`}
                    >
                      {p.stock > 0
                        ? lang === "ro"
                          ? "În stoc"
                          : "In stock"
                        : lang === "ro"
                        ? "Stoc epuizat"
                        : "Out of stock"}
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold truncate text-base sm:text-lg">
                        {p.name}
                      </div>
                      {p.archived ? (
                        <span className="shrink-0 rounded-full bg-red-600/10 text-red-700 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          {lang === "ro" ? "Arhivat" : "Archived"}
                        </span>
                      ) : p.active === false ? (
                        <span className="shrink-0 rounded-full bg-yellow-500/10 text-yellow-700 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          {lang === "ro" ? "Ascuns" : "Hidden"}
                        </span>
                      ) : null}
                    </div>
                    {p.description ? (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                        {p.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span>
                          {p.stock} {lang === "ro" ? "în stoc" : "in stock"}
                        </span>
                        {Array.isArray(p.variants) && p.variants.length > 0 ? (
                          <span>
                            {p.variants.length}{" "}
                            {lang === "ro"
                              ? p.variants.length > 1
                                ? "variante"
                                : "variantă"
                              : p.variants.length > 1
                              ? "variants"
                              : "variant"}
                          </span>
                        ) : null}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-foreground/70 group-hover:text-foreground transition-colors">
                        {lang === "ro" ? "Vezi" : "View"}
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M5.22 3.22a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L8.94 8 5.22 4.28a.75.75 0 0 1 0-1.06Z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-foreground/80">
            {lang === "ro" ? "Pagina" : "Page"} {page}
          </div>
          <div className="flex items-center gap-2">
            <PaginationButton
              disabled={page <= 1}
              href={page <= 1 ? makeUrl(1, lang) : makeUrl(page - 1, lang)}
            >
              {lang === "ro" ? "Înapoi" : "Prev"}
            </PaginationButton>
            <PaginationButton
              disabled={!hasMore}
              href={hasMore ? makeUrl(page + 1, lang) : makeUrl(page, lang)}
            >
              {lang === "ro" ? "Înainte" : "Next"}
            </PaginationButton>
          </div>
        </div>
      </div>
    </main>
  );
}

function PaginationButton({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="text-xs rounded-full border border-white/30 px-3 py-1 text-white/40 select-none">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="text-xs rounded-full border border-white/30 px-3 py-1 text-white transition hover:bg-black/80"
    >
      {children}
    </Link>
  );
}
