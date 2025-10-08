export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { AdminUser } from "@/app/models/admin";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const db = await getDb();
  if (!db) return NextResponse.json({ items: [] });
  const admins = await db
    .collection<AdminUser>("admins")
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return NextResponse.json({ items: admins.map(({ passwordHash: _pw, ...r }) => r) });
}