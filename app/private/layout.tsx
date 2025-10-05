import type { ReactNode } from "react";
import PrivateNav from "@/app/private/PrivateNav";
import { ToastProvider } from "@/app/private/toast/ToastContext";
import ToastViewport from "@/app/private/toast/ToastViewport";

export default function PrivateRootLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <PrivateNav />
      <div className="pb-6">{children}</div>
      <ToastViewport />
    </ToastProvider>
  );
}
