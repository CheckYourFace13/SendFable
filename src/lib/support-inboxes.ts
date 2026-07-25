/**
 * Map public support topics to the live Sendfable mailbox that should receive them.
 * Used by /api/support and public copy.
 */
export const SUPPORT_INBOXES = {
  general: "support@sendfable.com",
  billing: "support@sendfable.com",
  privacy: "privacy@sendfable.com",
  abuse: "abuse@sendfable.com",
  security: "security@sendfable.com",
  legal: "legal@sendfable.com",
} as const;

export type SupportTopic = keyof typeof SUPPORT_INBOXES;

export function inboxForTopic(topic: string): string {
  if (topic in SUPPORT_INBOXES) {
    return SUPPORT_INBOXES[topic as SupportTopic];
  }
  return SUPPORT_INBOXES.general;
}
