/**
 * Canonical public policy versions for SendFable.
 * Bump CURRENT_POLICY_BUNDLE when shipping material legal changes so
 * existing accounts see the soft reacceptance prompt.
 * Historical PolicyAcceptance rows are preserved; only the current bundle
 * is used for soft reacceptance prompts.
 */
export const LEGAL_OPERATOR_NAME = "iScream Studio INC";

/** Product brand — not a verified DBA/assumed name as of this version. */
export const PRODUCT_NAME = "SendFable";

/**
 * Treatment B (no verified DBA): SendFable is a service operated by
 * iScream Studio INC. Do not claim “d/b/a SendFable” until registration
 * is confirmed by the owner.
 */
export const LEGAL_OPERATOR_STATEMENT =
  "SendFable is a service operated by iScream Studio INC";

export const POLICY_EFFECTIVE_DATE = "July 25, 2026";
export const POLICY_LAST_UPDATED = "July 26, 2026";

/** ISO date string used in acceptance records and UI checks. */
export const CURRENT_POLICY_BUNDLE = "2026-07-26";

export const POLICY_VERSIONS = {
  terms: "2026-07-26",
  privacy: "2026-07-26",
  acceptableUse: "2026-07-26",
  refund: "2026-07-26",
  security: "2026-07-26",
  cookies: "2026-07-26",
} as const;

/**
 * Customer-facing refund posture (owner-approved 2026-07-26).
 * Do not broaden beyond this text in Checkout, billing UI, or support copy.
 */
export const REFUND_POSTURE_SUMMARY =
  "A customer may request a refund of their first paid subscription charge within 14 days. Refunds are generally approved when the account has not sent a live campaign or materially used the paid service. Renewal refund requests submitted within seven days may be considered when no campaigns were sent after renewal. Duplicate or erroneous charges will be corrected, and legally required refunds will be honored. Accounts suspended or terminated for abuse are not eligible for discretionary refunds where permitted by law.";

export type PolicyKind = keyof typeof POLICY_VERSIONS;

export const PUBLIC_MAILBOXES = {
  support: "support@sendfable.com",
  legal: "legal@sendfable.com",
  privacy: "privacy@sendfable.com",
  abuse: "abuse@sendfable.com",
  security: "security@sendfable.com",
} as const;

export const POLICY_PATHS = {
  terms: "/terms",
  privacy: "/privacy",
  acceptableUse: "/acceptable-use",
  refund: "/refund-policy",
  security: "/security",
  cookies: "/cookies",
  contact: "/contact",
} as const;

/**
 * Illinois was requested by the owner but could not be verified from project
 * records or live Stripe company address (state null). Do not invent a
 * governing-law jurisdiction until the owner supplies ILSOS / formation proof.
 */
export const GOVERNING_LAW_STATUS =
  "OWNER_CONFIRMATION_REQUIRED" as const;

/** Exact proof still needed before deploying Illinois (or any) governing law. */
export const GOVERNING_LAW_PROOF_NEEDED =
  "Illinois Secretary of State Business Entity Search File Detail Report (or Certificate of Good Standing) for iScream Studio INC showing Illinois as jurisdiction of organization/incorporation/registration, including file number and status; or equivalent formation documents.";
