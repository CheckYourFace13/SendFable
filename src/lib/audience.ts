import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSegmentRules, resolveSegmentContactIds } from "@/lib/segments";
import { normalizeEmail } from "@/lib/utils";

export interface AudienceSelector {
  audienceType: "all" | "tags" | "segment";
  audienceTagIds?: string[];
  audienceSegmentId?: string | null;
}

/** Resolve subscribed, non-suppressed contacts for a campaign audience. */
export async function resolveAudienceContacts(
  workspaceId: string,
  audience: AudienceSelector
): Promise<
  Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    customFields: unknown;
  }>
> {
  let contactIds: string[] | null = null;

  if (audience.audienceType === "tags") {
    const tagIds = audience.audienceTagIds ?? [];
    if (!tagIds.length) return [];
    const rows = await prisma.contactTag.findMany({
      where: { tagId: { in: tagIds }, contact: { workspaceId, status: "SUBSCRIBED" } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    contactIds = rows.map((r) => r.contactId);
  } else if (audience.audienceType === "segment") {
    if (!audience.audienceSegmentId) return [];
    const segment = await prisma.segment.findFirst({
      where: { id: audience.audienceSegmentId, workspaceId },
    });
    if (!segment) return [];
    contactIds = await resolveSegmentContactIds(
      workspaceId,
      parseSegmentRules(segment.rules),
      { subscribedOnly: true }
    );
  }

  const where: Prisma.ContactWhereInput = {
    workspaceId,
    status: "SUBSCRIBED",
    ...(contactIds ? { id: { in: contactIds } } : {}),
  };

  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      customFields: true,
    },
  });

  if (!contacts.length) return [];

  const emails = contacts.map((c) => normalizeEmail(c.email));
  const [localSupp, globalSupp] = await Promise.all([
    prisma.suppressionEntry.findMany({
      where: { workspaceId, email: { in: emails } },
      select: { email: true },
    }),
    prisma.globalSuppression.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    }),
  ]);
  const suppressed = new Set([
    ...localSupp.map((s) => s.email),
    ...globalSupp.map((s) => s.email),
  ]);

  return contacts.filter((c) => !suppressed.has(normalizeEmail(c.email)));
}

export async function countAudience(
  workspaceId: string,
  audience: AudienceSelector
): Promise<number> {
  const contacts = await resolveAudienceContacts(workspaceId, audience);
  return contacts.length;
}
