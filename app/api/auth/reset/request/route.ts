export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { StaffUser, PasswordResetToken } from "@/app/models/staff";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string };
  if (!body.email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const staff = await db.collection<StaffUser>("staff").findOne({ email: body.email.toLowerCase() });
  if (!staff) {
    // Do not reveal existence
    return NextResponse.json({ ok: true });
  }
  const token = `prt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutes
  const rec: PasswordResetToken = { token, staffId: staff.id, createdAt: Date.now(), expiresAt };
  await db.collection<PasswordResetToken>("password_reset_tokens").updateOne({ token }, { $set: rec }, { upsert: true });
  // In a real system, email the token link. For now return token to UI for copy.
  return NextResponse.json({ ok: true, token });
}
