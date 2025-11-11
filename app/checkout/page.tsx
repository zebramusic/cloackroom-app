import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout — Cloackroom",
  description: "Placeholder checkout page (stub).",
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This is a placeholder checkout experience. Integrate payment and order
        details here.
      </p>
      <Link
        href="/products"
        className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        Back to products
      </Link>
    </main>
  );
}
