import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { importSchema } from "@/lib/validators/audience";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

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

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  if (owner.accountRampLevel === 1 && parsed.data.contacts.length > 1000) {
    if (!parsed.data.confirmPurchasedListsPolicy) {
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

  const existing = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, email: { in: [...seen] } },
    select: { email: true },
  });
  const existingSet = new Set(existing.map((e) => e.email));
  const toInsert = valid.filter((v) => !existingSet.has(normalizeEmail(v.email)));
  duplicates += valid.length - toInsert.length;

  const limited = toInsert.slice(0, room);
  const skippedCap = toInsert.length - limited.length;

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
      batch.map((c) =>
        prisma.contact.create({
          data: {
            workspaceId: ctx.workspace.id,
            email: normalizeEmail(c.email),
            firstName: c.firstName || null,
            lastName: c.lastName || null,
            customFields: c.customFields ?? {},
            source: parsed.data.source || "import",
            tags: {
              create: (c.tagNames ?? [])
                .map((n) => tagMap.get(n.trim()))
                .filter(Boolean)
                .map((tagId) => ({ tagId: tagId! })),
            },
          },
        })
      )
    );
    created += batch.length;
  }

  return NextResponse.json({
    created,
    invalid,
    duplicates,
    skippedCap,
    contactCap: cap,
  });
}
