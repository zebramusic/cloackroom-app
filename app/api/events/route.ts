import { NextRequest, NextResponse } from "next/server";
import type { Event } from "@/app/models/event";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import {
  listMemoryEvents,
  removeMemoryEvent,
  updateMemoryEvent,
  upsertMemoryEvent,
} from "@/app/api/events/memoryStore";

export async function GET() {
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
    const items = listMemoryEvents();
    return new Response(JSON.stringify({ items }), {
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
    const token = req.cookies.get(SESS_COOKIE)?.value;
    const me = await getSessionUser(token);
    const fallbackRole = req.cookies.get("cloack_role")?.value;
    if (!me && fallbackRole !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me && me.type !== "admin")
      return NextResponse.json({ error: "Admins only" }, { status: 403 });

    const body = (await req.json()) as Partial<Event> & {
      name?: string;
      startsAt?: number;
      endsAt?: number;
    };
    const name = (body.name || "").trim();
    const startsAt = Number(body.startsAt);
    const endsAt = Number(body.endsAt);
    if (!name || !Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (endsAt < startsAt) {
      return NextResponse.json(
        { error: "endsAt must be >= startsAt" },
        { status: 400 }
      );
    }
    const now = Date.now();
    const ev: Event = {
      id: `event_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      startsAt,
      endsAt,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    if (db) {
      const col = db.collection<Event>("events");
      await col.updateOne({ id: ev.id }, { $set: ev }, { upsert: true });
      return NextResponse.json(ev, { status: 201 });
    }
    upsertMemoryEvent(ev);
    return NextResponse.json(ev, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESS_COOKIE)?.value;
    const me = await getSessionUser(token);
    const fallbackRole = req.cookies.get("cloack_role")?.value;
    if (!me && fallbackRole !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me && me.type !== "admin")
      return NextResponse.json({ error: "Admins only" }, { status: 403 });

    const body = (await req.json()) as Partial<Event> & { id?: string };
    const id = (body.id || "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const update: Partial<Event> = {};
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.startsAt === "number") update.startsAt = body.startsAt;
    if (typeof body.endsAt === "number") update.endsAt = body.endsAt;
    update.updatedAt = Date.now();
    if (
      (update.startsAt != null && !Number.isFinite(update.startsAt)) ||
      (update.endsAt != null && !Number.isFinite(update.endsAt))
    ) {
      return NextResponse.json({ error: "Invalid timestamps" }, { status: 400 });
    }
    if (
      update.startsAt != null &&
      update.endsAt != null &&
      (update.endsAt as number) < (update.startsAt as number)
    ) {
      return NextResponse.json(
        { error: "endsAt must be >= startsAt" },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (db) {
      const col = db.collection<Event>("events");
      await col.updateOne({ id }, { $set: update });
      const doc = await col.findOne({ id });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(doc);
    }
    const updated = updateMemoryEvent(id, (prev) => ({
      ...prev,
      ...update,
    } as Event));
    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get(SESS_COOKIE)?.value;
    const me = await getSessionUser(token);
    const fallbackRole = req.cookies.get("cloack_role")?.value;
    if (!me && fallbackRole !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me && me.type !== "admin")
      return NextResponse.json({ error: "Admins only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const db = await getDb();
    if (db) {
      const col = db.collection<Event>("events");
      await col.deleteOne({ id });
      return NextResponse.json({ ok: true });
    }
    removeMemoryEvent(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

