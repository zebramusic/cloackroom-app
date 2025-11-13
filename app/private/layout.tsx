import { Suspense } from "react";
import type { ReactNode } from "react";
import SiteNav from "@/app/components/SiteNav";
import PrivateNav from "@/app/private/PrivateNav";

export default function PrivateRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="private-theme min-h-screen bg-background text-foreground">
      <Suspense fallback={null}>
        <SiteNav />
      </Suspense>
      <Suspense fallback={null}>
        <PrivateNav />
      </Suspense>
      <div className="pb-6">{children}</div>
    </div>
  );
}
