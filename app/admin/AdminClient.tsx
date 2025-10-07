"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HandoverReport } from "@/app/models/handover";
import type { LostClaim } from "@/app/models/lost";
import type { Event } from "@/app/models/event";
import { isEventActive } from "@/app/models/event";

type Health = {
  ok: boolean;
  mongo?: { connected: boolean; sampleCount?: number };
};

export default function AdminClient() {
  const [health, setHealth] = useState<Health | null>(null);
  const [handovers, setHandovers] = useState<HandoverReport[] | null>(null);
  const [lost, setLost] = useState<LostClaim[] | null>(null);
  const [staffUsers, setStaffUsers] = useState<number | null>(null);
  const [adminUsers, setAdminUsers] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const h = await fetch("/api/health", { cache: "no-store" }).then((r) =>
          r.json()
        );
        setHealth(h as Health);
      } catch {}
      try {
        const hs = await fetch("/api/handover?q=", { cache: "no-store" }).then(
          (r) => r.json()
        );
        setHandovers((hs.items || []) as HandoverReport[]);
      } catch {}
      try {
        const ls = await fetch("/api/lost?q=", { cache: "no-store" }).then(
          (r) => r.json()
        );
        setLost((ls.items || []) as LostClaim[]);
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
        const ev = await fetch("/api/events", { cache: "no-store" }).then((r) =>
          r.json()
        );
        setEvents(Array.isArray(ev.items) ? (ev.items as Event[]) : []);
      } catch {}
    })();
  }, []);

  const mongoStatus = health?.mongo?.connected ? "Connected" : "Not connected";

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Environment and data overview. Use this to verify database status and
        review recent items.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">MongoDB</div>
          <div className="mt-1 text-xl font-semibold">{mongoStatus}</div>
          {health?.mongo?.connected ? (
            <div className="mt-1 text-sm text-muted-foreground">
              Sample query ok
              {typeof health.mongo.sampleCount === "number"
                ? `, count=${health.mongo.sampleCount}`
                : ""}
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              Check .env → MONGODB_URI
            </div>
          )}
        </div>
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
          <div className="text-sm text-muted-foreground">Lost & Found</div>
          <div className="mt-1 text-xl font-semibold">
            {lost ? lost.length : "—"}
          </div>
          <div className="mt-2">
            <Link
              href="/lost"
              className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted inline-block"
            >
              Open Lost & Found
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
            {events ? events.length : "—"}
            {events && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                {events.filter((e) => isEventActive(e)).length} active
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
      </div>

      <div className="mt-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Lost Claims</h2>
            <Link
              href="/lost"
              className="text-sm text-accent underline underline-offset-2"
            >
              View all
            </Link>
          </div>
          <div className="mt-3 grid gap-2">
            {lost?.slice(0, 8).map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs rounded-full border border-border px-2 py-1 bg-muted/40">
                    {c.resolved ? "Resolved" : "Open"}
                  </span>
                </div>
              </div>
            )) || <div className="text-sm text-muted-foreground">No data.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
