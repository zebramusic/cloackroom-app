export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { PasswordResetToken, StaffUser } from "@/app/models/staff";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { token?: string; password?: string };
  if (!body.token || !body.password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const rec = await db
    .collection<PasswordResetToken>("password_reset_tokens")
    .findOne({ token: body.token });
  if (!rec || rec.used || rec.expiresAt < Date.now())
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  const user = await db.collection<StaffUser>("staff").findOne({ id: rec.staffId });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await db
    .collection<StaffUser>("staff")
    .updateOne({ id: user.id }, { $set: { passwordHash: await hashPassword(body.password) } });
  await db
    .collection<PasswordResetToken>("password_reset_tokens")
    .updateOne({ token: rec.token }, { $set: { used: true } });
  return NextResponse.json({ ok: true });
}
