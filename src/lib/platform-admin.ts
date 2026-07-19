import { prisma } from "@/lib/prisma";
import { getApiContext, type WorkspaceContext } from "@/lib/session";

/**
 * Platform owner gate for /admin APIs.
 * Allows: first registered user, or PLATFORM_OWNER_EMAIL match.
 */
export async function requirePlatformAdmin(): Promise<WorkspaceContext | null> {
  const ctx = await getApiContext();
  if (!ctx) return null;

  const configured = (process.env.PLATFORM_OWNER_EMAIL || "").trim().toLowerCase();
  if (configured && ctx.user.email.toLowerCase() === configured) {
    return ctx;
  }

  const first = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first?.id === ctx.user.id) return ctx;
  return null;
}
