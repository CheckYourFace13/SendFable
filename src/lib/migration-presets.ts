/** Column-mapping presets for competitor CSV exports. */

export type MigrationProvider =
  | "mailchimp"
  | "constant-contact"
  | "brevo"
  | "mailerlite"
  | "kit"
  | "generic";

export type MigrationField =
  | "email"
  | "firstName"
  | "lastName"
  | "status"
  | "tag"
  | "skip";

export interface MigrationPreset {
  id: MigrationProvider;
  label: string;
  description: string;
  /** Header substrings (lowercase) → field. First match wins per column. */
  columnHints: Array<{ match: string | RegExp; field: MigrationField }>;
  /** How to interpret status cell values → ContactStatus-ish. */
  statusMap: Record<string, "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "PENDING_CONFIRM">;
}

export const MIGRATION_PRESETS: Record<MigrationProvider, MigrationPreset> = {
  mailchimp: {
    id: "mailchimp",
    label: "Mailchimp",
    description: "Audience export CSV (Email Address, First Name, Last Name, STATUS).",
    columnHints: [
      { match: /^email address$/i, field: "email" },
      { match: /^email$/i, field: "email" },
      { match: /e-?mail/, field: "email" },
      { match: /^first name$/i, field: "firstName" },
      { match: /first/, field: "firstName" },
      { match: /^last name$/i, field: "lastName" },
      { match: /last/, field: "lastName" },
      { match: /^status$/i, field: "status" },
      { match: /member.?status|subscription.?status/, field: "status" },
      { match: /tag|group/, field: "tag" },
    ],
    statusMap: {
      subscribed: "SUBSCRIBED",
      pending: "PENDING_CONFIRM",
      unsubscribed: "UNSUBSCRIBED",
      cleaned: "BOUNCED",
      transactional: "SUBSCRIBED",
      archived: "UNSUBSCRIBED",
    },
  },
  "constant-contact": {
    id: "constant-contact",
    label: "Constant Contact",
    description: "Contacts export (Email address, First name, Last name, Contact status).",
    columnHints: [
      { match: /email/, field: "email" },
      { match: /first/, field: "firstName" },
      { match: /last/, field: "lastName" },
      { match: /contact.?status|status/, field: "status" },
      { match: /list|tag/, field: "tag" },
    ],
    statusMap: {
      active: "SUBSCRIBED",
      unsubscribed: "UNSUBSCRIBED",
      "not actively engaged": "SUBSCRIBED",
      removed: "UNSUBSCRIBED",
      bounced: "BOUNCED",
      "do not mail": "UNSUBSCRIBED",
    },
  },
  brevo: {
    id: "brevo",
    label: "Brevo",
    description: "Contact export (EMAIL, FIRSTNAME, LASTNAME, BLACKLIST / email_blacklisted).",
    columnHints: [
      { match: /^email$/i, field: "email" },
      { match: /e-?mail/, field: "email" },
      { match: /firstname|first.?name/, field: "firstName" },
      { match: /lastname|last.?name/, field: "lastName" },
      { match: /blacklist|blacklisted|email_blacklisted/, field: "status" },
      { match: /tag|list/, field: "tag" },
    ],
    statusMap: {
      "0": "SUBSCRIBED",
      "1": "UNSUBSCRIBED",
      false: "SUBSCRIBED",
      true: "UNSUBSCRIBED",
      no: "SUBSCRIBED",
      yes: "UNSUBSCRIBED",
      subscribed: "SUBSCRIBED",
      unsubscribed: "UNSUBSCRIBED",
      blacklisted: "UNSUBSCRIBED",
    },
  },
  mailerlite: {
    id: "mailerlite",
    label: "MailerLite",
    description: "Subscriber export (email, name, last_name, status).",
    columnHints: [
      { match: /^email$/i, field: "email" },
      { match: /e-?mail/, field: "email" },
      { match: /^name$/i, field: "firstName" },
      { match: /first/, field: "firstName" },
      { match: /last/, field: "lastName" },
      { match: /^status$/i, field: "status" },
      { match: /group|tag/, field: "tag" },
    ],
    statusMap: {
      active: "SUBSCRIBED",
      unsubscribed: "UNSUBSCRIBED",
      bounced: "BOUNCED",
      junk: "COMPLAINED",
      unconfirmed: "PENDING_CONFIRM",
    },
  },
  kit: {
    id: "kit",
    label: "Kit (ConvertKit)",
    description: "Subscriber export (Email Address, First Name, Status).",
    columnHints: [
      { match: /email/, field: "email" },
      { match: /first/, field: "firstName" },
      { match: /last/, field: "lastName" },
      { match: /^status$/i, field: "status" },
      { match: /state/, field: "status" },
      { match: /tag/, field: "tag" },
    ],
    statusMap: {
      active: "SUBSCRIBED",
      inactive: "UNSUBSCRIBED",
      cancelled: "UNSUBSCRIBED",
      bounced: "BOUNCED",
      complained: "COMPLAINED",
      confirmed: "SUBSCRIBED",
    },
  },
  generic: {
    id: "generic",
    label: "Generic CSV",
    description: "Any CSV with email / first name / last name / status columns.",
    columnHints: [
      { match: /e-?mail/, field: "email" },
      { match: /first/, field: "firstName" },
      { match: /last/, field: "lastName" },
      { match: /status|subscribed|opt.?in/, field: "status" },
      { match: /tag|list|segment/, field: "tag" },
    ],
    statusMap: {
      subscribed: "SUBSCRIBED",
      active: "SUBSCRIBED",
      yes: "SUBSCRIBED",
      "1": "SUBSCRIBED",
      true: "SUBSCRIBED",
      unsubscribed: "UNSUBSCRIBED",
      inactive: "UNSUBSCRIBED",
      no: "UNSUBSCRIBED",
      "0": "UNSUBSCRIBED",
      false: "UNSUBSCRIBED",
      bounced: "BOUNCED",
      complained: "COMPLAINED",
      complaint: "COMPLAINED",
      pending: "PENDING_CONFIRM",
    },
  },
};

export const MIGRATION_PROVIDER_LIST = Object.values(MIGRATION_PRESETS);

const RESTRICTED_STATUSES = new Set<string>(["UNSUBSCRIBED", "BOUNCED", "COMPLAINED"]);

export type ImportContactStatus =
  | "SUBSCRIBED"
  | "UNSUBSCRIBED"
  | "BOUNCED"
  | "COMPLAINED"
  | "PENDING_CONFIRM";

/** Map a provider status cell to a ContactStatus. Defaults to SUBSCRIBED. */
export function mapProviderStatus(
  provider: MigrationProvider,
  raw: string | null | undefined
): ImportContactStatus {
  if (raw == null || !String(raw).trim()) return "SUBSCRIBED";
  const key = String(raw).trim().toLowerCase();
  const preset = MIGRATION_PRESETS[provider] ?? MIGRATION_PRESETS.generic;
  return preset.statusMap[key] ?? "SUBSCRIBED";
}

/**
 * Never upgrade a restricted status to subscribed (or pending).
 * Existing restricted status wins over an incoming subscribed/pending value.
 */
export function mergeContactStatus(
  existing: ImportContactStatus | null | undefined,
  incoming: ImportContactStatus
): ImportContactStatus {
  if (!existing) return incoming;
  if (RESTRICTED_STATUSES.has(existing)) {
    // Keep existing restricted status unless incoming is also restricted (prefer more severe later).
    if (!RESTRICTED_STATUSES.has(incoming)) {
      return existing;
    }
    // Prefer COMPLAINED > BOUNCED > UNSUBSCRIBED
    const rank: Record<string, number> = { UNSUBSCRIBED: 1, BOUNCED: 2, COMPLAINED: 3 };
    return (rank[incoming] ?? 0) >= (rank[existing] ?? 0) ? incoming : existing;
  }
  return incoming;
}

export function isRestrictedStatus(status: string): boolean {
  return RESTRICTED_STATUSES.has(status);
}

export type SuppressionReasonLike = "UNSUBSCRIBED" | "HARD_BOUNCE" | "COMPLAINT" | "MANUAL";

/** Contact status a suppression reason forces on import. */
export function statusForSuppressionReason(reason: SuppressionReasonLike | null | undefined): ImportContactStatus {
  switch (reason) {
    case "HARD_BOUNCE":
      return "BOUNCED";
    case "COMPLAINT":
      return "COMPLAINED";
    case "UNSUBSCRIBED":
    case "MANUAL":
    default:
      return "UNSUBSCRIBED";
  }
}

/**
 * Authoritative import status for one row:
 * suppression (global or workspace) overrides everything; existing restricted
 * status can never be upgraded; otherwise the incoming status applies.
 */
export function resolveImportStatus(opts: {
  existing: ImportContactStatus | null | undefined;
  incoming: ImportContactStatus;
  suppressionReason: SuppressionReasonLike | null | undefined;
  isSuppressed: boolean;
}): ImportContactStatus {
  const merged = mergeContactStatus(opts.existing ?? null, opts.incoming);
  if (!opts.isSuppressed) return merged;
  const forced = statusForSuppressionReason(opts.suppressionReason);
  // Keep the more severe of forced vs merged when both are restricted.
  if (RESTRICTED_STATUSES.has(merged)) {
    const rank: Record<string, number> = { UNSUBSCRIBED: 1, BOUNCED: 2, COMPLAINED: 3 };
    return (rank[merged] ?? 0) >= (rank[forced] ?? 0) ? merged : forced;
  }
  return forced;
}

/** Auto-map CSV headers using a provider preset. */
export function detectColumnMapping(
  headers: string[],
  provider: MigrationProvider
): Record<number, MigrationField> {
  const preset = MIGRATION_PRESETS[provider] ?? MIGRATION_PRESETS.generic;
  const mapping: Record<number, MigrationField> = {};
  const used = new Set<MigrationField>();

  headers.forEach((header, i) => {
    const h = String(header || "").trim();
    const lower = h.toLowerCase();
    let field: MigrationField = "skip";
    for (const hint of preset.columnHints) {
      const ok =
        typeof hint.match === "string"
          ? lower.includes(hint.match)
          : hint.match.test(h) || hint.match.test(lower);
      if (!ok) continue;
      // Prefer a single email/firstName/lastName/status column
      if (
        hint.field !== "tag" &&
        hint.field !== "skip" &&
        used.has(hint.field)
      ) {
        continue;
      }
      field = hint.field;
      break;
    }
    mapping[i] = field;
    if (field !== "skip" && field !== "tag") used.add(field);
  });

  return mapping;
}
