/**
 * Machine-to-machine auth for first-party integrations (e.g. BoatingChicago).
 * Accepts INTEGRATION_API_SECRET (+ INTEGRATION_WORKSPACE_ID) and/or
 * INTEGRATION_CREDENTIALS_JSON: [{ "workspaceId": "...", "secret": "..." }, ...].
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

type CredEntry = { workspaceId: string; secret: string };

function parseCredentialsJson(): CredEntry[] {
  const raw = process.env.INTEGRATION_CREDENTIALS_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: CredEntry[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const workspaceId = String(
        (row as { workspaceId?: string; workspace_id?: string }).workspaceId ||
          (row as { workspace_id?: string }).workspace_id ||
          ""
      ).trim();
      const secret = String(
        (row as { secret?: string; apiSecret?: string }).secret ||
          (row as { apiSecret?: string }).apiSecret ||
          ""
      ).trim();
      if (workspaceId && secret) out.push({ workspaceId, secret });
    }
    return out;
  } catch {
    return [];
  }
}

/** Resolve workspace id for a bearer secret, or null if unauthorized. */
export function resolveIntegrationWorkspaceId(bearer: string): string | null {
  if (!bearer) return null;

  const legacySecret = getIntegrationSecret();
  const legacyWorkspaceId = getIntegrationWorkspaceId();
  if (legacySecret && legacyWorkspaceId && timingSafeEqual(bearer, legacySecret)) {
    return legacyWorkspaceId;
  }

  for (const entry of parseCredentialsJson()) {
    if (timingSafeEqual(bearer, entry.secret)) return entry.workspaceId;
  }
  return null;
}

export async function requireIntegrationAuth(
  req: Request
): Promise<IntegrationContext | NextResponse> {
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const workspaceId = resolveIntegrationWorkspaceId(bearer);

  if (!workspaceId) {
    const configured =
      Boolean(getIntegrationSecret() && getIntegrationWorkspaceId()) ||
      parseCredentialsJson().length > 0;
    if (!configured) {
      return NextResponse.json(
        { error: "Integration API is not configured" },
        { status: 503 }
      );
    }
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
