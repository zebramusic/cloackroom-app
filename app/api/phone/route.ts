export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

// In-memory store (ephemeral). For production, replace with Redis or Mongo collection with TTL index.
interface CodeEntry { code: string; phone: string; expires: number; attempts: number }
const codes = new Map<string, CodeEntry>();
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes validity

function normalizePhone(raw: string) {
  return raw.replace(/[^+0-9]/g, "").replace(/^00/, "+");
}

export async function POST(req: NextRequest) {
  // Request a code: { phone }
  const body = (await req.json().catch(() => null)) as { phone?: string } | null;
  if (!body?.phone) return NextResponse.json({ error: "Missing phone" }, { status: 400 });
  const phone = normalizePhone(body.phone);
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  codes.set(phone, { code, phone, expires: Date.now() + WINDOW_MS, attempts: 0 });
  // For now we don't integrate an SMS provider. Return code in response (ONLY FOR INTERNAL / DEV). In production, remove code from body and integrate provider.
  return NextResponse.json({ ok: true, phone, code, expiresIn: WINDOW_MS / 1000 });
}

export async function PATCH(req: NextRequest) {
  // Confirm a code: { phone, code }
  const body = (await req.json().catch(() => null)) as { phone?: string; code?: string } | null;
  if (!body?.phone || !body?.code)
    return NextResponse.json({ error: "Missing phone or code" }, { status: 400 });
  const phone = normalizePhone(body.phone);
  const entry = codes.get(phone);
  if (!entry) return NextResponse.json({ error: "No code requested" }, { status: 404 });
  if (entry.expires < Date.now()) {
    codes.delete(phone);
    return NextResponse.json({ error: "Code expired" }, { status: 410 });
  }
  if (entry.attempts >= 5) {
    codes.delete(phone);
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  entry.attempts++;
  if (entry.code !== body.code.trim()) {
    return NextResponse.json({ error: "Incorrect code", attempts: entry.attempts }, { status: 401 });
  }
  codes.delete(phone); // one-time use
  return NextResponse.json({ ok: true, phone, verified: true });
}
