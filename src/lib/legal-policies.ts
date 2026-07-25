/**
 * Canonical public policy versions for SendFable.
 * Bump CURRENT_POLICY_BUNDLE when shipping material legal changes so
 * existing accounts see the soft reacceptance prompt.
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
export const POLICY_LAST_UPDATED = "July 25, 2026";

/** ISO date string used in acceptance records and UI checks. */
export const CURRENT_POLICY_BUNDLE = "2026-07-25";

export const POLICY_VERSIONS = {
  terms: "2026-07-25",
  privacy: "2026-07-25",
  acceptableUse: "2026-07-25",
  refund: "2026-07-25",
  security: "2026-07-25",
  cookies: "2026-07-25",
} as const;

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
 * Owner confirmation still required before naming a specific state.
 * Do not invent a governing-law jurisdiction.
 */
export const GOVERNING_LAW_STATUS =
  "OWNER_CONFIRMATION_REQUIRED" as const;
