import { prisma } from "@/lib/prisma";
import { getApiContext, getSessionUser, type WorkspaceContext } from "@/lib/session";

/**
 * Platform owner gate for /admin APIs.
 * Role: OWNER_ADMIN (User.platformRole), or bootstrap via PLATFORM_OWNER_EMAIL / first user.
 */
export async function isOwnerAdminUser(user: {
  id: string;
  email: string;
  platformRole?: string | null;
}): Promise<boolean> {
  if (user.platformRole === "OWNER_ADMIN") return true;

  const configured = (process.env.PLATFORM_OWNER_EMAIL || "").trim().toLowerCase();
  if (configured && user.email.toLowerCase() === configured) {
    // Persist role so subsequent checks are explicit OWNER_ADMIN.
    await prisma.user
      .update({
        where: { id: user.id },
        data: { platformRole: "OWNER_ADMIN" },
      })
      .catch(() => null);
    return true;
  }

  const first = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first?.id === user.id) {
    await prisma.user
      .update({
        where: { id: user.id },
        data: { platformRole: "OWNER_ADMIN" },
      })
      .catch(() => null);
    return true;
  }
  return false;
}

export async function requirePlatformAdmin(): Promise<WorkspaceContext | null> {
  const ctx = await getApiContext();
  if (!ctx) return null;
  if (!(await isOwnerAdminUser(ctx.user))) return null;
  return ctx;
}

/** Session-only check (no workspace cookie required) for admin APIs that act cross-tenant. */
export async function requireOwnerAdminUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  platformRole: string;
} | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!(await isOwnerAdminUser(user))) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    platformRole: "OWNER_ADMIN",
  };
}
