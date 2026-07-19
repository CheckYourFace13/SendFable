import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { tagSchema } from "@/lib/validators/audience";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tags = await prisma.tag.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { contacts: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ tags });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = tagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        workspaceId: ctx.workspace.id,
        name: parsed.data.name,
        color: parsed.data.color ?? "#4F46E5",
      },
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }
    throw e;
  }
}
