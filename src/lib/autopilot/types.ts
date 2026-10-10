export type AutopilotFrequency = "DAILY" | "TWICE_DAILY" | "WEEKLY";

export type AutopilotDraftStatus =
  | "DETECTED"
  | "DRAFTED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EDITING"
  | "SENT"
  | "EXPIRED";

export type AutopilotAction = "approve" | "reject" | "edit";

/** Kept for older references. Waiting drafts are not expired on this timer. */
export const AUTOPILOT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTOPILOT_REMINDER_AFTER_MS = 48 * 60 * 60 * 1000;
export const AUTOPILOT_MAX_GENERATIONS_PER_DAY = 5;
export const AUTOPILOT_MAX_CHANGED_CHARS = 8_000;
export const AUTOPILOT_MAX_BODY_CHARS = 2_400;

/** Frequency → minimum ms between fetches */
export const FREQUENCY_INTERVAL_MS: Record<AutopilotFrequency, number> = {
  TWICE_DAILY: 12 * 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};
