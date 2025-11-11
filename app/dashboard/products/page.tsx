import type { Metadata } from "next";
import AdminProductsPage from "@/app/admin/products/page";

export const metadata: Metadata = { title: "Dashboard · Products" };

export default function DashboardProducts() {
  // Reuse the existing Admin Products UI under the dashboard path
  return <AdminProductsPage />;
}
