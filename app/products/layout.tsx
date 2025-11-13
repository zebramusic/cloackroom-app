import { Suspense } from "react";
import SiteNav from "@/app/components/SiteNav";

export const metadata = { title: "Products" };

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={null}>
        <SiteNav />
      </Suspense>
      {children}
    </div>
  );
}
