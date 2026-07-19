import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Membership, User, Workspace } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const WORKSPACE_COOKIE = "sf_workspace";

export const getSessionUser = cache(async (): Promise<User | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export interface WorkspaceContext {
  user: User;
  workspace: Workspace;
  membership: Membership;
}

async function resolveWorkspace(user: User): Promise<{ workspace: Workspace; membership: Membership } | null> {
  const preferred = cookies().get(WORKSPACE_COOKIE)?.value;
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;
  const chosen =
    (preferred && memberships.find((m) => m.workspaceId === preferred)) ||
    memberships[0];
  const { workspace, ...membership } = chosen;
  return { workspace, membership };
}

/** Server-component guard: session + workspace, or redirect. */
export const requireWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  const user = await requireUser();
  const resolved = await resolveWorkspace(user);
  if (!resolved) redirect("/login");
  return { user, ...resolved };
});

/** API-route guard: returns null instead of redirecting. */
export const getApiContext = cache(async (): Promise<WorkspaceContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const resolved = await resolveWorkspace(user);
  if (!resolved) return null;
  return { user, ...resolved };
});

/** The plan that governs a workspace is its OWNER's plan. */
export async function getWorkspaceOwner(workspaceId: string): Promise<User> {
  const ownerMembership = await prisma.membership.findFirst({
    where: { workspaceId, role: "OWNER" },
    include: { user: true },
  });
  if (!ownerMembership) throw new Error(`Workspace ${workspaceId} has no owner`);
  return ownerMembership.user;
}
