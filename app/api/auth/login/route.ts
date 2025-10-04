export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { HOUR, SESS_COOKIE, hashPassword, generateToken } from "@/lib/auth";
import type { StaffUser, Session } from "@/app/models/staff";
import type { AdminUser } from "@/app/models/admin";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string; remember?: boolean; type?: "staff" | "admin" };
  if (!body.email || !body.password)
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const type: "staff" | "admin" = body.type === "admin" ? "admin" : "staff";
  const emailLookup = body.email.toLowerCase();
  const collection = type === "admin" ? db.collection<AdminUser>("admins") : db.collection<StaffUser>("staff");
  let user = await collection.findOne({ email: emailLookup } as any);
  if (!user) {
    // Optional fallback: if user selected wrong type, try the other collection so we can hint.
    const other = type === "admin" ? await db.collection<StaffUser>("staff").findOne({ email: emailLookup }) : await db.collection<AdminUser>("admins").findOne({ email: emailLookup });
    if (other) {
      return NextResponse.json({
        error: `Email exists as a ${type === "admin" ? "staff" : "admin"} account. Switch the Login as option to '${type === "admin" ? "staff" : "admin"}'.`,
        hintWrongType: true,
        expectedType: type === "admin" ? "staff" : "admin",
      }, { status: 401 });
    }
    return NextResponse.json({ error: type === "admin" ? "Admin email not found" : "Staff email not found" }, { status: 401 });
  }
  const hash = await hashPassword(body.password);
  if (hash !== (user as any).passwordHash) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const token = generateToken(user.id);
  const ttl = body.remember ? 14 * 24 * 60 * 60 : 8 * 60 * 60; // seconds
  const sess: Session = {
    token,
    staffId: user.id,
    userType: type,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl * 1000,
  };
  await db.collection<Session>("sessions").updateOne({ token }, { $set: sess }, { upsert: true });
  const res = NextResponse.json({ id: user.id, fullName: (user as any).fullName, email: user.email, type });
  res.cookies.set(SESS_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: ttl });
  // Non-httpOnly role hint cookie so edge middleware can read without DB access (defense-in-depth still handled server-side)
  res.cookies.set("cloack_role", type, { httpOnly: false, sameSite: "lax", path: "/", maxAge: ttl });
  return res;
}
