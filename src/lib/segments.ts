import type { Contact, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SegmentOperator =
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "is_set"
  | "is_empty"
  | "in";

export interface SegmentCondition {
  field: string; // email | firstName | lastName | status | tag | custom.<key>
  operator: SegmentOperator;
  value?: string;
}

export interface SegmentRules {
  match: "all" | "any";
  conditions: SegmentCondition[];
}

function getFieldValue(contact: Contact & { tags?: { tagId: string; tag?: { name: string } }[] }, field: string): string {
  if (field === "email") return contact.email;
  if (field === "firstName") return contact.firstName ?? "";
  if (field === "lastName") return contact.lastName ?? "";
  if (field === "status") return contact.status;
  if (field === "tag") {
    return (contact.tags ?? []).map((t) => t.tag?.name ?? t.tagId).join(",");
  }
  if (field.startsWith("custom.")) {
    const key = field.slice(7);
    const custom = (contact.customFields as Record<string, string>) ?? {};
    return custom[key] ?? "";
  }
  return "";
}

function matchCondition(
  contact: Contact & { tags?: { tagId: string; tag?: { name: string } }[] },
  cond: SegmentCondition
): boolean {
  const val = getFieldValue(contact, cond.field);
  const target = cond.value ?? "";

  switch (cond.operator) {
    case "eq":
      return val.toLowerCase() === target.toLowerCase();
    case "neq":
      return val.toLowerCase() !== target.toLowerCase();
    case "contains":
      return val.toLowerCase().includes(target.toLowerCase());
    case "not_contains":
      return !val.toLowerCase().includes(target.toLowerCase());
    case "starts_with":
      return val.toLowerCase().startsWith(target.toLowerCase());
    case "is_set":
      return val.length > 0;
    case "is_empty":
      return val.length === 0;
    case "in": {
      const parts = target.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (cond.field === "tag") {
        const tags = val.toLowerCase().split(",");
        return parts.some((p) => tags.includes(p));
      }
      return parts.includes(val.toLowerCase());
    }
    default:
      return false;
  }
}

export function contactMatchesRules(
  contact: Contact & { tags?: { tagId: string; tag?: { name: string } }[] },
  rules: SegmentRules
): boolean {
  if (!rules.conditions?.length) return true;
  if (rules.match === "any") {
    return rules.conditions.some((c) => matchCondition(contact, c));
  }
  return rules.conditions.every((c) => matchCondition(contact, c));
}

export function parseSegmentRules(raw: unknown): SegmentRules {
  const r = raw as SegmentRules;
  return {
    match: r?.match === "any" ? "any" : "all",
    conditions: Array.isArray(r?.conditions) ? r.conditions : [],
  };
}

/** Resolve contact IDs for a segment (subscribed only by default for sending). */
export async function resolveSegmentContactIds(
  workspaceId: string,
  rules: SegmentRules,
  opts: { subscribedOnly?: boolean } = {}
): Promise<string[]> {
  const where: Prisma.ContactWhereInput = { workspaceId };
  if (opts.subscribedOnly !== false) {
    where.status = "SUBSCRIBED";
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: { tags: { include: { tag: true } } },
  });

  return contacts.filter((c) => contactMatchesRules(c, rules)).map((c) => c.id);
}

export async function countSegmentContacts(
  workspaceId: string,
  rules: SegmentRules,
  opts: { subscribedOnly?: boolean } = {}
): Promise<number> {
  const ids = await resolveSegmentContactIds(workspaceId, rules, opts);
  return ids.length;
}
