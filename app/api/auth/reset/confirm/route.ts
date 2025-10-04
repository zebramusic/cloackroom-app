import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import type { PasswordReset, StaffUser } from "@/app/models/staff";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { token?: string; password?: string };
  if (!body.token || !body.password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const reset = await db.collection<PasswordReset>("password_resets").findOne({ token: body.token });
  if (!reset || reset.used || reset.expiresAt < Date.now()) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const passwordHash = await hashPassword(body.password);
  await db.collection<StaffUser>("staff").updateOne({ id: reset.staffId }, { $set: { passwordHash } });
  await db.collection<PasswordReset>("password_resets").updateOne({ token: body.token }, { $set: { used: true } });
  return NextResponse.json({ ok: true });
}
