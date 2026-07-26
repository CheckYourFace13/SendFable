import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail, randomToken } from "@/lib/utils";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { isSuppressed } from "@/lib/suppression";
import { signToken } from "@/lib/tokens";
import { sendDoubleOptInConfirmation } from "@/lib/transactional";
import { PLANS } from "@/lib/plans";
import { getWorkspaceOwner } from "@/lib/session";
import { normalizeUsPhone } from "@/lib/sms/phone";
import {
  SMS_CONSENT_DISCLOSURE_VERSION,
  applyOptIn,
} from "@/lib/sms/consent";
import { isSmsSuppressed, matchExistingContact, recordIntakeConflict } from "@/lib/sms/contact-intake";

const schema = z.object({
  slug: z.string().min(1),
  fields: z.record(z.union([z.string(), z.boolean()])),
});

export async function POST(req: Request) {
  const rl = await rateLimit(
    "formSubmit",
    clientIp(req),
    RATE_LIMITS.formSubmit.limit,
    RATE_LIMITS.formSubmit.windowSec
  );
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: parsed.data.slug },
    include: { workspace: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const fieldDefs = form.fields as Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;

  const values = parsed.data.fields;
  for (const def of fieldDefs) {
    if (def.required) {
      const v = values[def.key];
      if (v === undefined || v === null || v === "") {
        return NextResponse.json({ error: `${def.label} is required` }, { status: 400 });
      }
    }
  }

  const emailRaw = String(values.email || values.Email || "").trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Phone (unified forms): normalized US E.164; invalid input is rejected,
  // never guessed. The SMS consent checkbox is separate and never prechecked.
  const phoneRaw = String(values.phone || values.Phone || values.mobile || "").trim();
  const phoneParsed = phoneRaw ? normalizeUsPhone(phoneRaw) : null;
  if (phoneRaw && !phoneParsed) {
    return NextResponse.json({ error: "Valid US mobile number required" }, { status: 400 });
  }
  const phoneE164 = phoneParsed?.e164 ?? null;
  const smsConsentGiven = values.smsConsent === true || values.smsConsent === "true";

  // Identifier requirements per form configuration
  const mode = form.requirementMode || "email-required";
  if ((mode === "email-required" || mode === "both-required") && !email) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if ((mode === "phone-required" || mode === "both-required") && !phoneE164) {
    return NextResponse.json({ error: "Valid US mobile number required" }, { status: 400 });
  }
  if (!email && !phoneE164) {
    return NextResponse.json({ error: "An email or mobile number is required" }, { status: 400 });
  }

  if (email && (await isSuppressed(form.workspaceId, email))) {
    // Silently succeed to avoid leaking suppression
    return NextResponse.json({ ok: true });
  }

  const owner = await getWorkspaceOwner(form.workspaceId);
  const count = await prisma.contact.count({ where: { workspaceId: form.workspaceId } });
  if (count >= PLANS[owner.plan].contactCap) {
    return NextResponse.json({ error: "This list is full" }, { status: 503 });
  }

  const firstName = String(values.firstName || values.first_name || "") || null;
  const lastName = String(values.lastName || values.last_name || "") || null;
  const customFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (
      ["email", "firstName", "first_name", "lastName", "last_name", "phone", "mobile", "smsConsent"].includes(k)
    ) {
      continue;
    }
    customFields[k] = String(v);
  }

  const tagIds = (form.tagIds as string[]) ?? [];
  // Email channel status: PENDING_CONFIRM/SUBSCRIBED only makes sense when an
  // email exists; phone-only signups stay SUBSCRIBED on the (unused) email
  // channel and are governed by smsStatus.
  const status = email && form.doubleOptIn ? "PENDING_CONFIRM" : "SUBSCRIBED";
  const confirmToken = email && form.doubleOptIn ? randomToken(24) : null;

  // SMS permission: requires the phone AND the separate consent checkbox.
  // STOP suppression is never overridden by a form replay without new consent.
  let smsData: {
    smsStatus?: "PENDING_CONSENT" | "SUBSCRIBED" | "OPTED_OUT";
    smsConsentAt?: Date | null;
    smsConsentSource?: string | null;
    smsConsentDisclosureVersion?: string | null;
  } = {};
  if (phoneE164) {
    const suppressed = await isSmsSuppressed(form.workspaceId, phoneE164);
    const optIn = applyOptIn({
      currentStatus: "NOT_PROVIDED",
      source: `form:${form.hostedSlug}`,
      disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
      suppressed,
      documentedNewOptIn: smsConsentGiven, // an explicit checkbox on THIS submission
    });
    if (smsConsentGiven && optIn.accepted) {
      smsData = {
        smsStatus: "SUBSCRIBED",
        smsConsentAt: new Date(),
        smsConsentSource: `form:${form.hostedSlug}`,
        smsConsentDisclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
      };
      if (optIn.clearSuppression) {
        await prisma.smsSuppression.deleteMany({
          where: { workspaceId: form.workspaceId, phoneE164 },
        });
      }
    } else if (suppressed) {
      smsData = { smsStatus: "OPTED_OUT" };
    } else {
      smsData = { smsStatus: "PENDING_CONSENT" };
    }
  }

  // Split-identity guard: never auto-merge two different contacts.
  const match = await matchExistingContact(form.workspaceId, { email, phoneE164 });
  if (match.kind === "conflict") {
    await recordIntakeConflict(form.workspaceId, match, `form:${form.hostedSlug}`);
    // The subscriber sees success; the owner resolves the conflict in-app.
    return NextResponse.json({ ok: true });
  }

  try {
    const upsertWhere = email
      ? { workspaceId_email: { workspaceId: form.workspaceId, email } }
      : { workspaceId_phoneE164: { workspaceId: form.workspaceId, phoneE164: phoneE164! } };

    const contact = await prisma.contact.upsert({
      where: upsertWhere,
      create: {
        workspaceId: form.workspaceId,
        email,
        phoneE164,
        firstName,
        lastName,
        customFields,
        status,
        source: `form:${form.hostedSlug}`,
        confirmToken,
        ...smsData,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      update: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        customFields,
        ...(phoneE164 ? { phoneE164 } : {}),
        ...(email && form.doubleOptIn
          ? { status: "PENDING_CONFIRM", confirmToken }
          : email
            ? { status: "SUBSCRIBED" }
            : {}),
        // Only ever upgrade SMS permission on explicit new consent
        ...(smsData.smsStatus === "SUBSCRIBED" ? smsData : {}),
        source: `form:${form.hostedSlug}`,
      },
    });

    if (phoneE164 && smsData.smsStatus === "SUBSCRIBED") {
      await prisma.smsConsentEvent.create({
        data: {
          workspaceId: form.workspaceId,
          contactId: contact.id,
          phoneE164,
          action: "OPT_IN",
          source: `form:${form.hostedSlug}`,
          disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
          evidence: { checkbox: true },
        },
      });
    }

    if (tagIds.length) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId) => ({ contactId: contact.id, tagId })),
        skipDuplicates: true,
      });
    }

    await prisma.signupForm.update({
      where: { id: form.id },
      data: { submitCount: { increment: 1 } },
    });

    if (email && form.doubleOptIn && confirmToken) {
      const jwt = await signToken(
        "form-confirm",
        { contactId: contact.id, workspaceId: form.workspaceId },
        "7d"
      );
      await sendDoubleOptInConfirmation(email, form.workspace.name, jwt);
    }

    return NextResponse.json({
      ok: true,
      pendingConfirm: !!email && form.doubleOptIn,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ ok: true });
    }
    throw e;
  }
}
