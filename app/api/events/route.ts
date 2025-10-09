import { NextRequest } from "next/server";
import type { Event } from "@/app/models/event";
import { getDb } from "@/lib/mongodb";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";

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

