import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(appUrl("/login?error=invalid-token"));

  const payload = await verifyToken("email-verify", token);
  if (!payload?.userId) {
    return NextResponse.redirect(appUrl("/login?error=invalid-token"));
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: { emailVerified: new Date() },
  }).catch(() => null);

  return NextResponse.redirect(appUrl("/login?verified=1"));
}
