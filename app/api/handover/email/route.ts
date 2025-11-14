export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import type {
  HandoverEmailLogEntry,
  HandoverReport,
} from "@/app/models/handover";
import { getSessionUser, SESS_COOKIE } from "@/lib/auth";
import { sendHandoverClientEmail } from "@/lib/email";
import { getDb } from "@/lib/mongodb";
import { handoverMemoryStore } from "../route";

interface EmailRequest {
  id?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESS_COOKIE)?.value;
  const me = await getSessionUser(token);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: EmailRequest | null = null;
  try {
    payload = (await req.json()) as EmailRequest | null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = payload?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing handover id" }, { status: 400 });
  }

  const db = await getDb();
  let handover: HandoverReport | null = null;
  if (db) {
    handover = await db
      .collection<HandoverReport>("handovers")
      .findOne({ id });
  }
  if (!handover) {
    handover = handoverMemoryStore.get(id) ?? null;
  }
  if (!handover) {
    return NextResponse.json({ error: "Handover not found" }, { status: 404 });
  }

  if (me.type === "staff") {
    if (me.isAuthorized === false) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      me.authorizedEventId &&
      handover.eventId &&
      handover.eventId !== me.authorizedEventId
    ) {
      return NextResponse.json({ error: "Forbidden for this event" }, { status: 403 });
    }
  }

  const overrideEmail = payload?.email?.trim();
  if (!overrideEmail && !handover.email) {
    return NextResponse.json(
      { error: "Handover has no email on record" },
      { status: 400 }
    );
  }

  const result = await sendHandoverClientEmail(
    handover,
    overrideEmail ? { to: overrideEmail } : undefined
  );

  if (!result.success) {
    const status = result.error === "No client email provided" ? 400 : 500;
    return NextResponse.json(
      {
        error: result.error || "Failed to send email",
        recipient: result.recipient || handover.email || overrideEmail || undefined,
      },
      { status }
    );
  }

  const sentAt = Date.now();
  const resolvedRecipient =
    (result.recipient || overrideEmail || handover.email || "").trim();
  const recipientForRecord = resolvedRecipient || undefined;
  const attempt: HandoverEmailLogEntry = {
    sentAt,
    success: true,
    recipient: recipientForRecord,
  };

  if (db) {
    await db
      .collection<HandoverReport>("handovers")
      .updateOne(
        { id },
        {
          $push: { emailSendHistory: attempt },
          $set: { emailSentAt: sentAt, emailSentTo: recipientForRecord },
        }
      );
    const updated = await db
      .collection<HandoverReport>("handovers")
      .findOne({ id });
    if (updated) handover = updated;
  } else {
    const existing = handoverMemoryStore.get(id);
    if (existing) {
      const merged = {
        ...existing,
        emailSentAt: sentAt,
        emailSentTo: recipientForRecord,
        emailSendHistory: [
          ...(existing.emailSendHistory || []),
          attempt,
        ],
      };
      handoverMemoryStore.set(id, merged);
      handover = merged;
    }
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId ?? null,
    recipient: resolvedRecipient,
    sentAt,
    emailSendHistory: handover?.emailSendHistory || [],
  });
}
