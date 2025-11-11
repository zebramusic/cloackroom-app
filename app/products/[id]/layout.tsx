// The parent products layout already renders the SiteNav.
// Avoid double navbar by returning children directly.
export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
