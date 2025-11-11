"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/private/toast/ToastContext";
import { useEvents } from "@/app/hooks/useEvents";

type Staff = {
  id: string;
  fullName: string;
  email: string;
  isAuthorized: boolean;
  createdAt: number;
  authorizedEventId?: string;
};

export default function StaffAdminPage() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{
    id?: string;
    fullName: string;
    email: string;
    password?: string;
    isAuthorized: boolean;
    authorizedEventId?: string | null;
  }>({
    fullName: "",
    email: "",
    password: "",
    isAuthorized: false,
    authorizedEventId: null,
  });
  const [error, setError] = useState<string | null>(null);
  const { data: events, error: eventsError } = useEvents();

  useEffect(() => {
    if (!eventsError) return;
    const message =
      eventsError instanceof Error
        ? eventsError.message
        : "Failed to load active events";
    push({ message, variant: "error" });
  }, [eventsError, push]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setItems((json.items || []) as Staff[]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load staff list";
      push({ message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [push, q]);
  useEffect(() => {
    void load();
  }, [load]);
  // Guard: only admins allowed
  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.user?.type !== "admin") {
          window.location.href = "/private/handover";
        }
      })
      .catch(() => {
        window.location.href = "/private/handover";
      });
  }, []);

  const editing = Boolean(form.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { ...form };
    try {
      const res = await fetch("/api/staff", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const message = j.error || "Operation failed";
        setError(message);
        push({ message, variant: "error" });
        return;
      }
      setForm({
        fullName: "",
        email: "",
        password: "",
        isAuthorized: false,
        authorizedEventId: null,
      });
      await load();
      push({
        message: editing ? "Staff member updated" : "Staff member created",
        variant: "success",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Network error while saving";
      setError(message);
      push({ message, variant: "error" });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this staff member?")) return;
    try {
      const res = await fetch(`/api/staff?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const message = j.error || "Failed to delete staff member";
        push({ message, variant: "error" });
        return;
      }
      await load();
      push({ message: "Staff member deleted", variant: "success" });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Network error while deleting";
      push({ message, variant: "error" });
    }
  }

  function edit(u: Staff) {
    setForm({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      isAuthorized: u.isAuthorized,
      password: "",
      authorizedEventId: u.authorizedEventId || null,
    });
  }

  function resetForm() {
    setForm({
      fullName: "",
      email: "",
      password: "",
      isAuthorized: false,
      authorizedEventId: null,
    });
  }

  const activeEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((ev) => now >= ev.startsAt && now <= ev.endsAt);
  }, [events]);

  const activeEventIds = useMemo(() => {
    return new Set(activeEvents.map((ev) => ev.id));
  }, [activeEvents]);

  const eventNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of events) map.set(ev.id, ev.name);
    return map;
  }, [events]);

  const filtered = useMemo(() => items, [items]);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">Manage Staff</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create, edit, authorize, reset password, and delete staff users.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
              placeholder="Search by name or email"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={() => void load()}
              className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
            >
              Search
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : null}
            {filtered.length === 0 && !loading ? (
              <div className="text-sm text-muted-foreground">
                No staff users.
              </div>
            ) : (
              filtered.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-border bg-background p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} • {new Date(u.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {u.isAuthorized
                        ? u.authorizedEventId
                          ? `Authorized for ${
                              eventNameById.get(u.authorizedEventId) ??
                              u.authorizedEventId
                            }`
                          : "Authorized - no event assigned"
                        : u.authorizedEventId
                        ? `Pending access for ${
                            eventNameById.get(u.authorizedEventId) ??
                            u.authorizedEventId
                          }`
                        : "Not authorized for any event"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs rounded-full px-2 py-1 border ${
                        u.isAuthorized
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}
                    >
                      {u.isAuthorized ? "Authorized" : "Pending"}
                    </span>
                    <button
                      onClick={() => edit(u)}
                      className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void remove(u.id)}
                      className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">
            {editing ? "Edit Staff" : "Create Staff"}
          </h2>
          <form onSubmit={submit} className="mt-3 grid gap-3">
            <div>
              <label className="block text-sm font-medium">Full name</label>
              <input
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Password{" "}
                {editing ? (
                  <span className="text-muted-foreground">
                    (leave blank to keep)
                  </span>
                ) : null}
              </label>
              <input
                type="password"
                value={form.password || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="auth"
                type="checkbox"
                checked={form.isAuthorized}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isAuthorized: e.target.checked }))
                }
              />
              <label htmlFor="auth" className="text-sm">
                Authorized
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium">Active Event</label>
              <select
                value={form.authorizedEventId || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    authorizedEventId: e.target.value || null,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              >
                <option value="">— None (no access) —</option>
                {form.authorizedEventId &&
                !activeEventIds.has(form.authorizedEventId) ? (
                  <option
                    key="selected-inactive"
                    value={form.authorizedEventId}
                  >
                    {eventNameById.get(form.authorizedEventId) ??
                      form.authorizedEventId}{" "}
                    (inactive)
                  </option>
                ) : null}
                {activeEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Staff will only be able to issue/search handovers for the
                selected event.
              </p>
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="flex items-center gap-2">
              <button
                className="rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow"
                type="submit"
              >
                {editing ? "Save" : "Create"}
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          {editing ? (
            <div className="mt-4 rounded-xl border border-border p-3">
              <div className="text-sm font-medium">Reset Password</div>
              <p className="text-xs text-muted-foreground mt-1">
                Set a new password above and click Save. This will replace the
                current password.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
