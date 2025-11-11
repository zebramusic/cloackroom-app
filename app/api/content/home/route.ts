export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import {
  getHomeContent,
  updateHomeContent,
  type FeatureCard,
  type HomePageContent,
  type EventLocationItem,
  type PortfolioCard,
  type TrustedByItem,
} from "@/lib/homeContent";
import { randomUUID } from "node:crypto";

export async function GET() {
  const content = await getHomeContent();
  return NextResponse.json(content);
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const patch = (await req.json()) as Partial<HomePageContent>;
  // Basic validation for trustedBy items if present
  if (patch.trustedBy) {
    patch.trustedBy = patch.trustedBy
      .filter((i) => i && typeof i.id === "string" && i.id.trim())
      .map((i) => {
        const item: TrustedByItem = {
          id: i.id,
          nameEn: typeof i.nameEn === "string" ? i.nameEn : "",
          nameRo: typeof i.nameRo === "string" ? i.nameRo : "",
          blurbEn: typeof i.blurbEn === "string" ? i.blurbEn : "",
          blurbRo: typeof i.blurbRo === "string" ? i.blurbRo : "",
          imageUrl: typeof i.imageUrl === "string" ? i.imageUrl : "",
          updatedAt: Date.now(),
        };
        return item;
      });
  }

  if (patch.featureCards) {
    if (!Array.isArray(patch.featureCards)) {
      delete patch.featureCards;
    } else {
      patch.featureCards = patch.featureCards
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => sanitizeFeatureCard(entry as Partial<FeatureCard>));
    }
  }

  if (patch.portfolioCards) {
    if (!Array.isArray(patch.portfolioCards)) {
      delete patch.portfolioCards;
    } else {
      patch.portfolioCards = patch.portfolioCards
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => sanitizePortfolioCard(entry as Partial<PortfolioCard>));
    }
  }

  if (patch.eventsLocations) {
    if (!Array.isArray(patch.eventsLocations)) {
      delete patch.eventsLocations;
    } else {
      patch.eventsLocations = patch.eventsLocations
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) =>
          sanitizeEventLocation(entry as Partial<EventLocationItem>)
        );
    }
  }
  const merged = await updateHomeContent(patch);
  return NextResponse.json(merged);
}

function sanitizeFeatureCard(card: Partial<FeatureCard>): FeatureCard {
  const id =
    typeof card.id === "string" && card.id.trim()
      ? card.id.trim()
      : randomUUID();
  const base: FeatureCard = {
    id,
    icon:

      typeof card.icon === "string" && card.icon.trim()
        ? card.icon.trim()
        : "✨",
    titleEn: typeof card.titleEn === "string" ? card.titleEn : "",
    descriptionEn:
      typeof card.descriptionEn === "string" ? card.descriptionEn : "",
    updatedAt: Date.now(),
  };
  if (typeof card.titleRo === "string") {
    base.titleRo = card.titleRo;
  }
  if (typeof card.descriptionRo === "string") {
    base.descriptionRo = card.descriptionRo;
  }
  if (typeof card.imageUrl === "string" && card.imageUrl.trim()) {
    base.imageUrl = card.imageUrl.trim();
  }
  return base;
}

function sanitizePortfolioCard(card: Partial<PortfolioCard>): PortfolioCard {
  const id =
    typeof card.id === "string" && card.id.trim()
      ? card.id.trim()
      : randomUUID();
  const base: PortfolioCard = {
    id,
    titleEn: typeof card.titleEn === "string" ? card.titleEn : "",
    tagEn: typeof card.tagEn === "string" ? card.tagEn : "",
    descriptionEn:
      typeof card.descriptionEn === "string" ? card.descriptionEn : "",
    imageUrl:
      typeof card.imageUrl === "string" && card.imageUrl.trim()
        ? card.imageUrl.trim()
        : undefined,
    updatedAt: Date.now(),
  };
  if (typeof card.titleRo === "string") {
    base.titleRo = card.titleRo;
  }
  if (typeof card.tagRo === "string") {
    base.tagRo = card.tagRo;
  }
  if (typeof card.descriptionRo === "string") {
    base.descriptionRo = card.descriptionRo;
  }
  return base;
}

function sanitizeEventLocation(
  entry: Partial<EventLocationItem>
): EventLocationItem {
  const id =
    typeof entry.id === "string" && entry.id.trim()
      ? entry.id.trim()
      : randomUUID();
  const base: EventLocationItem = {
    id,
    labelEn:
      typeof entry.labelEn === "string" && entry.labelEn.trim()
        ? entry.labelEn.trim()
        : "",
    updatedAt: Date.now(),
  };
  if (typeof entry.labelRo === "string") {
    base.labelRo = entry.labelRo;
  }
  return base;
}

