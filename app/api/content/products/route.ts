export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { getProductsContent, updateProductsContent } from "@/lib/productsContent";
import type { ProductsPageContent } from "@/lib/productsContent";

export async function GET() {
  const content = await getProductsContent();
  return NextResponse.json(content);
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const patch = (await req.json()) as Partial<ProductsPageContent>;
  const merged = await updateProductsContent(patch);
  return NextResponse.json(merged);
}
