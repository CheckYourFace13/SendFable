import { formatScheduledWhen } from "@/lib/autopilot/schedule";

export type AutopilotReviewOutcome =
  | "open"
  | "scheduled"
  | "sent"
  | "rejected"
  | "editing"
  | "decided";

/** Map draft + campaign to the real post-decision state shown when a link is reopened. */
export function resolveAutopilotReviewOutcome(draft: {
  status: string;
  decidedAction: string | null;
  scheduledFor: Date | null;
  scheduleTimezone: string | null;
  campaign: { status: string; scheduledAt: Date | null } | null;
}): {
  outcome: Exclude<AutopilotReviewOutcome, "open">;
  scheduledLabel?: string;
} {
  const campaignStatus = draft.campaign?.status;
  if (campaignStatus === "COMPLETED" || campaignStatus === "SENDING") {
    return { outcome: "sent" };
  }
  if (campaignStatus === "SCHEDULED") {
    const at = draft.scheduledFor || draft.campaign?.scheduledAt;
    const tz = draft.scheduleTimezone || "UTC";
    return {
      outcome: "scheduled",
      scheduledLabel: at ? formatScheduledWhen(at, tz) : undefined,
    };
  }
  if (draft.status === "REJECTED" || draft.decidedAction === "REJECT") {
    return { outcome: "rejected" };
  }
  if (draft.status === "EDITING" || draft.decidedAction === "EDIT") {
    return { outcome: "editing" };
  }
  if (draft.status === "SENT" || draft.decidedAction === "SEND_NOW") {
    return { outcome: "sent" };
  }
  if (draft.status === "APPROVED" || draft.decidedAction === "SCHEDULE") {
    const at = draft.scheduledFor || draft.campaign?.scheduledAt;
    const tz = draft.scheduleTimezone || "UTC";
    return {
      outcome: "scheduled",
      scheduledLabel: at ? formatScheduledWhen(at, tz) : undefined,
    };
  }
  return { outcome: "decided" };
}
