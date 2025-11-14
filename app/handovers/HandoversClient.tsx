"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { HandoverReport } from "@/app/models/handover";
import { useToast } from "@/app/private/toast/ToastContext";

type EmailHistoryEntry = NonNullable<
  HandoverReport["emailSendHistory"]
>[number];

const formatTimestamp = (value: number) => new Date(value).toLocaleString();

function deriveEmailHistory(report: HandoverReport): EmailHistoryEntry[] {
  const history = Array.isArray(report.emailSendHistory)
    ? [...report.emailSendHistory]
    : [];
  if (history.length > 0) {
    return history.sort((a, b) => a.sentAt - b.sentAt);
  }
  if (report.emailSentAt) {
    return [
      {
        sentAt: report.emailSentAt,
        success: true,
        recipient: report.emailSentTo,
      },
    ];
  }
  return [];
}

export default function HandoversClient() {
  const { push } = useToast();
  const [items, setItems] = useState<HandoverReport[] | null>(null);
  const [q, setQ] = useState("");
  const [coat, setCoat] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{
    type?: "admin" | "staff";
    authorizedEventId?: string;
  } | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  const fetchList = useCallback(
    async (query?: string) => {
      setLoading(true);
      try {
        const usp = new URLSearchParams();
        if (query) usp.set("q", query);
        if (coat.trim()) usp.set("coat", coat.trim());
        if (name.trim()) usp.set("name", name.trim());
        if (phone.trim()) usp.set("phone", phone.trim());
        if (eventName.trim()) usp.set("eventName", eventName.trim());
        if (me?.type === "staff" && me.authorizedEventId)
          usp.set("eventId", me.authorizedEventId);
        const res = await fetch(`/api/handover?${usp.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { items: HandoverReport[] };
        setItems(json.items || []);
      } catch (e) {
        setItems([]);
        const message =
          e instanceof Error ? e.message : "Failed to load handovers";
        push({ message, variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [coat, eventName, me?.authorizedEventId, me?.type, name, phone, push]
  );

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => setMe(j.user || null))
      .catch(() => setMe(null));
    void fetchList("");
  }, [fetchList]); // initial load only

  useEffect(() => {
    const t = setTimeout(() => void fetchList(q), 200);
    return () => clearTimeout(t);
  }, [fetchList, q]);

  const isAdmin = me?.type === "admin";

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      "Delete this handover? This cannot be undone."
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/handover?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const message = j.error || "Failed to delete handover";
        push({ message, variant: "error" });
        return;
      }
      push({ message: "Handover deleted", variant: "success" });
      await fetchList(q);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Network error while deleting";
      push({ message, variant: "error" });
    }
  }

  async function handleEmail(handover: HandoverReport) {
    if (!handover.email) {
      push({
        message: "No client email saved for this handover.",
        variant: "error",
      });
      return;
    }
    setEmailingId(handover.id);
    try {
      const res = await fetch("/api/handover/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: handover.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        recipient?: string;
        sentAt?: number;
        emailSendHistory?: EmailHistoryEntry[];
      };
      if (!res.ok) {
        const message = data?.error || "Failed to send handover email";
        push({ message, variant: "error" });
        return;
      }
      const recipient = (data?.recipient || handover.email || "").trim();
      const sentAt =
        typeof data?.sentAt === "number" ? data.sentAt : Date.now();
      const historyFromResponse = Array.isArray(data?.emailSendHistory)
        ? data.emailSendHistory
        : null;
      setItems((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              item.id === handover.id
                ? {
                    ...item,
                    emailSentAt: sentAt,
                    emailSentTo: recipient || undefined,
                    emailSendHistory:
                      historyFromResponse && historyFromResponse.length
                        ? historyFromResponse
                        : [
                            ...deriveEmailHistory(item),
                            {
                              sentAt,
                              success: true,
                              recipient: recipient || undefined,
                            },
                          ],
                  }
                : item
            )
          : prev
      );
      push({
        message: recipient
          ? `Handover emailed to ${recipient}`
          : "Handover email sent",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Network error while sending email";
      push({ message, variant: "error" });
    } finally {
      setEmailingId(null);
    }
  }

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
          {me?.type !== "staff" ? (
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event name"
              className="w-48 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          ) : null}
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
        {items?.map((r) => {
          const emailHistory = deriveEmailHistory(r);
          const successfulEmails = emailHistory.filter(
            (entry) => entry.success
          );
          const successCount = successfulEmails.length;
          const successTimes = successfulEmails.map((entry) =>
            formatTimestamp(entry.sentAt)
          );
          const lastAttempt = emailHistory[emailHistory.length - 1];
          const emailTooltip =
            emailHistory.length > 0
              ? emailHistory
                  .map((entry) => {
                    const prefix = entry.success ? "✅" : "⚠️";
                    const time = formatTimestamp(entry.sentAt);
                    const recipientLabel = entry.recipient
                      ? ` → ${entry.recipient}`
                      : "";
                    const errorLabel =
                      !entry.success && entry.error ? ` – ${entry.error}` : "";
                    return `${prefix} ${time}${recipientLabel}${errorLabel}`;
                  })
                  .join("\n")
              : undefined;
          let emailStatusText: string;
          let emailBadgeTone = "border-border bg-muted text-muted-foreground";
          let emailIcon = "📬";
          if (!r.email) {
            emailStatusText = "Client email not provided";
            emailIcon = "🚫";
          } else if (successCount > 0) {
            const timesText = successTimes.join("; ");
            emailStatusText = `Sent ${successCount} ${
              successCount === 1 ? "time" : "times"
            } on ${timesText}`;
            emailBadgeTone =
              "border-emerald-500/50 bg-emerald-500/10 text-emerald-700";
            emailIcon = "✉️";
          } else if (lastAttempt) {
            const failureTime = formatTimestamp(lastAttempt.sentAt);
            const reason = lastAttempt.error ? ` – ${lastAttempt.error}` : "";
            emailStatusText = `Last attempt failed at ${failureTime}${reason}`;
            emailBadgeTone =
              "border-amber-500/50 bg-amber-500/10 text-amber-700";
            emailIcon = "⚠️";
          } else {
            emailStatusText = "Email not sent yet";
            emailIcon = "📬";
          }
          const emailBadgeClassName = `inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-[10px] font-semibold ${emailBadgeTone}`;

          return (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  #{r.coatNumber} — {r.fullName}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap gap-3 items-center">
                  <span>Issued: {formatTimestamp(r.createdAt)}</span>
                  {r.staff ? <span>Staff: {r.staff}</span> : null}
                  {r.phone ? <span>Tel: {r.phone}</span> : null}
                  {r.language ? (
                    <span>Lang: {r.language.toUpperCase()}</span>
                  ) : null}
                  {r.eventName || r.eventId ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] leading-none bg-muted">
                      Event: {r.eventName || r.eventId}
                    </span>
                  ) : null}
                  <span
                    className={emailBadgeClassName}
                    title={emailTooltip || undefined}
                  >
                    <span aria-hidden="true" role="img">
                      {emailIcon}
                    </span>
                    <span className="flex items-center gap-1 whitespace-pre-wrap text-left">
                      {emailStatusText}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <Link
                    href={`/private/handovers/${encodeURIComponent(r.id)}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-[13px] hover:bg-muted"
                    aria-label="View details"
                  >
                    🔍
                  </Link>
                  <span className="pointer-events-none absolute -top-9 left-1/2 w-max -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition group-hover:scale-100 group-hover:opacity-100">
                    View details
                  </span>
                </div>
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => void handleEmail(r)}
                    disabled={emailingId === r.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-[13px] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Email handover"
                  >
                    {emailingId === r.id ? "⌛" : "✉️"}
                  </button>
                  <span className="pointer-events-none absolute -top-9 left-1/2 w-max -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition group-hover:scale-100 group-hover:opacity-100">
                    Email handover
                  </span>
                </div>
                <div className="relative group">
                  <Link
                    href={`/private/handover/print/${encodeURIComponent(
                      r.id
                    )}?lang=${r.language || "ro"}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-[13px] hover:bg-muted"
                    aria-label="Print handover"
                  >
                    🖨️
                  </Link>
                  <span className="pointer-events-none absolute -top-9 left-1/2 w-max -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition group-hover:scale-100 group-hover:opacity-100">
                    Print handover
                  </span>
                </div>
                <div className="relative group">
                  <Link
                    href={`/private/handover/print/${encodeURIComponent(
                      r.id
                    )}?open=pdf&auto=1&lang=${r.language || "ro"}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-[13px] hover:bg-muted"
                    aria-label="Download PDF"
                  >
                    ⬇️
                  </Link>
                  <span className="pointer-events-none absolute -top-9 left-1/2 w-max -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition group-hover:scale-100 group-hover:opacity-100">
                    Download PDF
                  </span>
                </div>
                {isAdmin ? (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => void handleDelete(r.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-[13px] text-red-600 hover:bg-red-500/10"
                      aria-label="Delete handover"
                    >
                      🗑️
                    </button>
                    <span className="pointer-events-none absolute -top-9 left-1/2 w-max -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition group-hover:scale-100 group-hover:opacity-100">
                      Delete handover
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
