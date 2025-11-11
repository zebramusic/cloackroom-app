export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { updateHomeContent } from "@/lib/homeContent";
import { writeFile } from "node:fs/promises";
import { extname } from "node:path";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const data = await req.formData();
  const file = data.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extname(file.name).toLowerCase() || ".png";
  const filename = `home-hero${ext}`;
  const filepath = `${process.cwd()}/public/uploads/${filename}`;
  await writeFile(filepath, buffer);

  const publicUrl = `/uploads/${filename}`;
  await updateHomeContent({ heroImageUrl: publicUrl });
  return NextResponse.json({ url: publicUrl });
}
