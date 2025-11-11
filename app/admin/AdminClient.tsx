"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HandoverReport } from "@/app/models/handover";
import type { Product } from "@/app/models/product";
import { isEventActive } from "@/app/models/event";
import { useEvents } from "@/app/hooks/useEvents";

export default function AdminClient() {
  const [handovers, setHandovers] = useState<HandoverReport[] | null>(null);
  const [staffUsers, setStaffUsers] = useState<number | null>(null);
  const [adminUsers, setAdminUsers] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const {
    data: events,
    error: eventsError,
    isLoading: eventsLoading,
  } = useEvents();
  const activeEventsCount = useMemo(
    () => events.filter((event) => isEventActive(event)).length,
    [events]
  );

  useEffect(() => {
    void (async () => {
      try {
        const hs = await fetch("/api/handover?q=", { cache: "no-store" }).then(
          (r) => r.json()
        );
        setHandovers((hs.items || []) as HandoverReport[]);
      } catch {}
      try {
        const st = await fetch("/api/staff?q=", { cache: "no-store" }).then(
          (r) => r.json()
        );
        setStaffUsers(Array.isArray(st.items) ? st.items.length : 0);
      } catch {}
      try {
        const ad = await fetch("/api/admin/admins", { cache: "no-store" }).then(
          (r) => r.json()
        );
        setAdminUsers(Array.isArray(ad.items) ? ad.items.length : 0);
      } catch {}
      try {
        const pr = await fetch("/api/products?all=1", {
          cache: "no-store",
        }).then((r) => r.json());
        setProducts(Array.isArray(pr.items) ? (pr.items as Product[]) : []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (eventsError) console.error(eventsError);
  }, [eventsError]);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Environment and data overview. Review recent items and access management
        tools.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Handovers</div>
          <div className="mt-1 text-xl font-semibold">
            {handovers ? handovers.length : "—"}
          </div>
          <div className="mt-2">
            <Link
              href="/private/handover"
              className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted inline-block"
            >
              Open Handover
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Users</div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Admins
              </div>
              <div className="text-lg font-semibold leading-none">
                {adminUsers ?? "—"}
              </div>
              <Link
                href="/private/admin/admins"
                className="mt-1 inline-block text-xs rounded-full border border-border px-2 py-1 hover:bg-muted"
              >
                Manage
              </Link>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Staff
              </div>
              <div className="text-lg font-semibold leading-none">
                {staffUsers ?? "—"}
              </div>
              <Link
                href="/private/admin/staff"
                className="mt-1 inline-block text-xs rounded-full border border-border px-2 py-1 hover:bg-muted"
              >
                Manage
              </Link>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Events</div>
          <div className="mt-1 text-xl font-semibold flex items-baseline gap-2">
            {eventsLoading && events.length === 0
              ? "…"
              : eventsError
              ? "—"
              : events.length}
            {events.length > 0 && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                {activeEventsCount} active
              </span>
            )}
          </div>
          <div className="mt-2">
            <Link
              href="/private/admin/events"
              className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted inline-block"
            >
              Manage Events
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Products</div>
          <div className="mt-1 text-xl font-semibold flex items-baseline gap-2">
            {products ? products.length : "—"}
            {products && (
              <span className="text-xs font-medium text-muted-foreground">
                {products.filter((p) => p.active !== false).length} active
              </span>
            )}
          </div>
          <div className="mt-2">
            <Link
              href="/dashboard/admin/products"
              className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted inline-block"
            >
              Manage Products
            </Link>
          </div>
        </div>
      </div>

      {/* Lost & Found section removed */}
    </main>
  );
}
