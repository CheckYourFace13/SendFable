import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { signToken } from "@/lib/tokens";
import { sendEmailVerification } from "@/lib/transactional";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, already: true });

  const rl = await rateLimit("auth", clientIp(req), RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowSec);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const token = await signToken("email-verify", { userId: user.id, email: user.email }, "24h");
  await sendEmailVerification(user.email, token);
  return NextResponse.json({ ok: true });
}
