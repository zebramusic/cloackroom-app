import { getDb } from "@/lib/mongodb";

export interface ProductsPageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroIntro: string;
  heroImageUrl?: string;
  featuredHeading: string;
  whyHeading: string;
  testimonialsHeading: string;
  faqHeading: string;
  valuesHeading: string;
  valuesParagraph: string;
  // Romanian translations
  heroTitleRo?: string;
  heroSubtitleRo?: string;
  heroIntroRo?: string;
  featuredHeadingRo?: string;
  whyHeadingRo?: string;
  testimonialsHeadingRo?: string;
  faqHeadingRo?: string;
  valuesHeadingRo?: string;
  valuesParagraphRo?: string;
  updatedAt?: number;
}

const DEFAULT_CONTENT: ProductsPageContent = {
  heroTitle: "Accelerate Your Cloackroom Operations",
  heroSubtitle: "Precision, spped, and reliability for entrepreneurs who refuse bottlenecks.",
  heroIntro:
    "Cloackroom gives venues, events, and hospitality teams the tools to move faster, reduce queue friction, and never lose track of a single item. Our purpose-built cloakroom printers and intelligent ticketing deliver instant prints, durable media, and actionable data—helping you unlock smoother guest experiences and confident staff performance.",
  heroImageUrl: undefined,
  featuredHeading: "Featured Products",
  whyHeading: "Why choose us",
  testimonialsHeading: "Customer voices",
  faqHeading: "FAQ",
  valuesHeading: "Our values",
  valuesParagraph:
    "Cloackroom champions operational clarity, guest trust, and sustainable growth. Every component is designed for speed, reliability, and measurable ROI.",
  // RO defaults
  heroTitleRo: "Accelerează operațiunile Cloackroom",
  heroSubtitleRo: "Precizie, viteză și fiabilitate pentru antreprenorii care refuză blocajele.",
  heroIntroRo:
    "Cloackroom oferă locațiilor, evenimentelor și echipelor de ospitalitate instrumente pentru a se mișca mai rapid, a reduce cozile și a nu pierde niciun obiect. Imprimantele noastre dedicate garderobei și tichetarea inteligentă oferă printări instant, consumabile rezistente și date utile — pentru experiențe fluide ale oaspeților și încredere în performanța echipelor.",
  featuredHeadingRo: "Produse recomandate",
  whyHeadingRo: "De ce noi",
  testimonialsHeadingRo: "Părerile clienților",
  faqHeadingRo: "Întrebări frecvente",
  valuesHeadingRo: "Valorile noastre",
  valuesParagraphRo:
    "Cloackroom promovează claritatea operațională, încrederea oaspeților și creșterea sustenabilă. Fiecare componentă este proiectată pentru viteză, fiabilitate și ROI măsurabil.",
};

const CONTENT_ID = "products";

export async function getProductsContent(): Promise<ProductsPageContent> {
  const db = await getDb();
  if (!db) return DEFAULT_CONTENT;
  const doc = await db.collection<ProductsPageContent>("pageContent").findOne({ _id: CONTENT_ID });
  if (!doc) return DEFAULT_CONTENT;
  // Merge with defaults to ensure newly added fields appear
  return { ...DEFAULT_CONTENT, ...doc };
}

export async function updateProductsContent(patch: Partial<ProductsPageContent>): Promise<ProductsPageContent> {
  const db = await getDb();
  if (!db) return { ...DEFAULT_CONTENT, ...patch };
  const update: Partial<ProductsPageContent> = { ...patch, updatedAt: Date.now() };
  await db.collection<ProductsPageContent>("pageContent").updateOne(
    { _id: CONTENT_ID },
    { $set: update },
    { upsert: true }
  );
  const fresh = await db.collection<ProductsPageContent>("pageContent").findOne({ _id: CONTENT_ID });
  return { ...DEFAULT_CONTENT, ...fresh };
}
