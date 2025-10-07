export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import type { HandoverReport } from "@/app/models/handover";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";

const store: Map<string, HandoverReport> = new Map();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const coat = (searchParams.get("coat") || "").trim();
  const name = (searchParams.get("name") || "").trim();
  const phone = (searchParams.get("phone") || "").trim();
  const eventId = (searchParams.get("eventId") || "").trim();

  // Build dynamic filter conditions; empty means no filter for that field
  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    const and: any[] = [];
    if (eventId) and.push({ eventId });
    if (coat) and.push({ coatNumber: { $regex: coat, $options: "i" } });
    if (name) and.push({ fullName: { $regex: name, $options: "i" } });
    if (phone) and.push({ phone: { $regex: phone, $options: "i" } });
    if (q) {
      and.push({
        $or: [
          { coatNumber: { $regex: q, $options: "i" } },
          { fullName: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { eventName: { $regex: q, $options: "i" } },
        ],
      });
    }
    const where = and.length ? { $and: and } : {};
    const items = await col
      .find(where)
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();
    return NextResponse.json({ items });
  }
  // In-memory fallback
  const qLower = q.toLowerCase();
  const coatL = coat.toLowerCase();
  const nameL = name.toLowerCase();
  const phoneL = phone.toLowerCase();
  const items = Array.from(store.values())
    .filter((r) => {
      if (eventId && r.eventId !== eventId) return false;
      if (coatL && !r.coatNumber.toLowerCase().includes(coatL)) return false;
      if (nameL && !r.fullName.toLowerCase().includes(nameL)) return false;
      if (phoneL && !(r.phone || "").toLowerCase().includes(phoneL)) return false;
      if (
        qLower &&
        !(
          r.coatNumber.toLowerCase().includes(qLower) ||
          r.fullName.toLowerCase().includes(qLower) ||
          (r.phone || "").toLowerCase().includes(qLower) ||
          (r.eventName || "").toLowerCase().includes(qLower)
        )
      )
        return false;
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 300);
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
    phoneVerified:
      body.phone && typeof body.phoneVerified === "boolean"
        ? body.phoneVerified
        : undefined,
    phoneVerifiedAt:
      body.phoneVerifiedAt && typeof body.phoneVerifiedAt === "number"
        ? body.phoneVerifiedAt
        : undefined,
    phoneVerifiedBy:
      body.phoneVerifiedBy && typeof body.phoneVerifiedBy === "string"
        ? body.phoneVerifiedBy
        : undefined,
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

  // Authorization: allow both admin and staff (require authenticated session)
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (me.type !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.deleteOne({ id });
    return NextResponse.json({ ok: true });
  }
  store.delete(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<HandoverReport> & { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  // Only signedDoc updates supported for now (avoid overwriting other fields accidentally)
  if (!body.signedDoc) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Allow both staff & admin to attach signed document (capture step after print)
  if (me.type !== "admin" && me.type !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.updateOne(
      { id: body.id },
      { $set: { signedDoc: body.signedDoc, signedAt: Date.now() } }
    );
    const doc = await col.findOne({ id: body.id });
    return NextResponse.json(doc);
  }
  const existing = store.get(body.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = { ...existing, signedDoc: body.signedDoc, signedAt: Date.now() };
  store.set(body.id, updated);
  return NextResponse.json(updated);
}
