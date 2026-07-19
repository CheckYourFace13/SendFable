import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { getSesDomainStatus } from "@/lib/ses-domains";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const identity = await prisma.senderIdentity.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id, type: "DOMAIN" },
  });
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = await getSesDomainStatus(identity.value);
  if (status !== identity.status) {
    await prisma.senderIdentity.update({
      where: { id: identity.id },
      data: {
        status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
      },
    });
    // Domain verified → any pending address at that domain gains full
    // alignment; auto-verify those addresses.
    if (status === "VERIFIED") {
      await prisma.senderIdentity.updateMany({
        where: {
          workspaceId: ctx.workspace.id,
          type: "ADDRESS",
          status: "PENDING",
          value: { endsWith: `@${identity.value}` },
        },
        data: { status: "VERIFIED", verifiedAt: new Date(), verificationToken: null },
      });
    }
  }

  return NextResponse.json({ status });
}
