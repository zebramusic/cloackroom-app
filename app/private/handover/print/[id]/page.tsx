import type { Metadata } from "next";
import PrintClient from "@/app/private/handover/print/PrintClient";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import type { HandoverReport } from "@/app/models/handover";
import type { Event } from "@/app/models/event";
import { isEventActive } from "@/app/models/event";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Print handover report" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // RBAC: ensure staff only print handovers for their authorized active event
  const cookieStore = await cookies();
  const token = cookieStore.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (me && me.type === "staff") {
    const db = await getDb();
    if (!me.authorizedEventId || me.isAuthorized === false) notFound();
    if (!db) {
      // Allow rendering; client will use sessionStorage payload if recently saved.
      return <PrintClient id={id} />;
    }
    const col = db.collection<HandoverReport>("handovers");
    const doc = await col.findOne({ id });
    if (!doc) {
      // Allow rendering; client will use sessionStorage payload from the handover flow.
      return <PrintClient id={id} />;
    }
    const ev = await db
      .collection<Event>("events")
      .findOne({ id: me.authorizedEventId });
    if (ev) {
      if (!isEventActive(ev)) notFound();
      // Allow legacy docs without eventId if created within the active event window
      const withinWindow =
        doc.createdAt >= ev.startsAt && doc.createdAt <= ev.endsAt;
      if (doc.eventId && doc.eventId !== me.authorizedEventId) notFound();
      if (!doc.eventId && !withinWindow) notFound();
    } else {
      // If no event doc exists, only allow when the handover is explicitly tagged to the authorized event
      if (doc.eventId !== me.authorizedEventId) notFound();
    }
  }
  return <PrintClient id={id} />;
}
