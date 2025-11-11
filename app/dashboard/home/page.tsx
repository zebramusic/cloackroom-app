import HomeContentClient from "./HomeContentClient";
import { Suspense } from "react";

export default function DashboardHomeContentPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold">Home Page Content</h1>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <a
          href="/dashboard/home"
          className="rounded-full border border-border px-3 py-1 bg-accent text-accent-foreground"
        >
          Home CMS
        </a>
        <a
          href="/dashboard"
          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          Products CMS
        </a>
        <a
          href="/dashboard/products"
          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          Products Admin
        </a>
        <a
          href="/private"
          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          Operational
        </a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit landing page copy & hero image.
      </p>
      <Suspense fallback={null}>
        <HomeContentClient />
      </Suspense>
    </main>
  );
}
