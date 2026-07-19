import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { signToken } from "@/lib/tokens";
import { sendSenderVerification } from "@/lib/transactional";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("auth", clientIp(req), RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowSec);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const identity = await prisma.senderIdentity.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id, type: "ADDRESS", status: "PENDING" },
  });
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = await signToken("sender-verify", { identityId: identity.id }, "7d");
  await prisma.senderIdentity.update({
    where: { id: identity.id },
    data: { verificationToken: token },
  });
  await sendSenderVerification(identity.value, token);

  return NextResponse.json({ ok: true });
}
