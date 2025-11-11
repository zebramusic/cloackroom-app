export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { getHomeContent, updateHomeContent, type TrustedByItem } from "@/lib/homeContent";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

// POST: create new item with image
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const nameEn = (form.get("nameEn") || "") + "";
  const nameRo = (form.get("nameRo") || "") + "";
  const blurbEn = (form.get("blurbEn") || "") + "";
  const blurbRo = (form.get("blurbRo") || "") + "";
  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!nameEn.trim())
    return NextResponse.json({ error: "nameEn is required" }, { status: 400 });
  if (file.size > 1.5 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 1.5MB)" }, { status: 400 });
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extname(file.name).toLowerCase() || ".png";
  const id = randomUUID();
  const filename = `trusted-${id}${ext}`;
  const filepath = `${process.cwd()}/public/uploads/${filename}`;
  await writeFile(filepath, buffer);
  const imageUrl = `/uploads/${filename}`;

  const content = await getHomeContent();
  const list = content.trustedBy ? [...content.trustedBy] : [];
  const item: TrustedByItem = {
    id,
    nameEn,
    nameRo: nameRo || undefined,
    blurbEn: blurbEn || undefined,
    blurbRo: blurbRo || undefined,
    imageUrl,
    updatedAt: Date.now(),
  };
  list.push(item);
  await updateHomeContent({ trustedBy: list });
  return NextResponse.json(item, { status: 201 });
}

// PATCH: update existing item (no file)
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const body = await req.json();
  const { id, nameEn, nameRo, blurbEn, blurbRo } = body || {};
  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "id required" }, { status: 400 });
  const content = await getHomeContent();
  const list = content.trustedBy ? [...content.trustedBy] : [];
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const existing = list[idx];
  list[idx] = {
    ...existing,
    nameEn: nameEn ?? existing.nameEn,
    nameRo: nameRo ?? existing.nameRo,
    blurbEn: blurbEn ?? existing.blurbEn,
    blurbRo: blurbRo ?? existing.blurbRo,
    updatedAt: Date.now(),
  };
  await updateHomeContent({ trustedBy: list });
  return NextResponse.json(list[idx]);
}

// DELETE: remove item by id
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });
  const content = await getHomeContent();
  const list = content.trustedBy ? [...content.trustedBy] : [];
  const next = list.filter((i) => i.id !== id);
  if (next.length === list.length)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  await updateHomeContent({ trustedBy: next });
  return NextResponse.json({ ok: true });
}

// POST /api/content/home/trusted-upload?replace=<id> to replace image of existing item
export async function PUT(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  const id = form.get("id");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!id || typeof id !== "string")
    return NextResponse.json({ error: "id required" }, { status: 400 });
  if (file.size > 1.5 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 1.5MB)" }, { status: 400 });
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extname(file.name).toLowerCase() || ".png";
  const filename = `trusted-${id}${ext}`;
  const filepath = `${process.cwd()}/public/uploads/${filename}`;
  await writeFile(filepath, buffer);
  const imageUrl = `/uploads/${filename}`;
  const content = await getHomeContent();
  const list = content.trustedBy ? [...content.trustedBy] : [];
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  list[idx] = { ...list[idx], imageUrl, updatedAt: Date.now() };
  await updateHomeContent({ trustedBy: list });
  return NextResponse.json(list[idx]);
}
