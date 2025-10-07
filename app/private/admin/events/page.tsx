"use client";
import { useEffect, useState } from "react";
import type { Event } from "@/app/models/event";
import { isEventActive } from "@/app/models/event";

interface DraftEvent {
  name: string;
  startsAt: string; // ISO local input
  endsAt: string; // ISO local input
}

export default function AdminEventsPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEvent>(() => presetDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftEvent | null>(null);

  function presetDraft(): DraftEvent {
    const now = new Date();
    const startIso = toLocalInputValue(now);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h default
    return { name: "", startsAt: startIso, endsAt: toLocalInputValue(end) };
  }

  function toLocalInputValue(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function parseLocal(dt: string): number | null {
    if (!dt) return null;
    // Treat input as local time
    const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [, y, mo, da, hh, mm] = m;
    const date = new Date(
      Number(y),
      Number(mo) - 1,
      Number(da),
      Number(hh),
      Number(mm),
      0,
      0
    );
    return date.getTime();
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const json = (await res.json()) as { items?: Event[] };
      const arr = Array.isArray(json.items) ? [...json.items] : [];
      arr.sort((a, b) => a.startsAt - b.startsAt);
      setItems(arr);
    } catch (e) {
      console.error(e);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!draft.name.trim()) return;
    const startsAt = parseLocal(draft.startsAt);
    const endsAt = parseLocal(draft.endsAt);
    if (startsAt == null || endsAt == null) {
      setError("Invalid date/time formats");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const body = {
        name: draft.name.trim(),
        startsAt,
        endsAt,
      };
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Create failed (${res.status})`);
      }
      setDraft(presetDraft());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(ev: Event) {
    setEditingId(ev.id);
    setEditDraft({
      name: ev.name,
      startsAt: toLocalInputValue(new Date(ev.startsAt)),
      endsAt: toLocalInputValue(new Date(ev.endsAt)),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    const startsAt = parseLocal(editDraft.startsAt);
    const endsAt = parseLocal(editDraft.endsAt);
    if (startsAt == null || endsAt == null) {
      setError("Invalid date/time formats");
      return;
    }
    try {
      const res = await fetch("/api/events", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editDraft.name.trim(),
          startsAt,
          endsAt,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Update failed (${res.status})`);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const now = Date.now();

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">Events</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage events (start/end are inclusive; active events influence
        handovers).
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">
          Create Event
        </h2>
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-foreground">
              Name
            </label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              placeholder="Event name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">
              Starts
            </label>
            <input
              type="datetime-local"
              value={draft.startsAt}
              onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">
              Ends
            </label>
            <input
              type="datetime-local"
              value={draft.endsAt}
              onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={create}
            disabled={creating || !draft.name.trim()}
            className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-4 py-1.5 text-sm font-medium shadow hover:opacity-95 disabled:opacity-50"
          >
            {creating ? "Saving…" : "Create"}
          </button>
          <button
            onClick={() => setDraft(presetDraft())}
            type="button"
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Reset
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">
          Existing Events
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events created.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Starts</th>
                  <th className="py-2 pr-4 font-medium">Ends</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ev) => {
                  const active = isEventActive(ev, now);
                  const editing = editingId === ev.id;
                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-border/60 last:border-none"
                    >
                      <td className="py-2 pr-4 align-top">
                        {editing ? (
                          <input
                            value={editDraft?.name || ""}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, name: e.target.value } : d
                              )
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                          />
                        ) : (
                          <span className="font-medium">{ev.name}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 align-top text-xs">
                        {editing ? (
                          <input
                            type="datetime-local"
                            value={editDraft?.startsAt || ""}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, startsAt: e.target.value } : d
                              )
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                          />
                        ) : (
                          new Date(ev.startsAt).toLocaleString()
                        )}
                      </td>
                      <td className="py-2 pr-4 align-top text-xs">
                        {editing ? (
                          <input
                            type="datetime-local"
                            value={editDraft?.endsAt || ""}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, endsAt: e.target.value } : d
                              )
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                          />
                        ) : (
                          new Date(ev.endsAt).toLocaleString()
                        )}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-600/15 text-green-700 dark:text-green-300 border border-green-600/30 px-2 py-0.5 text-[10px] font-medium">
                            Active
                          </span>
                        ) : now < ev.startsAt ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-600/30 px-2 py-0.5 text-[10px] font-medium">
                            Upcoming
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground/60 border border-border px-2 py-0.5 text-[10px] font-medium">
                            Past
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 align-top text-xs">
                        {editing ? (
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={saveEdit}
                              className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => beginEdit(ev)}
                              className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(ev.id)}
                              className="rounded-full border border-border px-2 py-0.5 hover:bg-red-600/10 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
