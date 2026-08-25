import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
import { suppressProspect } from "@/lib/acquisition/suppression";
import { recordAcquisitionReply, type ReplyClass } from "@/lib/acquisition/lifecycle";
import { draftMessageForProspect } from "@/lib/acquisition/send";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = params;
  const prospect = await prisma.acquisitionProspect.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Mask email slightly in API logs isn't needed; admin only
  return NextResponse.json({ prospect });
}

const patchSchema = z.object({
  action: z.enum([
    "suppress",
    "pause",
    "approve",
    "mark_incorrect",
    "mark_converted",
    "mark_reply",
    "redraft",
  ]),
  replyClass: z
    .enum(["POSITIVE", "QUESTION", "NOT_NOW", "NOT_INTERESTED", "UNSUBSCRIBE", "OTHER"])
    .optional(),
  reason: z.string().max(200).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const prospect = await prisma.acquisitionProspect.findUnique({ where: { id } });
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (parsed.data.action) {
    case "suppress":
      await suppressProspect(id, "SUPPRESSED", parsed.data.reason || "owner_suppress");
      break;
    case "pause":
      await prisma.acquisitionProspect.update({
        where: { id },
        data: { status: "PAUSED", nextFollowUpAt: null },
      });
      await prisma.acquisitionMessage.updateMany({
        where: { prospectId: id, status: { in: ["DRAFT", "SCHEDULED"] } },
        data: { status: "CANCELLED" },
      });
      break;
    case "approve":
      await prisma.acquisitionProspect.update({
        where: { id },
        data: { ownerApproved: true },
      });
      break;
    case "mark_incorrect":
      await suppressProspect(id, "INCORRECT", "owner_incorrect");
      break;
    case "mark_converted":
      await prisma.acquisitionProspect.update({
        where: { id },
        data: { status: "SIGNED_UP", signupAt: new Date(), nextFollowUpAt: null },
      });
      await prisma.acquisitionMessage.updateMany({
        where: { prospectId: id, status: { in: ["DRAFT", "SCHEDULED"] } },
        data: { status: "CANCELLED" },
      });
      break;
    case "mark_reply":
      if (!parsed.data.replyClass) {
        return NextResponse.json({ error: "replyClass required" }, { status: 400 });
      }
      await recordAcquisitionReply({
        prospectId: id,
        replyClass: parsed.data.replyClass as ReplyClass,
      });
      break;
    case "redraft":
      await draftMessageForProspect(id, "INITIAL", { dryRun: true });
      break;
  }

  const updated = await prisma.acquisitionProspect.findUnique({
    where: { id },
    include: { messages: true },
  });
  return NextResponse.json({ ok: true, prospect: updated });
}
