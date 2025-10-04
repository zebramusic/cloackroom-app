export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import type { HandoverReport } from "@/app/models/handover";
import { getDb } from "@/lib/mongodb";

const store: Map<string, HandoverReport> = new Map();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    const where = q
      ? {
          $or: [
            { coatNumber: { $regex: q, $options: "i" } },
            { fullName: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const items = await col
      .find(where)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ items });
  }
  const items = Array.from(store.values())
    .filter(
      (r) =>
        !q ||
        r.coatNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q)
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<HandoverReport>;
  if (!body?.id || !body.coatNumber || !body.fullName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const report: HandoverReport = {
    id: body.id,
    coatNumber: String(body.coatNumber),
    fullName: String(body.fullName),
    phone: body.phone ? String(body.phone) : undefined,
    email: body.email ? String(body.email) : undefined,
    staff: body.staff ? String(body.staff) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    photos: Array.isArray(body.photos)
      ? body.photos.filter((p): p is string => typeof p === "string")
      : undefined,
    createdAt: Date.now(),
  };
  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.updateOne({ id: report.id }, { $set: report }, { upsert: true });
    return NextResponse.json(report, { status: 201 });
  }
  store.set(report.id, report);
  return NextResponse.json(report, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.deleteOne({ id });
    return NextResponse.json({ ok: true });
  }
  store.delete(id);
  return NextResponse.json({ ok: true });
}
