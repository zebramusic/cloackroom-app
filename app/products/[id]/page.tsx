import Link from "next/link";
import type { Metadata } from "next";
import type { Product } from "@/app/models/product";
import { getPublicProductById } from "@/lib/productsPublic";
import ProductGallery from "@/app/products/ProductGallery";

export const metadata: Metadata = { title: "Product details" };

async function loadProduct(id: string): Promise<Product | null> {
  return getPublicProductById(id);
}

export default async function ProductDetail(props: {
  params: Promise<{ id: string }>;
}) {
  // Await params per Next.js async dynamic route API requirement.
  const { id: rawId } = await props.params;
  const id = decodeURIComponent(rawId);
  const product = await loadProduct(id);
  if (!product)
    return (
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-lg font-semibold">Product not found</div>
          <p className="mt-2 text-sm text-muted-foreground">
            The product you’re looking for doesn’t exist or is unavailable.
          </p>
          <div className="mt-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              ← Back to products
            </Link>
          </div>
        </div>
      </main>
    );

  const priceLabel =
    typeof product.price === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(product.price)
      : null;

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden>←</span> Back to products
        </Link>
      </div>

      <article className="rounded-3xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="grid lg:grid-cols-2">
          {/* Interactive gallery */}
          <div className="relative">
            <ProductGallery
              photos={product.photos}
              initialIndex={product.mainPhotoIndex || 0}
              name={product.name}
            />
            {/* Price pill */}
            {priceLabel ? (
              <div className="absolute left-4 top-4 rounded-full bg-accent text-accent-foreground px-3 py-1.5 text-sm shadow">
                {priceLabel}
              </div>
            ) : null}
            {/* Stock */}
            <div
              className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wide shadow ${
                product.stock > 0
                  ? "bg-emerald-600/15 text-emerald-700"
                  : "bg-red-600/15 text-red-700"
              }`}
            >
              {product.stock > 0
                ? `In stock: ${product.stock}`
                : "Out of stock"}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {product.name}
              </h1>
              {product.sku ? (
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  SKU: {product.sku}
                </span>
              ) : null}
            </div>
            {product.description ? (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            ) : null}

            {/* Variants */}
            {product.variants &&
            product.variants.filter((v) => v.active !== false).length > 0 ? (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Available variants
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants
                    .filter((v) => v.active !== false)
                    .map((v) => (
                      <span
                        key={v.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs"
                        title={
                          typeof v.stock === "number"
                            ? `Stock: ${v.stock}`
                            : undefined
                        }
                      >
                        <span className="font-medium">{v.name}</span>
                        {typeof v.priceDelta === "number" ? (
                          <span className="text-muted-foreground">
                            {v.priceDelta >= 0 ? "+" : ""}
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 2,
                            }).format(v.priceDelta)}
                          </span>
                        ) : null}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </main>
  );
}
