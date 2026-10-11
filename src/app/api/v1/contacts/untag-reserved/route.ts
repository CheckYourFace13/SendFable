import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReservedExampleEmail } from "@/lib/reserved-email";
import {
  BRIEF_AUDIENCE_TAG,
  ensureAudienceTag,
  requireIntegrationAuth,
} from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

/**
 * Remove reserved example.com/net/org addresses from the Brief audience tag.
 * Preserves contacts and campaign history; does not reactivate suppressed contacts.
 * POST /api/v1/contacts/untag-reserved
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const tag = await ensureAudienceTag(auth.workspace.id);
  const tagged = await prisma.contactTag.findMany({
    where: { tagId: tag.id },
    include: { contact: { select: { id: true, email: true, status: true } } },
  });

  const toRemove = tagged.filter(
    (row) => row.contact.email && isReservedExampleEmail(row.contact.email)
  );

  if (toRemove.length) {
    await prisma.contactTag.deleteMany({
      where: {
        tagId: tag.id,
        contactId: { in: toRemove.map((r) => r.contactId) },
      },
    });
  }

  const remaining = await prisma.contactTag.count({
    where: {
      tagId: tag.id,
      contact: { workspaceId: auth.workspace.id, status: "SUBSCRIBED" },
    },
  });

  return NextResponse.json({
    ok: true,
    tag: BRIEF_AUDIENCE_TAG,
    removed: toRemove.length,
    domains: ["example.com", "example.net", "example.org"],
    subscribedRemaining: remaining,
  });
}
