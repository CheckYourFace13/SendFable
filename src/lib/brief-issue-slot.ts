/**
 * Canonical America/Chicago weekly Brief issue-slot key.
 * One key per Thursday calendar date in Chicago — used for atomic uniqueness.
 */

const TZ = "America/Chicago";

/** YYYY-MM-DD in America/Chicago for an instant. */
export function chicagoDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Issue slot for a scheduled Brief send.
 * Format: brief:America/Chicago:YYYY-MM-DD (Thursday of scheduledAt in CT).
 */
export function briefIssueSlotKey(scheduledAt: Date): string {
  return `brief:America/Chicago:${chicagoDateKey(scheduledAt)}`;
}

/** IntegrationIdempotency.key for a Brief issue slot. */
export function briefIssueIdempotencyKey(scheduledAt: Date): string {
  return `brief-issue:${chicagoDateKey(scheduledAt)}`;
}

const ACTIVE_SLOT_STATUSES = [
  "SCHEDULED",
  "SENDING",
  "PAUSED",
  "COMPLETED",
] as const;

export type ActiveSlotStatus = (typeof ACTIVE_SLOT_STATUSES)[number];

export function isActiveBriefSlotStatus(status: string): boolean {
  return (ACTIVE_SLOT_STATUSES as readonly string[]).includes(status);
}

/** Statuses that free the slot for a replacement issue (safe recovery). */
export function isRecoverableBriefSlotStatus(status: string): boolean {
  return status === "FAILED" || status === "CANCELLED" || status === "DRAFT";
}
