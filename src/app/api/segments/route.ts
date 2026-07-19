import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { segmentSchema } from "@/lib/validators/audience";
import { countSegmentContacts, parseSegmentRules } from "@/lib/segments";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = await prisma.segment.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: "desc" },
  });

  const withCounts = await Promise.all(
    segments.map(async (s) => ({
      ...s,
      count: await countSegmentContacts(ctx.workspace.id, parseSegmentRules(s.rules)),
    }))
  );

  return NextResponse.json({ segments: withCounts });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = segmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const segment = await prisma.segment.create({
      data: {
        workspaceId: ctx.workspace.id,
        name: parsed.data.name,
        rules: parsed.data.rules,
      },
    });
    return NextResponse.json({ segment }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Segment name already exists" }, { status: 409 });
    }
    throw e;
  }
}
