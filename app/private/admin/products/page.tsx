import { redirect } from "next/navigation";

export default function LegacyProductsRedirect() {
  redirect("/dashboard/admin/products");
}
