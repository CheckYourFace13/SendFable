import type { Plan, User, Workspace } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WorkspaceEntitlement = {
  owner: User;
  /** Effective plan after INTERNAL PLAN OVERRIDE (if any). */
  plan: Plan;
  isInternal: boolean;
  internalPlanOverride: Plan | null;
  disabled: boolean;
  workspace: Pick<
    Workspace,
    "id" | "name" | "isInternal" | "internalPlanOverride" | "internalLabel" | "disabledAt"
  >;
};

/** The plan that governs a workspace is its OWNER's plan, unless an internal override applies. */
export async function getWorkspaceOwner(workspaceId: string): Promise<User> {
  const ent = await getWorkspaceEntitlement(workspaceId);
  // Call sites that only need plan/limits see the effective entitlement plan.
  if (ent.isInternal && ent.internalPlanOverride) {
    return {
      ...ent.owner,
      plan: ent.internalPlanOverride,
      // Internal workspaces never inherit Stripe payment-failed locks.
      paymentFailedAt: null,
    };
  }
  return ent.owner;
}

export async function getWorkspaceEntitlement(workspaceId: string): Promise<WorkspaceEntitlement> {
  const ownerMembership = await prisma.membership.findFirst({
    where: { workspaceId, role: "OWNER" },
    include: { user: true },
  });
  if (!ownerMembership) throw new Error(`Workspace ${workspaceId} has no owner`);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      isInternal: true,
      internalPlanOverride: true,
      internalLabel: true,
      disabledAt: true,
    },
  });

  const override =
    workspace.isInternal && workspace.internalPlanOverride
      ? workspace.internalPlanOverride
      : null;

  return {
    owner: ownerMembership.user,
    plan: override ?? ownerMembership.user.plan,
    isInternal: workspace.isInternal,
    internalPlanOverride: override,
    disabled: Boolean(workspace.disabledAt),
    workspace,
  };
}
