export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { sendHandoverEmails } from "@/lib/email";
import type { HandoverReport } from "@/app/models/handover";

export async function POST(req: NextRequest) {
  // Check authentication
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me || me.type !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { handoverId, testEmail } = body;

    if (!handoverId) {
      return NextResponse.json({ error: "Missing handoverId" }, { status: 400 });
    }

    // Create a test handover object
    const testHandover: HandoverReport = {
      id: handoverId,
      coatNumber: "TEST-001",
      fullName: "Test Client",
      email: testEmail || "test@example.com",
      phone: "+40123456789",
      phoneVerified: true,
      staff: "Test Staff",
      eventName: "Test Event",
      clothType: "Jacket",
      notes: "This is a test handover for email functionality",
      language: "en",
      createdAt: Date.now(),
      photos: ["test-photo-1", "test-photo-2"]
    };

    const results = await sendHandoverEmails(testHandover);

    return NextResponse.json({
      success: true,
      message: "Test emails sent",
      results
    });

  } catch (error) {
    console.error("Email test failed:", error);
    return NextResponse.json({
      error: "Failed to send test emails",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}