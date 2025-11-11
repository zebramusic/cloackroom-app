export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import type { Product } from "@/app/models/product";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  const isAdmin = !!me && me.type === "admin";

  const db = await getDb();
  if (db) {
    const where: Record<string, unknown> = { id };
    if (!isAdmin) {
      where.active = { $ne: false } as unknown as boolean;
      where.archived = { $ne: true } as unknown as boolean;
    }
    const doc = await db.collection<Product>("products").findOne(where);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  }
  // in-memory fallback
  // Note: we don't have access to mem store here; fetch via list endpoint pattern is acceptable for fallback scenarios.
  return NextResponse.json({ error: "Not available" }, { status: 501 });
}
