import { NextRequest } from "next/server";
import type { Event } from "@/app/models/event";

// In-memory store (placeholder). Replace with persistent storage (DB) in production.
// NOTE: This will reset on each serverless cold start / deployment.
let events: Event[] = [];

function sortEvents() {
  events.sort((a, b) => a.startsAt - b.startsAt);
}

export async function GET(_req: NextRequest) {
  // Support optional filtering in future (?active=1 etc.)
  return new Response(JSON.stringify({ items: events }), {
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Event> & { name?: string };
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return new Response(JSON.stringify({ error: "Missing name" }), {
        status: 400,
      });
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
    events.push(ev);
    sortEvents();
    return new Response(JSON.stringify(ev), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }
}

// Simple PATCH for name/time updates (optional future implementation)
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Event> & { id?: string };
    if (!body.id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    const idx = events.findIndex((e) => e.id === body.id);
    if (idx === -1) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    const curr = events[idx];
    if (body.name && body.name.trim()) curr.name = body.name.trim();
    if (typeof body.startsAt === "number") curr.startsAt = body.startsAt;
    if (typeof body.endsAt === "number") curr.endsAt = body.endsAt;
    curr.updatedAt = Date.now();
    sortEvents();
    return new Response(JSON.stringify(curr), { headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Support id from body or search param ?id=
    let id: string | undefined;
    const url = new URL(req.url);
    id = url.searchParams.get("id") || undefined;
    if (!id) {
      try {
        const body = (await req.json()) as { id?: string };
        id = body.id;
      } catch {
        /* ignore parse */
      }
    }
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
      });
    }
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    }
    const removed = events.splice(idx, 1)[0];
    return new Response(JSON.stringify({ ok: true, removed }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }
}
