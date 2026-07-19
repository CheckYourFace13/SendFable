import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { contactCreateSchema } from "@/lib/validators/audience";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import { PLANS } from "@/lib/plans";

export async function GET(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const tagId = url.searchParams.get("tagId") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));

  const where: Prisma.ContactWhereInput = { workspaceId: ctx.workspace.id };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as Prisma.EnumContactStatusFilter;
  if (tagId) where.tags = { some: { tagId } };

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ contacts, total, page, pageSize });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = contactCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const count = await prisma.contact.count({ where: { workspaceId: ctx.workspace.id } });
  if (count >= PLANS[owner.plan].contactCap) {
    return NextResponse.json(
      { error: "Contact cap reached for your plan", upgradeRequired: true },
      { status: 402 }
    );
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        workspaceId: ctx.workspace.id,
        email,
        firstName: parsed.data.firstName || null,
        lastName: parsed.data.lastName || null,
        customFields: parsed.data.customFields ?? {},
        source: parsed.data.source || "manual",
        tags: parsed.data.tagIds?.length
          ? { create: parsed.data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Contact already exists" }, { status: 409 });
    }
    throw e;
  }
}
