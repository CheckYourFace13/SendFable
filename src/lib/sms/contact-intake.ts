/**
 * Unified contact intake: identifier validation, deduplication and
 * split-identity conflict detection for forms, manual creation and CSV import.
 *
 * Rules:
 *  - a contact needs at least one of (email, phoneE164);
 *  - a matching normalized email MAY identify an existing contact;
 *  - a matching phoneE164 MAY identify an existing contact;
 *  - when email matches contact A and phone matches a DIFFERENT contact B,
 *    never auto-merge — surface a conflict for manual resolution;
 *  - a reimported opted-out number stays opted out (SmsSuppression survives
 *    deletion/reimport); only a documented new opt-in restores permission.
 */

import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import { normalizeUsPhone } from "@/lib/sms/phone";

export interface IntakeIdentifiers {
  email: string | null;
  phoneE164: string | null;
}

export interface IntakeValidation {
  ok: boolean;
  error?: string;
  email: string | null;
  phoneE164: string | null;
  phoneInvalid?: boolean;
}

/** Normalize + validate identifiers. At least one must be present and valid. */
export function validateIntakeIdentifiers(
  rawEmail: string | null | undefined,
  rawPhone: string | null | undefined
): IntakeValidation {
  const emailTrim = (rawEmail ?? "").trim();
  const phoneTrim = (rawPhone ?? "").trim();

  let email: string | null = null;
  if (emailTrim) {
    const normalized = normalizeEmail(emailTrim);
    if (!isValidEmail(normalized)) {
      return { ok: false, error: "Invalid email", email: null, phoneE164: null };
    }
    email = normalized;
  }

  let phoneE164: string | null = null;
  let phoneInvalid = false;
  if (phoneTrim) {
    const parsed = normalizeUsPhone(phoneTrim);
    if (!parsed) phoneInvalid = true;
    else phoneE164 = parsed.e164;
  }

  if (!email && !phoneE164) {
    return {
      ok: false,
      error: phoneInvalid
        ? "A valid email or US mobile number is required"
        : "An email or mobile number is required",
      email: null,
      phoneE164: null,
      phoneInvalid,
    };
  }
  return { ok: true, email, phoneE164, phoneInvalid };
}

export type IntakeMatch =
  | { kind: "new" }
  | { kind: "existing"; contactId: string; matchedBy: "email" | "phone" | "both" }
  | { kind: "conflict"; emailContactId: string; phoneContactId: string };

/** Resolve which existing contact (if any) these identifiers belong to. */
export async function matchExistingContact(
  workspaceId: string,
  ids: IntakeIdentifiers
): Promise<IntakeMatch> {
  const [byEmail, byPhone] = await Promise.all([
    ids.email
      ? prisma.contact.findUnique({
          where: { workspaceId_email: { workspaceId, email: ids.email } },
          select: { id: true },
        })
      : Promise.resolve(null),
    ids.phoneE164
      ? prisma.contact.findUnique({
          where: { workspaceId_phoneE164: { workspaceId, phoneE164: ids.phoneE164 } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (byEmail && byPhone) {
    if (byEmail.id === byPhone.id) return { kind: "existing", contactId: byEmail.id, matchedBy: "both" };
    return { kind: "conflict", emailContactId: byEmail.id, phoneContactId: byPhone.id };
  }
  if (byEmail) return { kind: "existing", contactId: byEmail.id, matchedBy: "email" };
  if (byPhone) return { kind: "existing", contactId: byPhone.id, matchedBy: "phone" };
  return { kind: "new" };
}

/** Is this number suppressed (STOP) for the workspace? Survives reimports. */
export async function isSmsSuppressed(workspaceId: string, phoneE164: string): Promise<boolean> {
  const row = await prisma.smsSuppression.findUnique({
    where: { workspaceId_phoneE164: { workspaceId, phoneE164 } },
  });
  return !!row;
}

/**
 * Record a split-identity conflict for the manual conflict-resolution flow.
 * Permission history, tags and activity are preserved because nothing merges
 * automatically — resolution happens explicitly in the UI (audit-logged).
 */
export async function recordIntakeConflict(
  workspaceId: string,
  conflict: { emailContactId: string; phoneContactId: string },
  source: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      workspaceId,
      action: "contact.intake-conflict",
      targetType: "contact",
      targetId: conflict.emailContactId,
      meta: {
        emailContactId: conflict.emailContactId,
        phoneContactId: conflict.phoneContactId,
        source,
        resolution: "pending",
      },
    },
  });
}
