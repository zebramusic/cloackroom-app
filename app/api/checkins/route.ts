import { NextResponse } from "next/server";

// Legacy endpoint removed. Return 404 for all methods.
export function GET() {
  return NextResponse.json({ error: "/api/checkins has been removed" }, { status: 404 });
}
export function POST() {
  return NextResponse.json({ error: "/api/checkins has been removed" }, { status: 404 });
}
export function PATCH() {
  return NextResponse.json({ error: "/api/checkins has been removed" }, { status: 404 });
}
export function DELETE() {
  return NextResponse.json({ error: "/api/checkins has been removed" }, { status: 404 });
}
