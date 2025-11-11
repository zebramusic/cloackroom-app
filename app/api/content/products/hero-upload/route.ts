export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { updateProductsContent } from "@/lib/productsContent";

// Store hero image under public/uploads/products-hero.(ext)
const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const BASENAME = "products-hero";
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 413 });
  }
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const outPath = path.join(PUBLIC_DIR, BASENAME + ext);
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(outPath, Buffer.from(arrayBuffer));
  const publicUrl = `/uploads/${BASENAME + ext}`;
  await updateProductsContent({ heroImageUrl: publicUrl });
  return NextResponse.json({ ok: true, url: publicUrl });
}
