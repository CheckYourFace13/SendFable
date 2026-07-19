import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(appUrl("/?error=invalid-confirm"));
  }

  const payload = await verifyToken("form-confirm", token);
  if (!payload?.contactId) {
    return NextResponse.redirect(appUrl("/?error=invalid-confirm"));
  }

  await prisma.contact.updateMany({
    where: { id: payload.contactId, status: "PENDING_CONFIRM" },
    data: { status: "SUBSCRIBED", confirmToken: null },
  });

  return NextResponse.redirect(appUrl("/f/confirmed"));
}
