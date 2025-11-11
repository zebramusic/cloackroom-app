// Nested admin layout under /dashboard. The parent /dashboard/layout.tsx already
// renders the global <SiteNav />, so we intentionally do NOT render another nav
// here to avoid a double navbar on routes like /dashboard/admin/products.
export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
