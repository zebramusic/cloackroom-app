export const runtime = "nodejs"; // ensure Node runtime (mongodb not edge-compatible)
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ ok: true, mongo: { connected: false } }, { status: 200 });
    }
    try {
      const col = db.collection<{ id: string }>("handovers");
      // touch the collection to verify a round-trip
  const sample = await col.find({}).sort({ _id: -1 }).limit(1).toArray();
      return NextResponse.json(
        {
          ok: true,
          mongo: {
            connected: true,
            sampleCount: sample.length,
          },
        },
        { status: 200 }
      );
    } catch (e) {
      return NextResponse.json(
        { ok: false, mongo: { connected: false, error: String(e) } },
        { status: 500 }
      );
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
