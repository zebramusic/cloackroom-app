export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { SESS_COOKIE, hashPassword, generateToken, verifyPassword, needsRehash } from "@/lib/auth"; // upgraded hashing
import type { StaffUser, Session } from "@/app/models/staff";
import type { AdminUser } from "@/app/models/admin";

type CombinedUser = StaffUser | AdminUser;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string; remember?: boolean; type?: "staff" | "admin" };
  if (!body.email || !body.password)
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const type: "staff" | "admin" = body.type === "admin" ? "admin" : "staff";
  const emailLookup = body.email.toLowerCase();
  const collection = type === "admin" ? db.collection<AdminUser>("admins") : db.collection<StaffUser>("staff");
  const user = await collection.findOne({ email: emailLookup } as Record<string, unknown>);
  if (!user) {
    // Optional fallback: if user selected wrong type, try the other collection so we can hint.
    const other = type === "admin"
      ? await db.collection<StaffUser>("staff").findOne({ email: emailLookup })
      : await db.collection<AdminUser>("admins").findOne({ email: emailLookup });
    if (other) {
      return NextResponse.json({
        error: `Email exists as a ${type === "admin" ? "staff" : "admin"} account. Switch the Login as option to '${type === "admin" ? "staff" : "admin"}'.`,
        hintWrongType: true,
        expectedType: type === "admin" ? "staff" : "admin",
      }, { status: 401 });
    }
    return NextResponse.json({ error: type === "admin" ? "Admin email not found" : "Staff email not found" }, { status: 401 });
  }
  const passwordHash = (user as CombinedUser).passwordHash;
  // If logging in as staff, ensure the account is authorized
  if (type === "staff" && (user as StaffUser).isAuthorized === false) {
    return NextResponse.json({ error: "Staff account is not authorized" }, { status: 403 });
  }
  const ok = await verifyPassword(body.password, passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  // Opportunistic upgrade of legacy hashes
  if (needsRehash(passwordHash)) {
    const newHash = await hashPassword(body.password);
    const coll = type === "admin" ? db.collection<AdminUser>("admins") : db.collection<StaffUser>("staff");
    await coll.updateOne({ id: user.id }, { $set: { passwordHash: newHash } });
  }
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
  const res = NextResponse.json({ id: (user as CombinedUser).id, fullName: (user as CombinedUser).fullName, email: (user as CombinedUser).email, type });
  const secure = process.env.NODE_ENV === "production";
  const baseCookie = { sameSite: "lax" as const, path: "/", maxAge: ttl, secure };
  res.cookies.set(SESS_COOKIE, token, { ...baseCookie, httpOnly: true });
  // Non-httpOnly role hint cookie so edge middleware can read without DB access
  res.cookies.set("cloack_role", type, { ...baseCookie, httpOnly: false });
  return res;
}
