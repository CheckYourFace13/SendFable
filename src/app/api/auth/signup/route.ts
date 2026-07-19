import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/tokens";
import { sendEmailVerification } from "@/lib/transactional";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  workspaceName: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const rl = await rateLimit("auth", clientIp(req), RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowSec);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const workspaceName = parsed.data.workspaceName || `${parsed.data.name}'s workspace`;

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          workspace: { create: { name: workspaceName } },
        },
      },
    },
  });

  const token = await signToken("email-verify", { userId: user.id, email }, "24h");
  await sendEmailVerification(email, token);

  return NextResponse.json({ ok: true });
}
