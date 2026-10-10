import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail, randomToken } from "@/lib/utils";
import { signToken } from "@/lib/tokens";
import { sendDoubleOptInConfirmation } from "@/lib/transactional";
import { numericCap, softwareQuotas } from "@/lib/internal-entitlement";
import { getWorkspaceOwner } from "@/lib/session";
import { normalizeUsPhone } from "@/lib/sms/phone";
import {
  SMS_CONSENT_DISCLOSURE_VERSION,
  applyOptIn,
  buildSmsConsentDisclosure,
} from "@/lib/sms/consent";
import { isSmsSuppressed, matchExistingContact, recordIntakeConflict } from "@/lib/sms/contact-intake";
import { emailConsentText, type FormFieldDef } from "@/lib/forms/fields";
import { emailRejoinDecision, honeypotTripped, sanitizeHttpUrl, sanitizeUtm } from "@/lib/forms/policy";

type FormRecord = {
  id: string;
  workspaceId: string;
  name: string;
  hostedSlug: string;
  fields: unknown;
  tagIds: unknown;
  doubleOptIn: boolean;
  collectPhone: boolean;
  smsConsentEnabled: boolean;
  requirementMode: string;
  emailDisclosureVersion: string;
  status: string;
  workspace: { id: string; name: string; isInternal: boolean; disabledAt: Date | null };
};

export type AcceptInput = {
  form: FormRecord;
  values: Record<string, string | boolean>;
  attribution?: {
    pageUrl?: unknown;
    referrer?: unknown;
    utmSource?: unknown;
    utmMedium?: unknown;
    utmCampaign?: unknown;
  };
  ip: string | null;
  userAgent: string | null;
  test?: boolean;
};

export type AcceptResult =
  | { ok: true; pendingConfirm: boolean; stored: boolean; contactId?: string }
  | { ok: false; status: number; error: string };

export async function acceptFormSubmission(input: AcceptInput): Promise<AcceptResult> {
  const form = input.form;
  if (form.status !== "ACTIVE") return { ok: false, status: 404, error: "Form not found" };

  if (honeypotTripped(input.values.sf_hp)) {
    return { ok: true, pendingConfirm: false, stored: false };
  }

  const fieldDefs = (Array.isArray(form.fields) ? form.fields : []) as FormFieldDef[];
  for (const def of fieldDefs) {
    if (!def.required) continue;
    const value = input.values[def.key];
    if (value === undefined || value === null || value === "") {
      return { ok: false, status: 400, error: `${def.label} is required` };
    }
  }

  const enabled = new Set(fieldDefs.map((field) => field.key));
  const emailRaw = enabled.has("email") ? String(input.values.email || "").trim() : "";
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (email && !isValidEmail(email)) return { ok: false, status: 400, error: "Valid email required" };

  const phoneRaw = enabled.has("phone") ? String(input.values.phone || "").trim() : "";
  const phoneParsed = phoneRaw ? normalizeUsPhone(phoneRaw) : null;
  if (phoneRaw && !phoneParsed) return { ok: false, status: 400, error: "Valid US mobile number required" };
  const phoneE164 = phoneParsed?.e164 ?? null;

  const mode = form.requirementMode || "email-required";
  if ((mode === "email-required" || mode === "both-required") && !email) {
    return { ok: false, status: 400, error: "Valid email required" };
  }
  if ((mode === "phone-required" || mode === "both-required") && !phoneE164) {
    return { ok: false, status: 400, error: "Valid US mobile number required" };
  }
  if (!email && !phoneE164) {
    return { ok: false, status: 400, error: "An email or mobile number is required" };
  }

  const smsConsentGiven =
    form.smsConsentEnabled &&
    phoneE164 != null &&
    (input.values.smsConsent === true || input.values.smsConsent === "true");

  if (email) {
    const [local, global] = await Promise.all([
      prisma.suppressionEntry.findUnique({
        where: { workspaceId_email: { workspaceId: form.workspaceId, email } },
      }),
      prisma.globalSuppression.findUnique({ where: { email } }),
    ]);
    const existing = await prisma.contact.findUnique({
      where: { workspaceId_email: { workspaceId: form.workspaceId, email } },
      select: { status: true },
    });
    const decision = emailRejoinDecision({
      localReason: local?.reason ?? null,
      globallySuppressed: Boolean(global),
      contactStatus: existing?.status ?? null,
    });
    if (decision === "silent") return { ok: true, pendingConfirm: false, stored: false };
  }

  const owner = await getWorkspaceOwner(form.workspaceId);
  const count = await prisma.contact.count({ where: { workspaceId: form.workspaceId } });
  const contactCap = numericCap(
    softwareQuotas({
      isInternal: form.workspace.isInternal,
      disabled: Boolean(form.workspace.disabledAt),
      plan: owner.plan,
    }).contactCap
  );
  if (count >= contactCap) return { ok: false, status: 503, error: "This list is full" };

  const firstName = enabled.has("firstName") ? String(input.values.firstName || "").trim() || null : null;
  const lastName = enabled.has("lastName") ? String(input.values.lastName || "").trim() || null : null;
  const company = enabled.has("company") ? String(input.values.company || "").trim() || null : null;
  const zip = enabled.has("zip") ? String(input.values.zip || "").trim() || null : null;

  const source = input.test ? `form:${form.hostedSlug}:test` : `form:${form.hostedSlug}`;
  const pageUrl = sanitizeHttpUrl(input.attribution?.pageUrl);
  const referrer = sanitizeHttpUrl(input.attribution?.referrer);
  const evidence = {
    formId: form.id,
    formSlug: form.hostedSlug,
    pageUrl,
    referrer,
    utmSource: sanitizeUtm(input.attribution?.utmSource),
    utmMedium: sanitizeUtm(input.attribution?.utmMedium),
    utmCampaign: sanitizeUtm(input.attribution?.utmCampaign),
    ip: input.ip,
    userAgent: input.userAgent?.slice(0, 200) || null,
    consentText: email ? emailConsentText(form.workspace.name) : null,
    test: Boolean(input.test),
  };

  const tagIds = (Array.isArray(form.tagIds) ? form.tagIds : []) as string[];
  const status = email && form.doubleOptIn ? "PENDING_CONFIRM" : "SUBSCRIBED";
  const confirmToken = email && form.doubleOptIn ? randomToken(24) : null;

  let smsData: {
    smsStatus?: "NOT_PROVIDED" | "SUBSCRIBED" | "OPTED_OUT";
    smsConsentAt?: Date | null;
    smsConsentSource?: string | null;
    smsConsentDisclosureVersion?: string | null;
  } = {};
  if (phoneE164 && !smsConsentGiven) {
    smsData = { smsStatus: "NOT_PROVIDED" };
  } else if (phoneE164 && smsConsentGiven) {
    const suppressed = await isSmsSuppressed(form.workspaceId, phoneE164);
    const optIn = applyOptIn({
      currentStatus: "NOT_PROVIDED",
      source,
      disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
      suppressed,
      documentedNewOptIn: true,
    });
    if (optIn.accepted) {
      smsData = {
        smsStatus: "SUBSCRIBED",
        smsConsentAt: new Date(),
        smsConsentSource: source,
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
      smsData = { smsStatus: "NOT_PROVIDED" };
    }
  }

  const match = await matchExistingContact(form.workspaceId, { email, phoneE164 });
  if (match.kind === "conflict") {
    await recordIntakeConflict(form.workspaceId, match, source);
    return { ok: true, pendingConfirm: false, stored: false };
  }

  const localSuppression = email
    ? await prisma.suppressionEntry.findUnique({
        where: { workspaceId_email: { workspaceId: form.workspaceId, email } },
      })
    : null;
  const reopt = localSuppression?.reason === "UNSUBSCRIBED";

  try {
    const upsertWhere = email
      ? { workspaceId_email: { workspaceId: form.workspaceId, email } }
      : { workspaceId_phoneE164: { workspaceId: form.workspaceId, phoneE164: phoneE164! } };

    const existingContact = email
      ? await prisma.contact.findUnique({ where: upsertWhere, select: { customFields: true } })
      : phoneE164
        ? await prisma.contact.findUnique({
            where: { workspaceId_phoneE164: { workspaceId: form.workspaceId, phoneE164 } },
            select: { customFields: true },
          })
        : null;
    const priorCustom =
      existingContact?.customFields && typeof existingContact.customFields === "object"
        ? (existingContact.customFields as Record<string, string>)
        : {};
    const customFields = { ...priorCustom };
    if (zip) customFields.zip = zip;

    const contact = await prisma.contact.upsert({
      where: upsertWhere,
      create: {
        workspaceId: form.workspaceId,
        email,
        phoneE164,
        firstName,
        lastName,
        company,
        customFields,
        status,
        source,
        confirmToken,
        ...smsData,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      update: {
        ...(enabled.has("firstName") && firstName ? { firstName } : {}),
        ...(enabled.has("lastName") && lastName ? { lastName } : {}),
        ...(enabled.has("company") && company ? { company } : {}),
        customFields,
        ...(phoneE164 ? { phoneE164, ...(smsConsentGiven ? smsData : {}) } : {}),
        ...(email && form.doubleOptIn
          ? { status: "PENDING_CONFIRM" as const, confirmToken }
          : email
            ? { status: "SUBSCRIBED" as const, unsubscribedAt: null }
            : {}),
        source,
      },
    });

    if (reopt && email && !form.doubleOptIn) {
      await prisma.suppressionEntry.deleteMany({
        where: { workspaceId: form.workspaceId, email, reason: "UNSUBSCRIBED" },
      });
    }

    if (tagIds.length) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId) => ({ contactId: contact.id, tagId })),
        skipDuplicates: true,
      });
    }

    if (email) {
      await prisma.emailConsentEvent.create({
        data: {
          workspaceId: form.workspaceId,
          contactId: contact.id,
          formId: form.id,
          email,
          action: reopt ? "REOPT_IN" : "OPT_IN",
          source,
          disclosureVersion: form.emailDisclosureVersion || "email-consent-2026-10-10",
          evidence,
        },
      });
    }

    if (phoneE164 && smsData.smsStatus === "SUBSCRIBED") {
      await prisma.smsConsentEvent.create({
        data: {
          workspaceId: form.workspaceId,
          contactId: contact.id,
          phoneE164,
          action: "OPT_IN",
          source,
          disclosureVersion: SMS_CONSENT_DISCLOSURE_VERSION,
          evidence: {
            ...evidence,
            checkbox: true,
            consentText: buildSmsConsentDisclosure({ brandName: form.workspace.name }),
          },
        },
      });
    }

    if (!input.test) {
      await prisma.signupForm.update({
        where: { id: form.id },
        data: { submitCount: { increment: 1 } },
      });
    }

    if (email && form.doubleOptIn && confirmToken) {
      const jwt = await signToken(
        "form-confirm",
        { contactId: contact.id, workspaceId: form.workspaceId },
        "7d"
      );
      await sendDoubleOptInConfirmation(email, form.workspace.name, jwt);
    }

    return { ok: true, pendingConfirm: Boolean(email && form.doubleOptIn), stored: true, contactId: contact.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: true, pendingConfirm: false, stored: false };
    }
    throw error;
  }
}
