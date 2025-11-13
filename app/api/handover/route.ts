export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import type { HandoverReport } from "@/app/models/handover";
import { getDb } from "@/lib/mongodb";
import type { Event } from "@/app/models/event";
import { isEventActive } from "@/app/models/event";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { sendHandoverEmails } from "@/lib/email";

// In-memory fallback store when no DB is available
const store: Map<string, HandoverReport> = new Map();
export const handoverMemoryStore = store;
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idFilter = (searchParams.get("id") || "").trim();
  const q = (searchParams.get("q") || "").trim();
  const coat = (searchParams.get("coat") || "").trim();
  const name = (searchParams.get("name") || "").trim();
  const phone = (searchParams.get("phone") || "").trim();
  const eventId = (searchParams.get("eventId") || "").trim();
  const eventName = (searchParams.get("eventName") || "").trim();
  // Resolve session and enforce staff scope
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  // Build dynamic filter conditions; empty means no filter for that field
  const db = await getDb();
  if (db) {
    // If staff, ensure they are authorized and have a bound event; validate that event is active.
    let staffActiveEvent: Event | null = null;
    if (me && me.type === "staff") {
      if (me.isAuthorized === false || !me.authorizedEventId) {
        return NextResponse.json({ items: [] });
      }
      try {
        const ev = await db
          .collection<Event>("events")
          .findOne({ id: me.authorizedEventId });
        if (ev) {
          if (!isEventActive(ev, Date.now())) {
            return NextResponse.json({ items: [] });
          }
          staffActiveEvent = ev;
        }
        // If event doc is missing, continue with strict eventId filter only (no window allowance)
      } catch {
        // On DB error, continue with strict eventId filter only
      }
    }
    const col = db.collection<HandoverReport>("handovers");
  // Build MongoDB filter parts with explicit typing to avoid any
  const and: Record<string, unknown>[] = [];
    // Staff can only view their authorized event (enforced regardless of request filters)
    if (me && me.type === "staff") {
      // At this point, we already validated authorizedEventId presence and activity and loaded staffActiveEvent.
      // Always restrict to the authorized event id
      if (staffActiveEvent) {
        // Allow docs explicitly tagged to this event OR legacy docs without eventId but created during the active event window.
        const ev = staffActiveEvent;
        and.push({
          $or: [
            { eventId: me.authorizedEventId },
            {
              $and: [
                { $or: [ { eventId: { $exists: false } }, { eventId: null }, { eventId: "" } ] },
                { createdAt: { $gte: ev.startsAt, $lte: ev.endsAt } },
              ],
            },
          ],
        });
      } else {
        // No event doc found: filter strictly by eventId only
        and.push({ eventId: me.authorizedEventId });
      }
    }
  if (idFilter) and.push({ id: idFilter });
  if (eventId) and.push({ eventId });
    if (eventName)
      and.push({ eventName: { $regex: eventName, $options: "i" } });
    if (coat) and.push({ coatNumber: { $regex: coat, $options: "i" } });
    if (name) and.push({ fullName: { $regex: name, $options: "i" } });
    if (phone) and.push({ phone: { $regex: phone, $options: "i" } });
    if (q) {
      and.push({
        $or: [
          { coatNumber: { $regex: q, $options: "i" } },
          { fullName: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { eventName: { $regex: q, $options: "i" } },
          { clothType: { $regex: q, $options: "i" } },
        ],
      });
    }
    const where = and.length ? { $and: and } : {};
    const items = await col
      .find(where)
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();
    return NextResponse.json({ items });
  }
  // In-memory fallback
  const idLower = idFilter.toLowerCase();
  const qLower = q.toLowerCase();
  const coatL = coat.toLowerCase();
  const nameL = name.toLowerCase();
  const phoneL = phone.toLowerCase();
  // If no DB, we cannot validate event activity reliably; fail closed for staff and unauthenticated (already handled)
    // If no DB, we cannot validate event activity reliably; allow staff to see only handovers tagged with their authorizedEventId
  const items = Array.from(store.values())
    .filter((r: HandoverReport) => {
        if (me && me.type === "staff") {
          if (!me.authorizedEventId) return false;
          if (r.eventId !== me.authorizedEventId) return false;
        }
      if (idLower && r.id.toLowerCase() !== idLower) return false;
      if (eventId && r.eventId !== eventId) return false;
      if (
        eventName &&
        !(r.eventName || "").toLowerCase().includes(eventName.toLowerCase())
      )
        return false;
      if (coatL && !r.coatNumber.toLowerCase().includes(coatL)) return false;
      if (nameL && !r.fullName.toLowerCase().includes(nameL)) return false;
      if (phoneL && !(r.phone || "").toLowerCase().includes(phoneL)) return false;
      if (
        qLower &&
        !(
          r.coatNumber.toLowerCase().includes(qLower) ||
          r.fullName.toLowerCase().includes(qLower) ||
          (r.phone || "").toLowerCase().includes(qLower) ||
          (r.eventName || "").toLowerCase().includes(qLower) ||
          (r.clothType || "").toLowerCase().includes(qLower)
        )
      )
        return false;
      return true;
    })
  .sort((a: HandoverReport, b: HandoverReport) => b.createdAt - a.createdAt)
    .slice(0, 300);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<HandoverReport>;
  if (!body?.id || !body.coatNumber || !body.fullName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.type === "staff" && me.isAuthorized === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getDb();
  // Staff can only create within their authorized event
  if (me.type === "staff") {
    if (!me.authorizedEventId) {
      return NextResponse.json({ error: "Not allowed: no event authorization" }, { status: 403 });
    }
    if (body.eventId && body.eventId !== me.authorizedEventId) {
      return NextResponse.json({ error: "Not allowed for this event" }, { status: 403 });
    }
  }
  const rawEventId =
    me.type === "staff"
      ? me.authorizedEventId
      : body.eventId != null
      ? String(body.eventId).trim()
      : undefined;
  const effectiveEventId = rawEventId && rawEventId.length ? rawEventId : undefined;

  if (!effectiveEventId) {
    return NextResponse.json(
      { error: "An active event is required to create a handover" },
      { status: 400 }
    );
  }

  let eventDoc: Event | null = null;
  if (db) {
    eventDoc = await db.collection<Event>("events").findOne({ id: effectiveEventId });
    if (!eventDoc) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!isEventActive(eventDoc, Date.now())) {
      return NextResponse.json({ error: "Event not active" }, { status: 403 });
    }
  }

  const resolvedEventName =
    eventDoc?.name || (body.eventName ? String(body.eventName) : undefined);
  const createdAt =
    typeof body.createdAt === "number" && Number.isFinite(body.createdAt)
      ? body.createdAt
      : Date.now();
  const report: HandoverReport = {
    id: body.id,
    coatNumber: String(body.coatNumber),
    fullName: String(body.fullName),
    eventId: effectiveEventId,
    eventName: resolvedEventName,
    phone: body.phone ? String(body.phone) : undefined,
    phoneVerified:
      body.phone && typeof body.phoneVerified === "boolean"
        ? body.phoneVerified
        : undefined,
    phoneVerifiedAt:
      body.phoneVerifiedAt && typeof body.phoneVerifiedAt === "number"
        ? body.phoneVerifiedAt
        : undefined,
    phoneVerifiedBy:
      body.phoneVerifiedBy && typeof body.phoneVerifiedBy === "string"
        ? body.phoneVerifiedBy
        : undefined,
    email: body.email ? String(body.email) : undefined,
    staff: body.staff ? String(body.staff) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    clothType: body.clothType ? String(body.clothType) : undefined,
    language: body.language === "ro" || body.language === "en" ? body.language : undefined,
    photos: Array.isArray(body.photos)
      ? body.photos.filter((p): p is string => typeof p === "string")
      : undefined,
    createdAt,
    signedDoc:
      body.signedDoc && typeof body.signedDoc === "string"
        ? body.signedDoc
        : undefined,
    signedAt:
      body.signedAt && typeof body.signedAt === "number"
        ? body.signedAt
        : undefined,
    emailSentAt:
      body.emailSentAt && typeof body.emailSentAt === "number"
        ? body.emailSentAt
        : undefined,
    emailSentTo:
      body.emailSentTo && typeof body.emailSentTo === "string"
        ? body.emailSentTo
        : undefined,
  };
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.updateOne({ id: report.id }, { $set: report }, { upsert: true });
    
    // Send emails after successful handover creation (async, non-blocking)
    setImmediate(async () => {
      try {
        const emailResults = await sendHandoverEmails(report);
        console.log('Handover email results:', emailResults);
        if (emailResults.client.success && emailResults.client.recipient) {
          const sentAt = Date.now();
          await col.updateOne(
            { id: report.id },
            {
              $set: {
                emailSentAt: sentAt,
                emailSentTo: emailResults.client.recipient,
              },
            }
          );
        }
      } catch (emailError) {
        console.error('Failed to send handover emails:', emailError);
        // Log error but don't affect the handover creation response
      }
    });
    
    return NextResponse.json(report, { status: 201 });
  }
  store.set(report.id, report);
  
  // Send emails for in-memory storage too (async, non-blocking)
  setImmediate(async () => {
    try {
      const emailResults = await sendHandoverEmails(report);
      console.log('Handover email results:', emailResults);
      if (emailResults.client.success && emailResults.client.recipient) {
        const sentAt = Date.now();
        const existing = store.get(report.id);
        if (existing) {
          store.set(report.id, {
            ...existing,
            emailSentAt: sentAt,
            emailSentTo: emailResults.client.recipient,
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send handover emails:', emailError);
    }
  });
  
  return NextResponse.json(report, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Authorization: allow both admin and staff (require authenticated session)
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (me.type !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.deleteOne({ id });
    return NextResponse.json({ ok: true });
  }
  store.delete(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<HandoverReport> & { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  // Only signedDoc updates supported for now (avoid overwriting other fields accidentally)
  if (!body.signedDoc) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.type === "staff" && me.isAuthorized === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Allow both staff & admin to attach signed document (capture step after print)
  if (me.type !== "admin" && me.type !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // If staff, ensure the handover belongs to their authorized event
  if (me.type === "staff") {
    const db2 = await getDb();
    if (db2) {
      const doc = await db2.collection<HandoverReport>("handovers").findOne({ id: body.id });
      if (doc && me.authorizedEventId && doc.eventId !== me.authorizedEventId) {
        return NextResponse.json({ error: "Forbidden for this event" }, { status: 403 });
      }
    }
  }
  const db = await getDb();
  if (db) {
    const col = db.collection<HandoverReport>("handovers");
    await col.updateOne(
      { id: body.id },
      { $set: { signedDoc: body.signedDoc, signedAt: Date.now() } }
    );
    const doc = await col.findOne({ id: body.id });
    return NextResponse.json(doc);
  }
  const existing = store.get(body.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = { ...existing, signedDoc: body.signedDoc, signedAt: Date.now() };
  store.set(body.id, updated);
  return NextResponse.json(updated);
}
