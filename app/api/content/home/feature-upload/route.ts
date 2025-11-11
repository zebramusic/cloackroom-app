export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { extname } from "node:path";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const cardIdRaw = form.get("id");
  const cardId =
    typeof cardIdRaw === "string" && cardIdRaw.trim()
      ? cardIdRaw.trim()
      : null;

  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extname(file.name).toLowerCase() || ".png";
  const unique = randomUUID();
  const filename = cardId
    ? `feature-${cardId}-${unique}${ext}`
    : `feature-${unique}${ext}`;
  const filepath = `${process.cwd()}/public/uploads/${filename}`;
  await writeFile(filepath, buffer);

  const publicUrl = `/uploads/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
