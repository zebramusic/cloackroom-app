import type { ReactNode } from "react";
import TopbarAdmin from "@/app/components/TopbarAdmin";
import MobileNav from "@/app/components/MobileNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopbarAdmin />
      <div className="pb-20">{children}</div>
      <MobileNav />
    </>
  );
}
