import { NextRequest } from "next/server";
import type { Event } from "@/app/models/event";
import { getDb } from "@/lib/mongodb";

// Fallback in-memory store when MongoDB not configured
const memEvents: Event[] = [];

function sortEvents(list: Event[]) {
  list.sort((a, b) => a.startsAt - b.startsAt);
}

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    if (db) {
      const items = (await db
        .collection<Event>("events")
        .find({})
        .sort({ startsAt: 1 })
        .limit(500)
        .toArray()) as Event[];
      return new Response(JSON.stringify({ items }), {
        headers: { "content-type": "application/json" },
      });
    }
    sortEvents(memEvents);
    return new Response(JSON.stringify({ items: memEvents }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Failed to load events" }), {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Event> & { name?: string };
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return new Response(JSON.stringify({ error: "Missing name" }), { status: 400 });
    }
    const startsAt = typeof body.startsAt === "number" ? body.startsAt : Date.now();
    const endsAt = typeof body.endsAt === "number" ? body.endsAt : startsAt;
    if (endsAt < startsAt) {
      return new Response(JSON.stringify({ error: "endsAt must be >= startsAt" }), { status: 400 });
    }
    const now = Date.now();
    const ev: Event = {
      id: body.id && body.id.startsWith("event_") ? body.id : `event_${now}`,
      name: body.name.trim(),
      startsAt,
      endsAt,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    if (db) {
      await db.collection<Event>("events").updateOne(
        { id: ev.id },
        { $set: ev },
        { upsert: true }
      );
    } else {
      memEvents.push(ev);
      sortEvents(memEvents);
    }
    return new Response(JSON.stringify(ev), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Event> & { id?: string };
    if (!body.id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    const now = Date.now();
    const db = await getDb();
    if (db) {
      const update: Partial<Event> = {};
      if (body.name && body.name.trim()) update.name = body.name.trim();
      if (typeof body.startsAt === "number") update.startsAt = body.startsAt;
      if (typeof body.endsAt === "number") update.endsAt = body.endsAt;
      update.updatedAt = now;
      const coll = db.collection<Event>("events");
      const res: unknown = await coll.updateOne({ id: body.id }, { $set: update });
      const matched = (res as { matchedCount?: number }).matchedCount ?? 0;
      if (matched === 0) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      const doc = await coll.findOne({ id: body.id });
      return new Response(JSON.stringify(doc), { headers: { "content-type": "application/json" } });
    }
    const idx = memEvents.findIndex((e) => e.id === body.id);
    if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    const curr = memEvents[idx];
    if (body.name && body.name.trim()) curr.name = body.name.trim();
    if (typeof body.startsAt === "number") curr.startsAt = body.startsAt;
    if (typeof body.endsAt === "number") curr.endsAt = body.endsAt;
    curr.updatedAt = now;
    sortEvents(memEvents);
    return new Response(JSON.stringify(curr), { headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    let id: string | undefined;
    const url = new URL(req.url);
    id = url.searchParams.get("id") || undefined;
    if (!id) {
      try {
        const body = (await req.json()) as { id?: string };
        id = body.id;
      } catch {/* ignore */}
    }
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    const db = await getDb();
    if (db) {
      const coll = db.collection<Event>("events");
      const doc = await coll.findOne({ id });
      if (!doc) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      await coll.deleteOne({ id });
      return new Response(JSON.stringify({ ok: true, removed: doc }), { headers: { "content-type": "application/json" } });
    }
    const idx = memEvents.findIndex((e) => e.id === id);
    if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    const removed = memEvents.splice(idx, 1)[0];
    return new Response(JSON.stringify({ ok: true, removed }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }
}
