export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import type { StaffUser } from "@/app/models/staff";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { fullName?: string; email?: string; password?: string; isAuthorized?: boolean };
  if (!body.fullName || !body.email || !body.password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const existing = await db.collection<StaffUser>("staff").findOne({ email: body.email.toLowerCase() });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const user: StaffUser = {
    id: `staff_${Date.now()}`,
    fullName: body.fullName,
    email: body.email.toLowerCase(),
    passwordHash: await hashPassword(body.password),
  // Authorization flag kept for future re‑enable; defaulting to true while authz disabled.
  isAuthorized: true,
    createdAt: Date.now(),
  };
  await db.collection<StaffUser>("staff").updateOne({ id: user.id }, { $set: user }, { upsert: true });
  return NextResponse.json({ id: user.id, fullName: user.fullName, email: user.email }, { status: 201 });
}
