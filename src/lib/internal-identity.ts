/**
 * Internal owner / operating-company identity that must never appear in
 * customer-facing or public surfaces. Private auth, PLATFORM_OWNER_EMAIL,
 * OWNER_ALERT_EMAIL, and internal docs may still use these values.
 */
const INTERNAL_EMAILS = new Set(
  [
    "chris@iscreamstudio.com",
    process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase(),
    process.env.OWNER_ALERT_EMAIL?.trim().toLowerCase(),
  ].filter(Boolean) as string[],
);

const INTERNAL_HOST_FRAGMENTS = ["iscreamstudio.com"];
const INTERNAL_NAME_FRAGMENTS = ["iscream studio", "iscreamstudio"];

export function isInternalOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return INTERNAL_EMAILS.has(email.trim().toLowerCase());
}

export function containsInternalOwnerIdentity(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (INTERNAL_EMAILS.has(lower.trim())) return true;
  if (INTERNAL_HOST_FRAGMENTS.some((h) => lower.includes(h))) return true;
  if (INTERNAL_NAME_FRAGMENTS.some((n) => lower.includes(n))) return true;
  return false;
}

/** Safe label for teammates who must not see the private owner mailbox. */
export const INTERNAL_OWNER_TEAM_LABEL = "Workspace owner";

export function redactInternalTeamUser<T extends { email: string; name?: string | null }>(
  user: T,
  viewerEmail: string,
): T {
  if (!isInternalOwnerEmail(user.email)) return user;
  if (user.email.trim().toLowerCase() === viewerEmail.trim().toLowerCase()) return user;
  return {
    ...user,
    email: INTERNAL_OWNER_TEAM_LABEL,
    name: user.name?.trim() ? INTERNAL_OWNER_TEAM_LABEL : INTERNAL_OWNER_TEAM_LABEL,
  };
}
