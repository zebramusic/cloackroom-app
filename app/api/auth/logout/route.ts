export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { SESS_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    if (db) await db.collection("sessions").deleteOne({ token });
  }
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(SESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, secure, sameSite: "lax" });
  res.cookies.set("cloack_role", "", { httpOnly: false, path: "/", maxAge: 0, secure, sameSite: "lax" });
  return res;
}
