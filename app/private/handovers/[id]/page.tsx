import { notFound } from "next/navigation";
import type { HandoverReport } from "@/app/models/handover";
import { getDb } from "@/lib/mongodb";
import Link from "next/link";
import PhotosGallery from "./PhotosGallery";
import SignedDocClient from "./signed/SignedDocClient";

// We keep this a Server Component: fetch directly from Mongo if available; otherwise return 404.
// URL param id corresponds to HandoverReport.id.

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export const revalidate = 0; // always fetch fresh (private data)

async function load(id: string): Promise<HandoverReport | null> {
  const db = await getDb();
  if (!db) return null; // In-memory fallback not wired server-side
  const col = db.collection<HandoverReport>("handovers");
  const doc = await col.findOne({ id });
  return doc || null;
}

export default async function HandoverDetailPage({ params }: Props) {
  // Next.js 15 may supply params as an async object – normalize by awaiting if needed.
  const awaited = params instanceof Promise ? await params : params;
  const report = await load(awaited.id);
  if (!report) {
    notFound();
  }

  const created = new Date(report.createdAt);
  const dt = created.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight">
          Handover #{report.coatNumber}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/private/handovers`}
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Back
          </Link>
          <Link
            href={`/private/handover/print/${encodeURIComponent(
              report.id
            )}?lang=${report.language || "ro"}`}
            className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Print / PDF
          </Link>
        </div>
      </div>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border p-4 bg-card">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-muted-foreground">
              Core
            </h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-muted-foreground">ID</dt>
              <dd className="col-span-2 break-all">{report.id}</dd>
              <dt className="font-medium text-muted-foreground">Coat #</dt>
              <dd className="col-span-2">{report.coatNumber}</dd>
              <dt className="font-medium text-muted-foreground">Created</dt>
              <dd className="col-span-2">{dt}</dd>
              {report.language && (
                <>
                  <dt className="font-medium text-muted-foreground">
                    Language
                  </dt>
                  <dd className="col-span-2 uppercase">{report.language}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border p-4 bg-card">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-muted-foreground">
              Person
            </h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-muted-foreground">Name</dt>
              <dd className="col-span-2 break-words">{report.fullName}</dd>
              {report.phone && (
                <>
                  <dt className="font-medium text-muted-foreground">Phone</dt>
                  <dd className="col-span-2 break-words">{report.phone}</dd>
                </>
              )}
              {report.email && (
                <>
                  <dt className="font-medium text-muted-foreground">Email</dt>
                  <dd className="col-span-2 break-all">{report.email}</dd>
                </>
              )}
              {report.staff && (
                <>
                  <dt className="font-medium text-muted-foreground">Staff</dt>
                  <dd className="col-span-2 break-words">{report.staff}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border p-4 bg-card">
            <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-muted-foreground">
              Notes
            </h2>
            <div className="text-sm whitespace-pre-wrap leading-relaxed min-h-12 text-foreground/90">
              {report.notes ? (
                report.notes
              ) : (
                <span className="italic text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <PhotosGallery photos={report.photos || []} />
          <SignedDocClient initial={report.signedDoc} id={report.id} />
        </div>
      </section>
    </main>
  );
}
