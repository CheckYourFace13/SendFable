import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** The plan that governs a workspace is its OWNER's plan. */
export async function getWorkspaceOwner(workspaceId: string): Promise<User> {
  const ownerMembership = await prisma.membership.findFirst({
    where: { workspaceId, role: "OWNER" },
    include: { user: true },
  });
  if (!ownerMembership) throw new Error(`Workspace ${workspaceId} has no owner`);
  return ownerMembership.user;
}
