import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { unsubscribeContact } from "@/lib/suppression";
import { normalizeUsPhone } from "@/lib/sms/phone";
import { applyOptIn, applyOptOut } from "@/lib/sms/consent";
import { isSmsSuppressed, matchExistingContact } from "@/lib/sms/contact-intake";

const patchSchema = z.object({
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  customFields: z.record(z.string()).optional(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "PENDING_CONFIRM"]).optional(),
  /** Explicit SMS marketing consent toggle (never inferred from phone presence). */
  smsConsent: z.boolean().optional(),
  smsConsentSource: z.string().max(120).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: {
      tags: { include: { tag: true } },
      recipients: {
        orderBy: { sentAt: "desc" },
        take: 25,
        include: { campaign: { select: { id: true, name: true } } },
      },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const suppression = contact.email
    ? await prisma.suppressionEntry.findFirst({
        where: { workspaceId: ctx.workspace.id, email: contact.email },
        select: { reason: true, createdAt: true },
      })
    : null;

  const smsSuppression = contact.phoneE164
    ? await prisma.smsSuppression.findUnique({
        where: {
          workspaceId_phoneE164: {
            workspaceId: ctx.workspace.id,
            phoneE164: contact.phoneE164,
          },
        },
        select: { reason: true, createdAt: true },
      })
    : null;

  const activity = contact.recipients.map((r) => ({
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    status: r.status,
    sentAt: r.sentAt,
    openedAt: r.openedAt,
    firstClickedAt: r.firstClickedAt,
  }));

  const { recipients: _r, ...rest } = contact;
  return NextResponse.json({
    contact: { ...rest, suppression, smsSuppression, activity },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    parsed.data.status === "SUBSCRIBED" &&
    (existing.status === "BOUNCED" || existing.status === "COMPLAINED")
  ) {
    return NextResponse.json(
      {
        error:
          "Contacts who bounced or complained cannot be set back to subscribed. Keep them suppressed.",
      },
      { status: 400 }
    );
  }

  if (
    parsed.data.status === "UNSUBSCRIBED" &&
    existing.status !== "UNSUBSCRIBED" &&
    existing.email
  ) {
    await unsubscribeContact(ctx.workspace.id, existing.email, "manual");
  }

  let nextPhone = existing.phoneE164;
  if (parsed.data.phone !== undefined) {
    const raw = (parsed.data.phone ?? "").trim();
    if (!raw) {
      nextPhone = null;
    } else {
      const normalized = normalizeUsPhone(raw);
      if (!normalized) {
        return NextResponse.json({ error: "Invalid US mobile number" }, { status: 400 });
      }
      nextPhone = normalized.e164;
    }
  }

  if (!existing.email && !nextPhone) {
    return NextResponse.json(
      { error: "Contact needs an email or a mobile number" },
      { status: 400 }
    );
  }

  if (nextPhone && nextPhone !== existing.phoneE164) {
    const match = await matchExistingContact(ctx.workspace.id, {
      email: existing.email,
      phoneE164: nextPhone,
    });
    if (match.kind === "conflict") {
      return NextResponse.json(
        {
          error:
            "This phone belongs to a different contact. Resolve the conflict before saving.",
          conflict: true,
        },
        { status: 409 }
      );
    }
    if (match.kind === "existing" && match.contactId !== existing.id) {
      return NextResponse.json({ error: "Phone number already in use" }, { status: 409 });
    }
  }

  let smsStatus = existing.smsStatus;
  let smsConsentAt = existing.smsConsentAt;
  let smsConsentSource = existing.smsConsentSource;
  let smsOptedOutAt = existing.smsOptedOutAt;

  if (!nextPhone) {
    smsStatus = "NOT_PROVIDED";
    smsConsentAt = null;
    smsConsentSource = null;
    smsOptedOutAt = null;
  } else if (parsed.data.smsConsent === true) {
    const alreadySubscribed =
      existing.smsStatus === "SUBSCRIBED" &&
      nextPhone === existing.phoneE164 &&
      !(await isSmsSuppressed(ctx.workspace.id, nextPhone));
    if (!alreadySubscribed) {
      const suppressed = await isSmsSuppressed(ctx.workspace.id, nextPhone);
      const result = applyOptIn({
        currentStatus: suppressed ? "OPTED_OUT" : existing.smsStatus,
        source: parsed.data.smsConsentSource || "manual:detail",
        disclosureVersion: null,
        suppressed,
        documentedNewOptIn: true,
      });
      if (!result.accepted) {
        return NextResponse.json(
          { error: result.reason || "SMS consent was not accepted" },
          { status: 400 }
        );
      }
      if (result.clearSuppression) {
        await prisma.smsSuppression.deleteMany({
          where: { workspaceId: ctx.workspace.id, phoneE164: nextPhone },
        });
      }
      smsStatus = "SUBSCRIBED";
      smsConsentAt = new Date();
      smsConsentSource = parsed.data.smsConsentSource || "manual:detail";
      smsOptedOutAt = null;
      await prisma.smsConsentEvent.create({
        data: {
          workspaceId: ctx.workspace.id,
          contactId: existing.id,
          phoneE164: nextPhone,
          action: suppressed ? "RE_OPT_IN" : "OPT_IN",
          source: smsConsentSource,
        },
      });
    }
  } else if (parsed.data.smsConsent === false && nextPhone) {
    if (existing.smsStatus === "SUBSCRIBED") {
      const out = applyOptOut();
      smsStatus = out.nextStatus;
      smsOptedOutAt = new Date();
      await prisma.smsSuppression.upsert({
        where: {
          workspaceId_phoneE164: {
            workspaceId: ctx.workspace.id,
            phoneE164: nextPhone,
          },
        },
        create: {
          workspaceId: ctx.workspace.id,
          phoneE164: nextPhone,
          reason: "manual",
        },
        update: { reason: "manual" },
      });
      await prisma.smsConsentEvent.create({
        data: {
          workspaceId: ctx.workspace.id,
          contactId: existing.id,
          phoneE164: nextPhone,
          action: "OPT_OUT",
          source: "manual:detail",
        },
      });
    } else if (
      existing.smsStatus === "NOT_PROVIDED" ||
      existing.smsStatus === "PENDING_CONSENT" ||
      !existing.phoneE164
    ) {
      smsStatus = "PENDING_CONSENT";
    }
  } else if (nextPhone && nextPhone !== existing.phoneE164) {
    const suppressed = await isSmsSuppressed(ctx.workspace.id, nextPhone);
    smsStatus = suppressed ? "OPTED_OUT" : "PENDING_CONSENT";
    smsConsentAt = null;
    smsConsentSource = null;
    smsOptedOutAt = suppressed ? new Date() : null;
  }

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      firstName: parsed.data.firstName === undefined ? undefined : parsed.data.firstName,
      lastName: parsed.data.lastName === undefined ? undefined : parsed.data.lastName,
      company: parsed.data.company === undefined ? undefined : parsed.data.company,
      phoneE164: parsed.data.phone === undefined ? undefined : nextPhone,
      smsStatus,
      smsConsentAt,
      smsConsentSource,
      smsOptedOutAt,
      customFields: parsed.data.customFields,
      status:
        existing.status === "BOUNCED" || existing.status === "COMPLAINED"
          ? undefined
          : parsed.data.status,
      unsubscribedAt: parsed.data.status === "UNSUBSCRIBED" ? new Date() : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
