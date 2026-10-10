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

  const contact = await prisma.contact.findUnique({
    where: { id: payload.contactId },
    select: { id: true, email: true, workspaceId: true, status: true },
  });
  if (contact?.status === "PENDING_CONFIRM") {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: "SUBSCRIBED", confirmToken: null },
    });
    if (contact.email) {
      await prisma.suppressionEntry.deleteMany({
        where: { workspaceId: contact.workspaceId, email: contact.email, reason: "UNSUBSCRIBED" },
      });
    }
  }

  return NextResponse.redirect(appUrl("/f/confirmed"));
}
