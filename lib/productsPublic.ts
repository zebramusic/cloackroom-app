import { getDb } from "@/lib/mongodb";
import type { Product } from "@/app/models/product";

export async function getPublicProducts(page: number, limit: number) : Promise<{ items: Product[]; page: number; hasMore: boolean }> {
  const db = await getDb();
  if (!db) return { items: [], page, hasMore: false };
  const coll = db.collection<Product>("products");
  const where: Record<string, unknown> = { active: { $ne: false }, archived: { $ne: true } };
  const upto = page * limit + 1;
  const windowItems = await coll.find(where).sort({ createdAt: -1 }).limit(upto).toArray();
  const start = (page - 1) * limit;
  const pageItems = windowItems.slice(start, start + limit);
  const hasMore = windowItems.length > page * limit;
  return { items: pageItems, page, hasMore };
}

export async function getPublicProductById(id: string): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<Product>("products");
  const where: Record<string, unknown> = {
    id,
    active: { $ne: false },
    archived: { $ne: true },
  };
  const doc = await coll.findOne(where);
  return doc || null;
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  const coll = db.collection<Product>("products");
  const where: Record<string, unknown> = {
    active: { $ne: false },
    archived: { $ne: true },
    isFeatured: true,
  };
  const items = await coll.find(where).sort({ createdAt: -1 }).limit(limit).toArray();
  return items;
}
