/** Owner-console visibility and route decisions. Authorization stays on the server. */

export const OWNER_ADMIN_HOME = "/admin/internal";

/** Footer Admin link renders only for the platform owner role. */
export function ownerAdminFooterVisible(platformRole: string | null | undefined): boolean {
  return platformRole === "OWNER_ADMIN";
}

export type AdminRouteAccess = "redirect_login" | "deny" | "allow";

/**
 * Unauthenticated visitors go to normal login.
 * Signed-in customers are denied.
 * OWNER_ADMIN is allowed.
 */
export function adminRouteAccess(input: {
  authenticated: boolean;
  platformRole: string | null | undefined;
}): AdminRouteAccess {
  if (!input.authenticated) return "redirect_login";
  if (input.platformRole !== "OWNER_ADMIN") return "deny";
  return "allow";
}

export function internalWorkspaceHealth(input: {
  disabled: boolean;
  sendingStatus: string | null;
  openIssues: number;
  failedCampaigns: number;
}): { ok: boolean; label: string } {
  const notes: string[] = [];
  if (input.disabled) notes.push("Disabled");
  if (!input.sendingStatus) notes.push("No sender");
  else if (input.sendingStatus !== "VERIFIED") notes.push(`Sender ${input.sendingStatus}`);
  if (input.failedCampaigns > 0) {
    notes.push(
      input.failedCampaigns === 1 ? "1 failed campaign" : `${input.failedCampaigns} failed campaigns`
    );
  }
  if (input.openIssues > 0) {
    notes.push(input.openIssues === 1 ? "1 note" : `${input.openIssues} notes`);
  }
  if (notes.length === 0) return { ok: true, label: "OK" };
  return { ok: false, label: notes.join(" · ") };
}
