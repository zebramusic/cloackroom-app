export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, getSessionUser, SESS_COOKIE } from "@/lib/auth";
import type { AdminUser } from "@/app/models/admin";

// GET list
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getDb();
  if (!db) return NextResponse.json({ items: [] });
  const items = await db
    .collection<AdminUser>("admins")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return NextResponse.json({ items: items.map(({ passwordHash: _pw, ...r }) => r) });
}

// POST create
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as { fullName?: string; email?: string; password?: string };
  if (!body.fullName || !body.email || !body.password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const email = body.email.toLowerCase();
  const existing = await db.collection<AdminUser>("admins").findOne({ email });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const user: AdminUser = {
    id: `admin_${Date.now()}`,
    fullName: body.fullName,
    email,
    passwordHash: await hashPassword(body.password),
    createdAt: Date.now(),
  };
  await db.collection<AdminUser>("admins").updateOne({ id: user.id }, { $set: user }, { upsert: true });
  const { passwordHash: _pw, ...safe } = user;
  return NextResponse.json(safe, { status: 201 });
}

// PATCH update
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as { id?: string; fullName?: string; email?: string; password?: string };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const update: Partial<AdminUser> = {};
  if (body.fullName) update.fullName = body.fullName;
  if (body.email) update.email = body.email.toLowerCase();
  if (body.password) update.passwordHash = await hashPassword(body.password);
  if (update.email) {
    const dup = await db.collection<AdminUser>("admins").findOne({ email: update.email, id: { $ne: body.id } });
    if (dup) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
  await db.collection<AdminUser>("admins").updateOne({ id: body.id }, { $set: update });
  const updated = await db.collection<AdminUser>("admins").findOne({ id: body.id });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _pw2, ...safe } = updated as AdminUser;
  return NextResponse.json(safe);
}

// DELETE remove
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  await db.collection<AdminUser>("admins").deleteOne({ id });
  return NextResponse.json({ ok: true });
}
