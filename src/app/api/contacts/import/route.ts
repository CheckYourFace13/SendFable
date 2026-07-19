import { NextResponse } from "next/server";
import type { ContactStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { importSchema } from "@/lib/validators/audience";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import {
  isRestrictedStatus,
  mergeContactStatus,
  type ImportContactStatus,
} from "@/lib/migration-presets";

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("import", ctx.user.id || clientIp(req), RATE_LIMITS.import.limit, RATE_LIMITS.import.windowSec);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many imports. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const parsed = importSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const dryRun = !!parsed.data.dryRun;
  const provider = parsed.data.provider;
  const sourceLabel = parsed.data.source || (provider ? `migrate:${provider}` : "import");

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  if (owner.accountRampLevel === 1 && parsed.data.contacts.length > 1000) {
    if (!parsed.data.confirmPurchasedListsPolicy && !dryRun) {
      return NextResponse.json(
        {
          error: "Large import requires confirming the no-purchased-lists policy",
          requiresPolicyConfirmation: true,
        },
        { status: 400 }
      );
    }
  }

  const existingCount = await prisma.contact.count({ where: { workspaceId: ctx.workspace.id } });
  const cap = PLANS[owner.plan].contactCap;
  const room = Math.max(0, cap - existingCount);

  const seen = new Set<string>();
  const valid: typeof parsed.data.contacts = [];
  let invalid = 0;
  let duplicates = 0;

  for (const row of parsed.data.contacts) {
    const email = normalizeEmail(row.email);
    if (!isValidEmail(email)) {
      invalid++;
      continue;
    }
    if (seen.has(email)) {
      duplicates++;
      continue;
    }
    seen.add(email);
    valid.push({ ...row, email });
  }

  const emails = [...seen];
  const [existingRows, localSuppressions, globalSuppressions] = await Promise.all([
    prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id, email: { in: emails } },
      select: { id: true, email: true, status: true },
    }),
    prisma.suppressionEntry.findMany({
      where: { workspaceId: ctx.workspace.id, email: { in: emails } },
      select: { email: true },
    }),
    prisma.globalSuppression.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    }),
  ]);

  const existingByEmail = new Map(
    existingRows.map((e) => [normalizeEmail(e.email), e] as const)
  );
  const suppressedSet = new Set([
    ...localSuppressions.map((s) => normalizeEmail(s.email)),
    ...globalSuppressions.map((s) => normalizeEmail(s.email)),
  ]);

  let existingCountInBatch = 0;
  let suppressed = 0;
  const toInsert: typeof valid = [];
  const toUpdateStatus: Array<{ id: string; status: ContactStatus }> = [];

  for (const v of valid) {
    const email = normalizeEmail(v.email);
    const existing = existingByEmail.get(email);
    const incomingStatus = (v.status || "SUBSCRIBED") as ImportContactStatus;

    if (suppressedSet.has(email) || isRestrictedStatus(incomingStatus)) {
      // Count as suppressed when on list or importing a restricted status
      if (suppressedSet.has(email)) suppressed++;
    }

    if (existing) {
      existingCountInBatch++;
      duplicates++;
      const next = mergeContactStatus(existing.status as ImportContactStatus, incomingStatus);
      // Never upgrade restricted → subscribed; only write when status changes downward/sideways
      if (next !== existing.status) {
        toUpdateStatus.push({ id: existing.id, status: next as ContactStatus });
      }
      continue;
    }

    toInsert.push({
      ...v,
      email,
      status: mergeContactStatus(null, incomingStatus),
    });
  }

  const limited = toInsert.slice(0, room);
  const skippedCap = toInsert.length - limited.length;

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      created: 0,
      wouldCreate: limited.length,
      invalid,
      duplicates,
      existing: existingCountInBatch,
      suppressed,
      statusUpdates: toUpdateStatus.length,
      skippedCap,
      contactCap: cap,
    });
  }

  // Resolve / create tags
  const allTagNames = new Set<string>();
  for (const c of limited) {
    for (const t of c.tagNames ?? []) allTagNames.add(t.trim());
  }
  const tagMap = new Map<string, string>();
  for (const name of allTagNames) {
    if (!name) continue;
    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId: ctx.workspace.id, name } },
      create: { workspaceId: ctx.workspace.id, name },
      update: {},
    });
    tagMap.set(name, tag.id);
  }

  let created = 0;
  const batchSize = 100;
  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((c) => {
        const status = (c.status || "SUBSCRIBED") as ContactStatus;
        return prisma.contact.create({
          data: {
            workspaceId: ctx.workspace.id,
            email: normalizeEmail(c.email),
            firstName: c.firstName || null,
            lastName: c.lastName || null,
            customFields: c.customFields ?? {},
            status,
            unsubscribedAt: status === "UNSUBSCRIBED" ? new Date() : null,
            source: sourceLabel,
            tags: {
              create: (c.tagNames ?? [])
                .map((n) => tagMap.get(n.trim()))
                .filter(Boolean)
                .map((tagId) => ({ tagId: tagId! })),
            },
          },
        });
      })
    );
    created += batch.length;
  }

  // Apply status merges for existing contacts (never upgrades restricted → subscribed)
  if (toUpdateStatus.length) {
    const updateBatch = 100;
    for (let i = 0; i < toUpdateStatus.length; i += updateBatch) {
      const batch = toUpdateStatus.slice(i, i + updateBatch);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.contact.update({
            where: { id: u.id },
            data: {
              status: u.status,
              unsubscribedAt: u.status === "UNSUBSCRIBED" ? new Date() : undefined,
            },
          })
        )
      );
    }
  }

  return NextResponse.json({
    created,
    invalid,
    duplicates,
    existing: existingCountInBatch,
    suppressed,
    statusUpdates: toUpdateStatus.length,
    skippedCap,
    contactCap: cap,
    provider: provider || null,
  });
}
