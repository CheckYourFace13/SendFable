/**
 * Machine-to-machine auth for first-party integrations (e.g. BoatingChicago).
 * Bearer token must match INTEGRATION_API_SECRET and maps to INTEGRATION_WORKSPACE_ID.
 * Never log the secret or subscriber emails.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Workspace } from "@prisma/client";

export const BRIEF_AUDIENCE_TAG = "Chicago Boating Brief";

export interface IntegrationContext {
  workspace: Workspace;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function getIntegrationSecret(): string | null {
  return process.env.INTEGRATION_API_SECRET?.trim() || null;
}

export function getIntegrationWorkspaceId(): string | null {
  return process.env.INTEGRATION_WORKSPACE_ID?.trim() || null;
}

export async function requireIntegrationAuth(
  req: Request
): Promise<IntegrationContext | NextResponse> {
  const secret = getIntegrationSecret();
  const workspaceId = getIntegrationWorkspaceId();
  if (!secret || !workspaceId) {
    return NextResponse.json(
      { error: "Integration API is not configured" },
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!bearer || !timingSafeEqual(bearer, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return NextResponse.json({ error: "Integration workspace not found" }, { status: 503 });
  }

  return { workspace };
}

export async function ensureAudienceTag(workspaceId: string) {
  return prisma.tag.upsert({
    where: {
      workspaceId_name: { workspaceId, name: BRIEF_AUDIENCE_TAG },
    },
    create: {
      workspaceId,
      name: BRIEF_AUDIENCE_TAG,
      color: "#0B3D6B",
    },
    update: {},
  });
}
