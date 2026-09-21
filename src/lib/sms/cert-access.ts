/**
 * Controlled SMS certification access — workspace allowlist.
 * Keeps PUBLIC=false and ACCOUNT_SIGNUP=false for the general public while
 * letting one (or few) explicit workspace IDs exercise customer SMS surfaces.
 */

export function smsCertWorkspaceIds(): string[] {
  const raw = process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS?.trim() || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isSmsCertWorkspace(workspaceId: string): boolean {
  if (!workspaceId) return false;
  return smsCertWorkspaceIds().includes(workspaceId);
}
