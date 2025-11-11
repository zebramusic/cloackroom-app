import Link from "next/link";

export const metadata = { title: "Cloackroom — Private Home" };

export default async function PrivateHome() {
  // Lightweight client role check replaced with a server call isn't trivial without a server component fetch.
  // We'll render admin card unconditionally but hide via a small client script if not admin.
  const cards = [
    {
      href: "/private/handover",
      title: "New Handover",
      desc: "Capture a new lost-ticket handover report with photos.",
      key: "handover",
    },
    {
      href: "/private/handovers",
      title: "Reports",
      desc: "Browse, search and print existing handover reports.",
      key: "reports",
    },
    {
      href: "/private/admin",
      title: "Admin Dashboard",
      desc: "System status and management (admins only).",
      key: "admin",
      adminOnly: true,
    },
  ];
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Private Area</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-prose">
        Central hub for operations. Choose an action below.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            data-admin-only={c.adminOnly ? "true" : undefined}
            className="group rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight group-hover:underline">
                {c.title}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50">
                Go
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {c.desc}
            </p>
          </Link>
        ))}
      </div>
      <script
        // Hide admin-only cards for non-admin users client-side after role fetch
        dangerouslySetInnerHTML={{
          __html: `(() => {fetch('/api/auth/me',{cache:'no-store',credentials:'include'}).then(r=>r.json()).then(j=>{if(!j?.user||j.user.type!=='admin'){document.querySelectorAll('[data-admin-only="true"]').forEach(el=>el.remove());}}).catch(()=>{});})();`,
        }}
      />
    </main>
  );
}
