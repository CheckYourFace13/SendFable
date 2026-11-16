import { NextResponse } from "next/server";
import { z } from "zod";
import { requireIntegrationAuth } from "@/lib/integration-auth";
import { deliveryExternalId, isIntegrationMessageId } from "@/lib/integration-mail-events";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  messageIds: z.array(z.string().trim().min(8).max(200)).max(100),
});

/**
 * Delivery, bounce, and complaint names for message ids this workspace registered.
 * Absence means the event was not recorded. It does not invent a delivery.
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const messageIds = [...new Set(parsed.data.messageIds.filter(isIntegrationMessageId))];
  const registered = messageIds.length
    ? await prisma.webhookEvent.findMany({
        where: { source: "integration-send", externalId: { in: messageIds }, type: auth.workspace.id },
        select: { externalId: true },
      })
    : [];
  const owned = new Set(registered.map((row) => row.externalId));
  const ownedIds = [...owned];
  const events = ownedIds.length
    ? await prisma.webhookEvent.findMany({
        where: {
          source: "ses-mail",
          OR: ownedIds.map((id) => ({ externalId: { startsWith: `${id}:` } })),
        },
        select: { externalId: true, type: true },
      })
    : [];

  return NextResponse.json({
    results: messageIds.map((messageId) => ({
      messageId,
      tracked: owned.has(messageId),
      events: owned.has(messageId)
        ? events
            .filter((event) => event.externalId === deliveryExternalId(messageId, event.type))
            .map((event) => event.type)
        : [],
    })),
  });
}
