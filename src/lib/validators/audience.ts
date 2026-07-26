import { z } from "zod";

export const contactCreateSchema = z
  .object({
    email: z.string().email().max(254).optional().nullable(),
    /** Raw phone input; normalized to US E.164 server-side */
    phone: z.string().trim().max(30).optional().nullable(),
    firstName: z.string().trim().max(100).optional().nullable(),
    lastName: z.string().trim().max(100).optional().nullable(),
    company: z.string().trim().max(160).optional().nullable(),
    customFields: z.record(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    source: z.string().max(80).optional(),
    /** Explicit SMS marketing consent (never implied by phone presence) */
    smsConsent: z.boolean().optional(),
    smsConsentSource: z.string().max(120).optional(),
  })
  .refine((v) => !!(v.email?.trim() || v.phone?.trim()), {
    message: "An email or mobile number is required",
  });

export const importContactStatusSchema = z.enum([
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINED",
  "PENDING_CONFIRM",
]);

export const importContactSchema = z
  .object({
    email: z.string().email().max(254).optional().nullable(),
    /** Raw phone input; normalized to US E.164 server-side */
    phone: z.string().trim().max(30).optional().nullable(),
    firstName: z.string().trim().max(100).optional().nullable(),
    lastName: z.string().trim().max(100).optional().nullable(),
    customFields: z.record(z.string()).optional(),
    tagNames: z.array(z.string().max(60)).optional(),
    status: importContactStatusSchema.optional(),
    /** Row-level explicit SMS consent evidence from the CSV */
    smsConsent: z.boolean().optional(),
    smsConsentDate: z.string().max(40).optional(),
  })
  .refine((v) => !!(v.email?.trim() || v.phone?.trim()), {
    message: "Each row needs an email or a phone",
  });

export const importSchema = z.object({
  contacts: z.array(importContactSchema).min(1).max(50_000),
  source: z.string().max(80).optional(),
  confirmPurchasedListsPolicy: z.boolean().optional(),
  /** Competitor migration source — stored on contact.source when set. */
  provider: z
    .enum(["mailchimp", "constant-contact", "brevo", "mailerlite", "kit", "generic"])
    .optional(),
  /** Preview-only: return counts without writing. */
  dryRun: z.boolean().optional(),
  /**
   * SMS consent for the whole batch. Imported phones are NEVER auto-subscribed:
   * "none" (default) stores phones without SMS permission;
   * "explicit-fields" honors row-level smsConsent columns;
   * "documented-source" / "owner-attestation" require source/date/attestation.
   */
  smsConsentMode: z
    .enum(["none", "explicit-fields", "documented-source", "owner-attestation"])
    .optional(),
  smsConsentSource: z.string().max(200).optional(),
  smsConsentDate: z.string().max(40).optional(),
  ownerAttestation: z.string().max(2000).optional(),
});

export const bulkActionSchema = z.object({
  action: z.enum(["tag", "untag", "unsubscribe", "delete"]),
  contactIds: z.array(z.string()).min(1).max(5_000),
  tagId: z.string().optional(),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const segmentConditionSchema = z.object({
  field: z.string().min(1).max(80),
  operator: z.enum([
    "eq",
    "neq",
    "contains",
    "not_contains",
    "starts_with",
    "is_set",
    "is_empty",
    "in",
  ]),
  value: z.string().max(500).optional(),
});

export const segmentRulesSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(segmentConditionSchema).max(50),
});

export const segmentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  rules: segmentRulesSchema,
});
