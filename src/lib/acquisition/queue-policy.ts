/**
 * Send-queue policy for Casey acquisition.
 * Current approved campaign is the Marketing Autopilot v1a/v1b pitch.
 * Stale initials are regenerated or retired; prospects are never deleted.
 * An initial is never sent twice.
 */

import { ACQUISITION_AUTOPILOT_LANDING } from "@/lib/acquisition/personalize";

export const WEBSITE_DEMO_COPY_VERSION = "personalized_website_demo";

/** Separate from Casey. Two new personalized-demo prospects per day. */
export const WEBSITE_DEMO_DAILY_NEW_LIMIT = 2;

/**
 * Live for a 2/day test after the image-relevance fix.
 * Env cannot raise this cap or turn the track off by accident.
 */
export function acquisitionWebsiteDemoEnabled(): boolean {
  return true;
}

export function websiteDemoSlotsLeft(sentToday: number, queued: number): number {
  if (!acquisitionWebsiteDemoEnabled()) return 0;
  return Math.max(0, WEBSITE_DEMO_DAILY_NEW_LIMIT - sentToday - queued);
}

export type QueueMessage = {
  step: string;
  subject: string;
  ctaPath?: string | null;
  copyVersion?: string | null;
  prospectId: string;
  createdAt: Date;
};

const SENT_INITIAL_STATUSES = ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] as const;
export { SENT_INITIAL_STATUSES };

export function isCurrentAutopilotInitial(msg: {
  step: string;
  subject: string;
  ctaPath?: string | null;
  copyVersion?: string | null;
}): boolean {
  if (msg.step !== "INITIAL") return false;
  if (msg.copyVersion === WEBSITE_DEMO_COPY_VERSION) return false;
  const path = (msg.ctaPath || "").split("?")[0].replace(/\/$/, "");
  if (path !== ACQUISITION_AUTOPILOT_LANDING) return false;
  const subject = msg.subject.trim();
  if (subject === "Could your website write your marketing emails?") return true;
  return /marketing mostly wrote itself\?$/.test(subject);
}

/** Stable 50/50 so a regenerated draft does not flip versions every tick. */
export function stableAutopilotVariant(prospectId: string): "v1a" | "v1b" {
  let h = 2166136261;
  for (let i = 0; i < prospectId.length; i++) {
    h ^= prospectId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2 === 0 ? "v1a" : "v1b";
}

export type StalePlan = "keep" | "regenerate" | "retire_duplicate";

export function planStaleInitial(
  msg: { step: string; subject: string; ctaPath?: string | null; copyVersion?: string | null },
  hasSentInitial: boolean
): StalePlan {
  if (msg.step !== "INITIAL") return "keep";
  if (msg.copyVersion === WEBSITE_DEMO_COPY_VERSION) return "keep";
  if (isCurrentAutopilotInitial(msg)) return "keep";
  if (hasSentInitial) return "retire_duplicate";
  return "regenerate";
}

/**
 * Current Autopilot initials first (oldest within that generation), then follow-ups.
 * Stale initials are excluded so they cannot occupy the send window.
 * One initial candidate per prospect.
 */
export function orderSendCandidates<T extends QueueMessage>(messages: T[]): T[] {
  const byAge = (a: T, b: T) => a.createdAt.getTime() - b.createdAt.getTime();
  const initials = messages.filter((m) => isCurrentAutopilotInitial(m)).sort(byAge);
  const followUps = messages
    .filter((m) => m.step === "FOLLOW_UP_1" || m.step === "FOLLOW_UP_2")
    .sort(byAge);

  const seen = new Set<string>();
  const out: T[] = [];
  for (const m of initials) {
    if (seen.has(m.prospectId)) continue;
    seen.add(m.prospectId);
    out.push(m);
  }
  out.push(...followUps);
  return out;
}

export type InitialTrack = "normal" | "personalized_website_demo";

/** A prospect gets one initial path. The demo track stays off until owner approval. */
export function chooseInitialTrack(demoQualityPasses: boolean): InitialTrack {
  if (acquisitionWebsiteDemoEnabled() && demoQualityPasses) return "personalized_website_demo";
  return "normal";
}
