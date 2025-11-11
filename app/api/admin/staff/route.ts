export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, getSessionUser, SESS_COOKIE } from "@/lib/auth";
import type { StaffUser } from "@/app/models/staff";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getDb();
  if (!db) return NextResponse.json({ items: [] });
  const items = await db
    .collection<StaffUser>("staff")
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as Partial<StaffUser> & { password?: string };
  if (!body.fullName || !body.email || !body.password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const user: StaffUser = {
    id: `staff_${Date.now()}`,
    fullName: body.fullName,
    email: String(body.email).toLowerCase(),
    passwordHash: await hashPassword(body.password),
    isAuthorized: true,
    authorizedEventId: undefined,
    createdAt: Date.now(),
  };
  await db.collection<StaffUser>("staff").updateOne({ id: user.id }, { $set: user }, { upsert: true });
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return NextResponse.json(safe, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as Partial<StaffUser> & { id?: string; password?: string; isAuthorized?: boolean; authorizedEventId?: string | null };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const update: Partial<StaffUser> = {};
  if (body.fullName) update.fullName = body.fullName;
  if (body.email) update.email = body.email.toLowerCase();
  if (body.password) update.passwordHash = await hashPassword(body.password);
  if (typeof body.isAuthorized === "boolean") update.isAuthorized = body.isAuthorized;
  if (typeof body.authorizedEventId === "string") update.authorizedEventId = body.authorizedEventId || undefined;
  await db.collection<StaffUser>("staff").updateOne({ id: body.id }, { $set: update });
  const updated = await db.collection<StaffUser>("staff").findOne({ id: body.id });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash, ...safeUpdated } = updated;
  void passwordHash;
  return NextResponse.json(safeUpdated);
}

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
  await db.collection<StaffUser>("staff").deleteOne({ id });
  return NextResponse.json({ ok: true });
}
