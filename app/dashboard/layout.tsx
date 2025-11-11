import SiteNav from "@/app/components/SiteNav";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESS_COOKIE)?.value;
  const session = await getSessionUser(token);
  if (!session || session.type !== "admin") {
    redirect("/admin/login?next=/dashboard");
  }
  return (
    <div>
      <SiteNav />
      {children}
    </div>
  );
}
