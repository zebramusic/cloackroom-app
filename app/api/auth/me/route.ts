export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { SESS_COOKIE } from "@/lib/auth";
import type { StaffUser, Session } from "@/app/models/staff";
import type { AdminUser } from "@/app/models/admin";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const db = await getDb();
  if (!db) return NextResponse.json({ user: null });
  const sess = await db.collection<Session>("sessions").findOne({ token });
  if (!sess || sess.expiresAt < Date.now()) return NextResponse.json({ user: null });
  const userType = sess.userType === "admin" ? "admin" : "staff";
  if (userType === "admin") {
    const admin = await db.collection<AdminUser>("admins").findOne({ id: sess.staffId });
    if (!admin) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: admin.id, fullName: admin.fullName, email: admin.email, type: "admin", isAuthorized: true } });
  } else {
    const staff = await db.collection<StaffUser>("staff").findOne({ id: sess.staffId });
    if (!staff) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: staff.id, fullName: staff.fullName, email: staff.email, type: "staff", isAuthorized: staff.isAuthorized !== false } });
  }
}
