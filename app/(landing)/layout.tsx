import SiteNav from "@/app/components/SiteNav";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SiteNav />
      {children}
    </div>
  );
}
