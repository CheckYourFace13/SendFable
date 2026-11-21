import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSegmentRules, resolveSegmentContactIds } from "@/lib/segments";
import { isReservedExampleEmail } from "@/lib/reserved-email";
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
    // Email campaigns can only reach contacts that have an email address
    // (phone-only contacts are addressed by the SMS pipeline instead).
    email: { not: null },
    ...(contactIds ? { id: { in: contactIds } } : {}),
  };

  const rows = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      customFields: true,
    },
  });

  const contacts = rows.filter((c): c is typeof c & { email: string } => !!c.email);
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

  return contacts.filter((c) => {
    const email = normalizeEmail(c.email);
    if (suppressed.has(email)) return false;
    // Never production-send to IETF reserved example domains
    if (isReservedExampleEmail(email)) return false;
    return true;
  });
}

export async function countAudience(
  workspaceId: string,
  audience: AudienceSelector
): Promise<number> {
  const contacts = await resolveAudienceContacts(workspaceId, audience);
  return contacts.length;
}

export type AudienceInspect = {
  /** Same count the send worker uses (subscribed, not suppressed, not reserved). */
  count: number;
  /** Subscribed contacts with email that matched the audience selector before filters. */
  matchedWithEmail: number;
  suppressedExcluded: number;
  reservedExcluded: number;
  emptyReason:
    | null
    | "no_tag_selected"
    | "no_segment_selected"
    | "no_matching_contacts"
    | "all_filtered";
};

/**
 * Same recipient-resolution path as send, plus exclusion counts for review UI.
 */
export async function inspectAudience(
  workspaceId: string,
  audience: AudienceSelector
): Promise<AudienceInspect> {
  if (audience.audienceType === "tags" && !(audience.audienceTagIds ?? []).length) {
    return {
      count: 0,
      matchedWithEmail: 0,
      suppressedExcluded: 0,
      reservedExcluded: 0,
      emptyReason: "no_tag_selected",
    };
  }
  if (audience.audienceType === "segment" && !audience.audienceSegmentId) {
    return {
      count: 0,
      matchedWithEmail: 0,
      suppressedExcluded: 0,
      reservedExcluded: 0,
      emptyReason: "no_segment_selected",
    };
  }

  let contactIds: string[] | null = null;
  if (audience.audienceType === "tags") {
    const tagIds = audience.audienceTagIds ?? [];
    const rows = await prisma.contactTag.findMany({
      where: { tagId: { in: tagIds }, contact: { workspaceId, status: "SUBSCRIBED" } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    contactIds = rows.map((r) => r.contactId);
  } else if (audience.audienceType === "segment" && audience.audienceSegmentId) {
    const segment = await prisma.segment.findFirst({
      where: { id: audience.audienceSegmentId, workspaceId },
    });
    if (!segment) {
      return {
        count: 0,
        matchedWithEmail: 0,
        suppressedExcluded: 0,
        reservedExcluded: 0,
        emptyReason: "no_matching_contacts",
      };
    }
    contactIds = await resolveSegmentContactIds(
      workspaceId,
      parseSegmentRules(segment.rules),
      { subscribedOnly: true }
    );
  }

  const where: Prisma.ContactWhereInput = {
    workspaceId,
    status: "SUBSCRIBED",
    email: { not: null },
    ...(contactIds ? { id: { in: contactIds } } : {}),
  };

  const rows = await prisma.contact.findMany({
    where,
    select: { id: true, email: true },
  });
  const withEmail = rows.filter((c): c is typeof c & { email: string } => !!c.email);
  if (!withEmail.length) {
    return {
      count: 0,
      matchedWithEmail: 0,
      suppressedExcluded: 0,
      reservedExcluded: 0,
      emptyReason: "no_matching_contacts",
    };
  }

  const emails = withEmail.map((c) => normalizeEmail(c.email));
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

  let suppressedExcluded = 0;
  let reservedExcluded = 0;
  let count = 0;
  for (const c of withEmail) {
    const email = normalizeEmail(c.email);
    if (suppressed.has(email)) {
      suppressedExcluded += 1;
      continue;
    }
    if (isReservedExampleEmail(email)) {
      reservedExcluded += 1;
      continue;
    }
    count += 1;
  }

  return {
    count,
    matchedWithEmail: withEmail.length,
    suppressedExcluded,
    reservedExcluded,
    emptyReason: count > 0 ? null : "all_filtered",
  };
}
