import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { HandoverReport } from "@/app/models/handover";
import type { Event } from "@/app/models/event";
import { isEventActive } from "@/app/models/event";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }> | { id: string };
}

export const revalidate = 0;

async function load(id: string) {
  const db = await getDb();
  if (!db) return null;
  const doc = await db.collection<HandoverReport>("handovers").findOne({ id });
  return doc ?? null;
}

export default async function SignedDocPage({ params }: Params) {
  const awaited = params instanceof Promise ? await params : params;
  const report = await load(awaited.id);
  if (!report) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (me && me.type === "staff") {
    if (!me.isAuthorized || !me.authorizedEventId) notFound();
    const db = await getDb();
    if (!db) notFound();
    const ev = await db.collection<Event>("events").findOne({ id: me.authorizedEventId });
    if (!ev || !isEventActive(ev)) notFound();
    const withinWindow =
      report.createdAt >= ev.startsAt && report.createdAt <= ev.endsAt;
    if (report.eventId && report.eventId !== me.authorizedEventId) notFound();
    if (!report.eventId && !withinWindow) notFound();
  }

  if (!report.signedDoc) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Signed Handover</h1>
          <Link
            href={`/private/handovers/${encodeURIComponent(report.id)}`}
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Back to details
          </Link>
        </header>
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No signed document is stored for this handover yet.
        </p>
      </main>
    );
  }

  const created = new Date(report.createdAt).toLocaleString();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Signed Handover</h1>
          <p className="text-xs text-muted-foreground">Collected {created}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/private/handovers/${encodeURIComponent(report.id)}`}
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Back to details
          </Link>
          <a
            href={report.signedDoc}
            download={`handover_${report.id}_signed.jpg`}
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Download
          </a>
        </div>
      </header>
      <section className="rounded-2xl border border-border bg-card p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.signedDoc}
          alt="Signed handover document"
          className="mx-auto block max-h-[80vh] w-full max-w-3xl rounded-lg border border-border object-contain bg-black/40"
        />
      </section>
    </main>
  );
}
