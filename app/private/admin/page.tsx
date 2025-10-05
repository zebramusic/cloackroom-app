import type { Metadata } from "next";
import AdminClient from "@/app/private/admin/AdminClient";

export const metadata: Metadata = { title: "Admin | Cloackroom" };

export default function AdminPage() {
  return <AdminClient />;
}
