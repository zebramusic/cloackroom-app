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
  const origin = req.headers.get("origin");
  let sameSite: "lax" | "none" = "lax";
  let secure = process.env.NODE_ENV === "production";
  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      const requestHost = req.nextUrl.hostname;
      if (originHost !== requestHost) {
        sameSite = "none";
        secure = true;
      }
    } catch {
      // ignore malformed origin headers and fall back to defaults
    }
  }
  res.cookies.set(SESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, secure, sameSite });
  res.cookies.set("cloack_role", "", { httpOnly: false, path: "/", maxAge: 0, secure, sameSite });
  return res;
}
