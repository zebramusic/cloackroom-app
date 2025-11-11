import { getDb } from "@/lib/mongodb";

export interface TrustedByItem {
  id: string; // stable identifier for item updates
  nameEn: string;
  nameRo?: string;
  blurbEn?: string;
  blurbRo?: string;
  imageUrl?: string; // /uploads/ path
  updatedAt?: number;
}

export interface FeatureCard {
  id: string;
  icon: string;
  titleEn: string;
  titleRo?: string;
  descriptionEn: string;
  descriptionRo?: string;
  imageUrl?: string;
  updatedAt?: number;
}

export interface PortfolioCard {
  id: string;
  titleEn: string;
  titleRo?: string;
  tagEn: string;
  tagRo?: string;
  descriptionEn: string;
  descriptionRo?: string;
  imageUrl?: string;
  updatedAt?: number;
}

export interface EventLocationItem {
  id: string;
  labelEn: string;
  labelRo?: string;
  updatedAt?: number;
}

export interface HomePageContent {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroIntro: string;
  heroImageUrl?: string;
  featuresHeading: string;
  featuresIntro: string;
  portfolioHeading: string;
  portfolioIntro: string;
  partnersHeading: string;
  partnersIntro: string;
  eventsHeading: string;
  featureCards?: FeatureCard[];
  portfolioCards?: PortfolioCard[];
  trustedBy?: TrustedByItem[]; // managed list of partner/team logos
  eventsLocations?: EventLocationItem[];
  // Romanian translations
  heroBadgeRo?: string;
  heroTitleRo?: string;
  heroSubtitleRo?: string;
  heroIntroRo?: string;
  featuresHeadingRo?: string;
  featuresIntroRo?: string;
  portfolioHeadingRo?: string;
  portfolioIntroRo?: string;
  partnersHeadingRo?: string;
  partnersIntroRo?: string;
  eventsHeadingRo?: string;
  updatedAt?: number;
}

const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
  {
    id: "feature-card-1",
    icon: "⚡",
    titleEn: "Blazing performance",
    descriptionEn: "Edge-ready rendering, smart caching, and zero-bloat delivery.",
  },
  {
    id: "feature-card-2",
    icon: "🛡️",
    titleEn: "Defense in depth",
    descriptionEn: "Least privilege access, audit trails, and hardened workflows.",
  },
  {
    id: "feature-card-3",
    icon: "🔗",
    titleEn: "Composable integrations",
    descriptionEn: "First-party APIs and connectors that actually click together.",
  },
  {
    id: "feature-card-4",
    icon: "📈",
    titleEn: "Observability",
    descriptionEn: "Meaningful metrics, traceability, and proactive alerts.",
  },
  {
    id: "feature-card-5",
    icon: "🧩",
    titleEn: "Design systems",
    descriptionEn: "Accessible UI kits with tokens, themes, and motion.",
  },
  {
    id: "feature-card-6",
    icon: "🚀",
    titleEn: "CI/CD automation",
    descriptionEn: "From PR to production with safety checks at every step.",
  },
];

const DEFAULT_PORTFOLIO_CARDS: PortfolioCard[] = [
  {
    id: "portfolio-card-1",
    titleEn: "Edge AI Monitoring",
    tagEn: "Computer Vision",
    descriptionEn: "On-device inference with realtime anomaly alerts.",
    imageUrl: "/window.svg",
  },
  {
    id: "portfolio-card-2",
    titleEn: "Realtime Analytics Hub",
    tagEn: "Data Platform",
    descriptionEn: "Unified telemetry and sub-second dashboards.",
    imageUrl: "/globe.svg",
  },
  {
    id: "portfolio-card-3",
    titleEn: "Secure Access Fabric",
    tagEn: "Zero-Trust",
    descriptionEn: "Continuous verification with policy orchestration.",
    imageUrl: "/file.svg",
  },
  {
    id: "portfolio-card-4",
    titleEn: "Automation Studio",
    tagEn: "Workflow",
    descriptionEn: "No-code builders to automate approvals and ops.",
    imageUrl: "/next.svg",
  },
  {
    id: "portfolio-card-5",
    titleEn: "Experience Redesign",
    tagEn: "UX",
    descriptionEn: "Responsive design system with motion & a11y.",
    imageUrl: "/window.svg",
  },
  {
    id: "portfolio-card-6",
    titleEn: "Cloud Migration Kit",
    tagEn: "SaaS",
    descriptionEn: "Blueprints to refactor reliably with observability.",
    imageUrl: "/globe.svg",
  },
];

const DEFAULT_HOME: HomePageContent = {
  heroBadge: "Cloackroom • Enterprise ready",
  heroTitle: "Build faster. Operate safer. Scale smarter.",
  heroSubtitle: "We engineer reliable experiences with modern stacks, robust security, and a relentless focus on performance.",
  heroIntro: "",
  heroImageUrl: undefined,
  featuresHeading: "Engineer the essentials",
  featuresIntro: "Opinionated building blocks that prioritize resilience, speed, and security.",
  portfolioHeading: "Selected work",
  portfolioIntro: "A snapshot of projects that blend performance, craft, and security.",
  partnersHeading: "Trusted by teams",
  partnersIntro: "From startups to enterprises, we partner to deliver outcomes.",
  eventsHeading: "Events & Locations",
  featureCards: DEFAULT_FEATURE_CARDS,
  portfolioCards: DEFAULT_PORTFOLIO_CARDS,
  // Romanian defaults
  heroBadgeRo: "Cloackroom • Gata pentru Enterprise",
  heroTitleRo: "Construiește mai rapid. Operază mai sigur. Scalează mai inteligent.",
  heroSubtitleRo: "Construim experiențe fiabile cu stack‑uri moderne, securitate robustă și un focus neobosit pe performanță.",
  heroIntroRo: "",
  featuresHeadingRo: "Inginerie esențială",
  featuresIntroRo: "Blocuri de construcție opinate ce prioritizează reziliența, viteza și securitatea.",
  portfolioHeadingRo: "Lucrări selectate",
  portfolioIntroRo: "O imagine a proiectelor ce îmbină performanța, execuția și securitatea.",
  partnersHeadingRo: "De încredere pentru echipe",
  partnersIntroRo: "De la startup-uri la enterprise, colaborăm pentru rezultate.",
  eventsHeadingRo: "Evenimente & locații",
  trustedBy: [],
  eventsLocations: [],
};

const CONTENT_ID = "home";

export async function getHomeContent(): Promise<HomePageContent> {
  const db = await getDb();
  if (!db) return normalizeHomeContent();
  const doc = await db.collection<HomePageContent>("pageContent").findOne({ _id: CONTENT_ID });
  if (!doc) return normalizeHomeContent();
  return normalizeHomeContent(doc);
}

export async function updateHomeContent(patch: Partial<HomePageContent>): Promise<HomePageContent> {
  const db = await getDb();
  if (!db) return normalizeHomeContent(patch);
  const update: Partial<HomePageContent> = { ...patch, updatedAt: Date.now() };
  await db.collection<HomePageContent>("pageContent").updateOne({ _id: CONTENT_ID }, { $set: update }, { upsert: true });
  const fresh = await db.collection<HomePageContent>("pageContent").findOne({ _id: CONTENT_ID });
  return normalizeHomeContent(fresh || patch);
}

function normalizeHomeContent(source?: Partial<HomePageContent>): HomePageContent {
  const merged: Partial<HomePageContent> = {
    ...DEFAULT_HOME,
    ...source,
  };
  return {
    ...merged,
    trustedBy: cloneArray(merged.trustedBy) ?? [],
    featureCards:
      cloneArray(merged.featureCards) ?? cloneArray(DEFAULT_FEATURE_CARDS) ?? [],
    portfolioCards:
      cloneArray(merged.portfolioCards) ?? cloneArray(DEFAULT_PORTFOLIO_CARDS) ?? [],
    eventsLocations: cloneArray(merged.eventsLocations) ?? [],
  } as HomePageContent;
}

function cloneArray<T>(value: T[] | undefined): T[] | undefined {
  if (!value) return undefined;
  return cloneValue(value);
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
