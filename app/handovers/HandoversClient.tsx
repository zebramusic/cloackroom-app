"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HandoverReport } from "@/app/models/handover";

export default function HandoversClient() {
  const [items, setItems] = useState<HandoverReport[] | null>(null);
  const [q, setQ] = useState("");
  const [coat, setCoat] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchList(query?: string) {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      if (query) usp.set("q", query);
      if (coat.trim()) usp.set("coat", coat.trim());
      if (name.trim()) usp.set("name", name.trim());
      if (phone.trim()) usp.set("phone", phone.trim());
      if (eventName.trim()) usp.set("eventName", eventName.trim());
      const res = await fetch(`/api/handover?${usp.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { items: HandoverReport[] };
      setItems(json.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchList("");
  }, []); // initial load only

  // Re-run fetch when field filters change (debounced minimal by synchronous grouping)
  useEffect(() => {
    const t = setTimeout(() => void fetchList(q), 200);
    return () => clearTimeout(t);
  }, [q, coat, name, phone, eventName]);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Recent Handovers
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-prose">
            Browse and search saved handover reports. Use the Print action to
            open an individual report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/private/handover"
            className="text-sm rounded-full border border-border px-4 py-2 hover:bg-muted"
          >
            + New Handover
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 w-full">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={q}
            onChange={(e) => {
              const val = e.target.value;
              setQ(val);
              void fetchList(val);
            }}
            placeholder="Quick search (coat, name, phone, event)"
            className="w-full sm:w-64 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={coat}
            onChange={(e) => setCoat(e.target.value)}
            placeholder="Coat #"
            className="w-28 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-40 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-40 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event name"
            className="w-48 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => {
              setCoat("");
              setName("");
              setPhone("");
              setEventName("");
              setQ("");
              void fetchList("");
            }}
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Reset
          </button>
          {loading ? (
            <span className="text-xs text-muted-foreground">Loading…</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {items
                ? `${items.length} result${items.length === 1 ? "" : "s"}`
                : "—"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {(!items || items.length === 0) && !loading ? (
          <div className="text-sm text-muted-foreground">
            No handovers found.
          </div>
        ) : null}
        {items?.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                #{r.coatNumber} — {r.fullName}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap gap-3">
                <span>{new Date(r.createdAt).toLocaleString()}</span>
                {r.staff ? <span>Staff: {r.staff}</span> : null}
                {r.phone ? <span>Tel: {r.phone}</span> : null}
                {r.language ? (
                  <span>Lang: {r.language.toUpperCase()}</span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/private/handovers/${encodeURIComponent(r.id)}`}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Details
              </Link>
              <Link
                href={`/private/handover/print/${encodeURIComponent(
                  r.id
                )}?lang=${r.language || "ro"}`}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Print
              </Link>
              <Link
                href={`/private/handover/print/${encodeURIComponent(
                  r.id
                )}?open=pdf&auto=1&lang=${r.language || "ro"}`}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                PDF
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
