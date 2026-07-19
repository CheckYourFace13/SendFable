import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function GET(req: Request) {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const format = url.searchParams.get("format");

  const leads = await prisma.earlyAccessLead.findMany({
    where: status ? { inviteStatus: status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  if (format === "csv") {
    const header = [
      "email",
      "firstName",
      "businessName",
      "website",
      "contactCountApprox",
      "currentPlatform",
      "mainGoal",
      "inviteStatus",
      "source",
      "consentAt",
      "createdAt",
    ];
    const rows = leads.map((l) =>
      [
        l.email,
        l.firstName || "",
        l.businessName || "",
        l.website || "",
        l.contactCountApprox || "",
        l.currentPlatform || "",
        (l.mainGoal || "").replace(/"/g, '""'),
        l.inviteStatus,
        l.source,
        l.consentAt.toISOString(),
        l.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v)}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="early-access-leads.csv"',
      },
    });
  }

  return NextResponse.json({ leads });
}

const patchSchema = z.object({
  id: z.string(),
  notes: z.string().max(5000).optional().nullable(),
  inviteStatus: z.enum(["NEW", "CONTACTED", "INVITED", "DECLINED"]).optional(),
});

export async function PATCH(req: Request) {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const lead = await prisma.earlyAccessLead.update({
    where: { id: parsed.data.id },
    data: {
      notes: parsed.data.notes === undefined ? undefined : parsed.data.notes,
      inviteStatus: parsed.data.inviteStatus,
    },
  });
  return NextResponse.json({ lead });
}
