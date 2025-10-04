export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import type { LostClaim } from "@/app/models/lost";
import { getDb } from "@/lib/mongodb";

const lostStore: Map<string, LostClaim> = new Map();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const db = await getDb();
  if (db) {
    const col = db.collection<LostClaim>("lost");
    const where = q
      ? {
          $or: [
            { fullName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const items = await col.find(where).sort({ createdAt: -1 }).limit(200).toArray();
    return NextResponse.json({ items });
  }
  const items = Array.from(lostStore.values())
    .filter((c) =>
      !q ||
      c.fullName.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<LostClaim>;
  if (!body?.id || !body.fullName || !body.addressLine1) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const claim: LostClaim = {
    id: body.id,
    fullName: body.fullName,
    addressLine1: body.addressLine1,
    addressLine2: body.addressLine2,
    city: body.city,
    postalCode: body.postalCode,
    country: body.country,
    phone: body.phone,
    email: body.email,
    photos: body.photos || [],
    createdAt: Date.now(),
    resolved: false,
  };
  const db = await getDb();
  if (db) {
    const col = db.collection<LostClaim>("lost");
    await col.updateOne({ id: claim.id }, { $set: claim }, { upsert: true });
    return NextResponse.json(claim, { status: 201 });
  }
  lostStore.set(claim.id, claim);
  return NextResponse.json(claim, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id?: string; resolved?: boolean };
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (db) {
    const col = db.collection<LostClaim>("lost");
    const update: Partial<LostClaim> = {};
    if (typeof body.resolved === "boolean") {
      update.resolved = body.resolved;
      update.resolvedAt = body.resolved ? Date.now() : undefined;
    }
    await col.updateOne({ id: body.id }, { $set: update });
    const updated = await col.findOne({ id: body.id });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  }
  const c = lostStore.get(body.id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof body.resolved === "boolean") {
    c.resolved = body.resolved;
    c.resolvedAt = body.resolved ? Date.now() : undefined;
    lostStore.set(c.id, c);
  }
  return NextResponse.json(c);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (db) {
    const col = db.collection<LostClaim>("lost");
    await col.deleteOne({ id });
    return NextResponse.json({ ok: true });
  }
  lostStore.delete(id);
  return NextResponse.json({ ok: true });
}
