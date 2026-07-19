import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      emailVerified: true,
      sendingHeldAt: true,
      flaggedAt: true,
      monthlySendCount: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          workspace: {
            select: {
              id: true,
              name: true,
              _count: { select: { contacts: true, campaigns: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ users });
}
