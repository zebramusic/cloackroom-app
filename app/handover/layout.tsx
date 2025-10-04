import type { ReactNode } from "react";
import TopbarAdmin from "@/app/components/TopbarAdmin";

export default function HandoverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopbarAdmin />
      {children}
    </>
  );
}
