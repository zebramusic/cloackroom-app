import type { ReactNode } from "react";
import PrivateNav from "@/app/private/PrivateNav";

export default function PrivateRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PrivateNav />
      <div className="pb-6">{children}</div>
    </>
  );
}
