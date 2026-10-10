/** Cookie set while OWNER_ADMIN is viewing another workspace as a customer. */
export const ADMIN_VIEW_COOKIE = "sf_admin_view";

export type AdminViewPayload = {
  workspaceId: string;
  workspaceName: string;
  startedAt: string;
};
