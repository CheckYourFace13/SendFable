import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { clientIp } from "@/lib/rate-limit";
import { recordPolicyAcceptance } from "@/lib/policy-acceptance";

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await recordPolicyAcceptance({
    userId: ctx.user.id,
    workspaceId: ctx.workspace.id,
    source: "reaccept",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({
    ok: true,
    acceptedAt: row.acceptedAt,
    policyBundleVersion: row.policyBundleVersion,
  });
}
