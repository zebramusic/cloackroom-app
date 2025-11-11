export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import type { Product, ProductVariant } from "@/app/models/product";

// In-memory fallback when DB is not configured
const memProducts: Product[] = [];

function sanitizePublic(p: Product): Product {
  // For now we return full product; in real scenarios, consider stripping internal fields
  return p;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const includeAll = searchParams.get("all") === "1" || searchParams.get("admin") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limitRaw = parseInt(searchParams.get("limit") || "", 10);
  const limit = Math.min(100, Math.max(1, limitRaw || 24));
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  const isAdmin = !!me && me.type === "admin";

  const db = await getDb();
  type MongoFilter = Record<string, unknown> & {
    $or?: Array<Record<string, unknown>>;
  };
  const where: MongoFilter = {};
  if (q) {
    where.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
  if (!isAdmin || !includeAll) {
    // Public filters: active != false and archived != true
    where.active = { $ne: false } as unknown as boolean;
    where.archived = { $ne: true } as unknown as boolean;
  }
  if (db) {
    const coll = db.collection<Product>("products");
    const upto = page * limit + 1; // fetch up to requested window + lookahead
    const windowItems = await coll
      .find(where)
      .sort({ createdAt: -1 })
      .limit(upto)
      .toArray();
    const start = (page - 1) * limit;
    const pageItems = windowItems.slice(start, start + limit);
    const hasMore = windowItems.length > page * limit;
    const list = !isAdmin && !includeAll ? pageItems.map(sanitizePublic) : pageItems;
    return NextResponse.json({
      items: list,
      page,
      limit,
      hasMore,
    });
  }
  let items = memProducts.slice();
  if (q) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }
  if (!isAdmin || !includeAll) {
    items = items.filter((p) => p.active !== false && p.archived !== true);
  }
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);
  const hasMore = items.length > page * limit;
  return NextResponse.json({
    items: paged.map(sanitizePublic),
    page,
    limit,
    hasMore,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const body = (await req.json()) as Partial<Product> & {
    name?: string;
    description?: string;
    photos?: string[];
    mainPhotoIndex?: number;
    stock?: number;
    active?: boolean;
    price?: number;
    sku?: string;
    variants?: ProductVariant[];
    archived?: boolean;
    isFeatured?: boolean;
  };
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const now = Date.now();
  const photos = Array.isArray(body.photos) ? body.photos.filter(Boolean) : [];
  let mainIdx = typeof body.mainPhotoIndex === "number" ? body.mainPhotoIndex! : 0;
  if (photos.length === 0) mainIdx = 0;
  if (photos.length && (mainIdx < 0 || mainIdx >= photos.length)) mainIdx = 0;
  const stock = Number.isFinite(body.stock) ? Math.max(0, Math.floor(body.stock as number)) : 0;
  const price = Number.isFinite(body.price) ? Math.max(0, Number(body.price)) : undefined;
  const sku = (body.sku || "").trim() || undefined;
  const variants = Array.isArray(body.variants)
    ? body.variants
        .filter((v) => v && typeof v.name === "string" && v.name.trim())
        .map((v) => ({
          id: v.id || `var_${Math.random().toString(36).slice(2, 8)}`,
          name: v.name.trim(),
          priceDelta: Number.isFinite(v.priceDelta) ? Number(v.priceDelta) : undefined,
          stock: Number.isFinite(v.stock) ? Math.max(0, Math.floor(Number(v.stock))) : undefined,
          active: v.active !== false,
        }))
    : [];
  const prod: Product = {
    id: `prod_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: body.description?.trim() || undefined,
    photos,
    mainPhotoIndex: mainIdx,
    stock,
    active: body.active !== false,
    archived: body.archived === true ? true : undefined,
    price,
    sku,
    variants: variants.length ? variants : undefined,
    isFeatured: body.isFeatured === true ? true : undefined,
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  if (db) {
    await db.collection<Product>("products").updateOne({ id: prod.id }, { $set: prod }, { upsert: true });
    return NextResponse.json(prod, { status: 201 });
  }
  memProducts.unshift(prod);
  return NextResponse.json(prod, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const body = (await req.json()) as Partial<Product> & { id?: string };
  const id = (body.id || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const update: Partial<Product> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.description === "string") update.description = body.description.trim();
  if (Array.isArray(body.photos)) update.photos = body.photos.filter(Boolean);
  if (typeof body.mainPhotoIndex === "number") update.mainPhotoIndex = body.mainPhotoIndex;
  if (typeof body.stock === "number") update.stock = Math.max(0, Math.floor(body.stock));
  if (typeof body.active === "boolean") update.active = body.active;
  if (typeof body.archived === "boolean") update.archived = body.archived;
  if (typeof body.isFeatured === "boolean") update.isFeatured = body.isFeatured;
  if (typeof body.price === "number") update.price = Math.max(0, body.price);
  if (typeof body.sku === "string") update.sku = body.sku.trim();
  if (Array.isArray(body.variants)) {
    update.variants = body.variants
      .filter((v) => v && typeof v.name === "string" && v.name.trim())
      .map((v) => ({
        id: v.id || `var_${Math.random().toString(36).slice(2, 8)}`,
        name: v.name.trim(),
        priceDelta: Number.isFinite(v.priceDelta) ? Number(v.priceDelta) : undefined,
        stock: Number.isFinite(v.stock) ? Math.max(0, Math.floor(Number(v.stock))) : undefined,
        active: v.active !== false,
      }));
  }
  update.updatedAt = Date.now();

  const db = await getDb();
  if (db) {
    await db.collection<Product>("products").updateOne({ id }, { $set: update });
    const doc = await db.collection<Product>("products").findOne({ id });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  }
  const idx = memProducts.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const merged = { ...memProducts[idx], ...update } as Product;
  if ((merged.photos?.length || 0) === 0) merged.mainPhotoIndex = 0;
  else if (
    typeof merged.mainPhotoIndex === "number" &&
    (merged.mainPhotoIndex < 0 || merged.mainPhotoIndex >= merged.photos.length)
  )
    merged.mainPhotoIndex = 0;
  memProducts[idx] = merged;
  return NextResponse.json(merged);
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (db) {
    await db.collection<Product>("products").deleteOne({ id });
    return NextResponse.json({ ok: true });
  }
  const idx = memProducts.findIndex((p) => p.id === id);
  if (idx !== -1) memProducts.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
