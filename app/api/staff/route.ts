export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { StaffUser } from "@/app/models/staff";
import { hashPassword } from "@/lib/auth";

const mem = new Map<string, StaffUser>();

function sanitize(u: StaffUser) {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const db = await getDb();
  if (db) {
    const where = q
      ? {
          $or: [
            { fullName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const items = await db
      .collection<StaffUser>("staff")
      .find(where)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ items: items.map(sanitize) });
  }
  const items = Array.from(mem.values())
    .filter(
      (u) =>
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(sanitize);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    fullName?: string;
    email?: string;
    password?: string;
    isAuthorized?: boolean;
  };
  if (!body.fullName || !body.email || !body.password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const email = body.email.toLowerCase();
  const user: StaffUser = {
    id: `staff_${Date.now()}`,
    fullName: body.fullName,
    email,
    passwordHash: await hashPassword(body.password),
    isAuthorized: !!body.isAuthorized,
    createdAt: Date.now(),
  };
  const db = await getDb();
  if (db) {
    const existing = await db.collection<StaffUser>("staff").findOne({ email });
    if (existing)
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    await db.collection<StaffUser>("staff").updateOne({ id: user.id }, { $set: user }, { upsert: true });
    return NextResponse.json(sanitize(user), { status: 201 });
  }
  if (Array.from(mem.values()).some((u) => u.email === email))
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  mem.set(user.id, user);
  return NextResponse.json(sanitize(user), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    fullName?: string;
    email?: string;
    password?: string;
    isAuthorized?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (db) {
    const update: Partial<StaffUser> = {};
    if (typeof body.fullName === "string") update.fullName = body.fullName;
    if (typeof body.email === "string") update.email = body.email.toLowerCase();
    if (typeof body.isAuthorized === "boolean") update.isAuthorized = body.isAuthorized;
    if (typeof body.password === "string" && body.password)
      update.passwordHash = await hashPassword(body.password);
    if (update.email) {
      const dup = await db.collection<StaffUser>("staff").findOne({ email: update.email, id: { $ne: body.id } });
      if (dup) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    await db.collection<StaffUser>("staff").updateOne({ id: body.id }, { $set: update });
    const updated = await db.collection<StaffUser>("staff").findOne({ id: body.id });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(sanitize(updated));
  }
  const u = mem.get(body.id);
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof body.fullName === "string") u.fullName = body.fullName;
  if (typeof body.email === "string") u.email = body.email.toLowerCase();
  if (typeof body.isAuthorized === "boolean") u.isAuthorized = body.isAuthorized;
  if (typeof body.password === "string" && body.password)
    u.passwordHash = await hashPassword(body.password);
  mem.set(u.id, u);
  return NextResponse.json(sanitize(u));
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (db) {
    await db.collection<StaffUser>("staff").deleteOne({ id });
    return NextResponse.json({ ok: true });
  }
  mem.delete(id);
  return NextResponse.json({ ok: true });
}
