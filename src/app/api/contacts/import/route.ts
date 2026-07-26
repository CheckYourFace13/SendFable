import { NextResponse } from "next/server";
import type { ContactStatus, SmsConsentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { importSchema } from "@/lib/validators/audience";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import {
  resolveImportStatus,
  type ImportContactStatus,
  type SuppressionReasonLike,
} from "@/lib/migration-presets";
import { normalizeUsPhone } from "@/lib/sms/phone";

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

  // ── SMS consent mode for this batch ──────────────────────────────────────
  // Phones are NEVER auto-subscribed. Documented permission is required and
  // an import can never override STOP suppression.
  const smsConsentMode = parsed.data.smsConsentMode ?? "none";
  if (smsConsentMode === "documented-source" && !parsed.data.smsConsentSource?.trim()) {
    return NextResponse.json(
      { error: "Documented SMS consent requires a consent source" },
      { status: 400 }
    );
  }
  if (smsConsentMode === "owner-attestation" && !parsed.data.ownerAttestation?.trim()) {
    return NextResponse.json(
      { error: "Owner attestation text is required for this consent mode" },
      { status: 400 }
    );
  }

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

  // ── Normalize + validate rows ─────────────────────────────────────────────
  type Row = (typeof parsed.data.contacts)[number] & {
    email: string | null;
    phoneE164: string | null;
  };
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const valid: Row[] = [];
  let invalid = 0;
  let duplicates = 0;
  let phoneWithoutPermission = 0;

  for (const row of parsed.data.contacts) {
    const emailRaw = (row.email ?? "").trim();
    const email = emailRaw ? normalizeEmail(emailRaw) : null;
    if (email && !isValidEmail(email)) {
      invalid++;
      continue;
    }
    const phoneRaw = (row.phone ?? "").trim();
    const phone = phoneRaw ? normalizeUsPhone(phoneRaw) : null;
    if (phoneRaw && !phone) {
      // Invalid/ambiguous phone: if there is no email either, the row is invalid.
      if (!email) {
        invalid++;
        continue;
      }
    }
    const phoneE164 = phone?.e164 ?? null;
    if (!email && !phoneE164) {
      invalid++;
      continue;
    }
    if ((email && seenEmails.has(email)) || (phoneE164 && seenPhones.has(phoneE164))) {
      duplicates++;
      continue;
    }
    if (email) seenEmails.add(email);
    if (phoneE164) seenPhones.add(phoneE164);
    valid.push({ ...row, email, phoneE164 });
  }

  const emails = [...seenEmails];
  const phones = [...seenPhones];
  const [existingByEmailRows, existingByPhoneRows, localSuppressions, globalSuppressions, smsSuppressions] =
    await Promise.all([
      emails.length
        ? prisma.contact.findMany({
            where: { workspaceId: ctx.workspace.id, email: { in: emails } },
            select: { id: true, email: true, phoneE164: true, status: true },
          })
        : Promise.resolve([]),
      phones.length
        ? prisma.contact.findMany({
            where: { workspaceId: ctx.workspace.id, phoneE164: { in: phones } },
            select: { id: true, email: true, phoneE164: true, status: true },
          })
        : Promise.resolve([]),
      emails.length
        ? prisma.suppressionEntry.findMany({
            where: { workspaceId: ctx.workspace.id, email: { in: emails } },
            select: { email: true, reason: true },
          })
        : Promise.resolve([]),
      emails.length
        ? prisma.globalSuppression.findMany({
            where: { email: { in: emails } },
            select: { email: true, reason: true },
          })
        : Promise.resolve([]),
      phones.length
        ? prisma.smsSuppression.findMany({
            where: { workspaceId: ctx.workspace.id, phoneE164: { in: phones } },
            select: { phoneE164: true },
          })
        : Promise.resolve([]),
    ]);

  const existingByEmail = new Map(
    existingByEmailRows.filter((e) => e.email).map((e) => [normalizeEmail(e.email!), e] as const)
  );
  const existingByPhone = new Map(
    existingByPhoneRows.filter((e) => e.phoneE164).map((e) => [e.phoneE164!, e] as const)
  );
  const smsSuppressedSet = new Set(smsSuppressions.map((s) => s.phoneE164));

  const suppressionReasonByEmail = new Map<string, SuppressionReasonLike>();
  for (const s of localSuppressions) {
    suppressionReasonByEmail.set(normalizeEmail(s.email), s.reason as SuppressionReasonLike);
  }
  for (const s of globalSuppressions) {
    suppressionReasonByEmail.set(normalizeEmail(s.email), s.reason as SuppressionReasonLike);
  }
  const suppressedSet = new Set(suppressionReasonByEmail.keys());

  let existingCountInBatch = 0;
  let suppressed = 0;
  let conflicts = 0;
  let smsEligible = 0;
  const toInsert: Row[] = [];
  const toUpdateStatus: Array<{ id: string; status: ContactStatus }> = [];

  const rowHasSmsConsent = (row: Row): boolean => {
    if (!row.phoneE164) return false;
    if (smsSuppressedSet.has(row.phoneE164)) return false; // STOP always wins
    switch (smsConsentMode) {
      case "explicit-fields":
        return row.smsConsent === true;
      case "documented-source":
      case "owner-attestation":
        return true;
      default:
        return false;
    }
  };

  for (const v of valid) {
    const existingEmail = v.email ? existingByEmail.get(v.email) : undefined;
    const existingPhone = v.phoneE164 ? existingByPhone.get(v.phoneE164) : undefined;

    // Split identity: email matches one contact, phone matches another → review
    if (existingEmail && existingPhone && existingEmail.id !== existingPhone.id) {
      conflicts++;
      continue;
    }
    const existing = existingEmail ?? existingPhone;

    const incomingStatus = (v.status || "SUBSCRIBED") as ImportContactStatus;
    const isEmailSuppressed = !!v.email && suppressedSet.has(v.email);
    if (isEmailSuppressed) suppressed++;

    const resolved = resolveImportStatus({
      existing: (existing?.status as ImportContactStatus) ?? null,
      incoming: incomingStatus,
      suppressionReason: v.email ? suppressionReasonByEmail.get(v.email) ?? null : null,
      isSuppressed: isEmailSuppressed,
    });

    if (existing) {
      existingCountInBatch++;
      duplicates++;
      if (resolved !== existing.status) {
        toUpdateStatus.push({ id: existing.id, status: resolved as ContactStatus });
      }
      continue;
    }

    if (v.phoneE164) {
      if (rowHasSmsConsent(v)) smsEligible++;
      else phoneWithoutPermission++;
    }
    toInsert.push({ ...v, status: resolved });
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
      conflicts,
      smsEligible,
      phoneWithoutPermission,
      statusUpdates: toUpdateStatus.length,
      skippedCap,
      contactCap: cap,
    });
  }

  // ── Import batch record (stores the SMS consent evidence/attestation) ─────
  const batch = await prisma.contactImportBatch.create({
    data: {
      workspaceId: ctx.workspace.id,
      rowCount: parsed.data.contacts.length,
      smsConsentMode,
      smsConsentSource: parsed.data.smsConsentSource || null,
      smsConsentDate: parsed.data.smsConsentDate ? new Date(parsed.data.smsConsentDate) : null,
      ownerAttestation: parsed.data.ownerAttestation || null,
      createdByUserId: ctx.user.id,
    },
  });

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
    const slice = limited.slice(i, i + batchSize);
    await prisma.$transaction(
      slice.map((c) => {
        const status = (c.status || "SUBSCRIBED") as ContactStatus;
        const smsSuppressedRow = !!c.phoneE164 && smsSuppressedSet.has(c.phoneE164);
        const consented = rowHasSmsConsent(c);
        const smsStatus: SmsConsentStatus = !c.phoneE164
          ? "NOT_PROVIDED"
          : smsSuppressedRow
            ? "OPTED_OUT" // reimported opted-out numbers stay opted out
            : consented
              ? "SUBSCRIBED"
              : "PENDING_CONSENT";
        return prisma.contact.create({
          data: {
            workspaceId: ctx.workspace.id,
            email: c.email,
            phoneE164: c.phoneE164,
            smsStatus,
            smsConsentAt: smsStatus === "SUBSCRIBED" ? new Date() : null,
            smsConsentSource: smsStatus === "SUBSCRIBED" ? `import:${batch.id}` : null,
            smsOptedOutAt: smsStatus === "OPTED_OUT" ? new Date() : null,
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
    created += slice.length;
  }

  // Consent audit events for newly subscribed phones
  const consentedRows = limited.filter(
    (c) => c.phoneE164 && !smsSuppressedSet.has(c.phoneE164) && rowHasSmsConsent(c)
  );
  if (consentedRows.length) {
    const contactsWithPhones = await prisma.contact.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        phoneE164: { in: consentedRows.map((c) => c.phoneE164!) },
      },
      select: { id: true, phoneE164: true },
    });
    const idByPhone = new Map(contactsWithPhones.map((c) => [c.phoneE164!, c.id]));
    await prisma.smsConsentEvent.createMany({
      data: consentedRows.map((c) => ({
        workspaceId: ctx.workspace.id,
        contactId: idByPhone.get(c.phoneE164!) ?? null,
        phoneE164: c.phoneE164!,
        action: "IMPORT_RECORDED" as const,
        source: `import:${batch.id}`,
        evidence: {
          mode: smsConsentMode,
          consentSource: parsed.data.smsConsentSource ?? null,
          consentDate: parsed.data.smsConsentDate ?? null,
          rowConsentDate: c.smsConsentDate ?? null,
        },
      })),
    });
  }

  // Apply status merges for existing contacts (never upgrades restricted → subscribed)
  if (toUpdateStatus.length) {
    const updateBatch = 100;
    for (let i = 0; i < toUpdateStatus.length; i += updateBatch) {
      const slice = toUpdateStatus.slice(i, i + updateBatch);
      await prisma.$transaction(
        slice.map((u) =>
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

  await prisma.contactImportBatch.update({
    where: { id: batch.id },
    data: {
      importedCount: created,
      skippedCount: invalid + skippedCap,
      conflictCount: conflicts,
    },
  });

  return NextResponse.json({
    created,
    invalid,
    duplicates,
    existing: existingCountInBatch,
    suppressed,
    conflicts,
    smsEligible,
    phoneWithoutPermission,
    statusUpdates: toUpdateStatus.length,
    skippedCap,
    contactCap: cap,
    provider: provider || null,
    importBatchId: batch.id,
  });
}
