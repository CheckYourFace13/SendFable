import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";

function csvEscape(v: string): string {
  // Mitigate spreadsheet formula injection
  let out = v;
  if (/^[=+\-@]/.test(out)) out = `'${out}`;
  if (/[",\n\r]/.test(out)) return `"${out.replace(/"/g, '""')}"`;
  return out;
}

export async function GET(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const tagId = url.searchParams.get("tagId") || "";

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

  const contacts = await prisma.contact.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
    take: 50_000,
  });

  const header = ["email", "first_name", "last_name", "status", "tags", "source", "created_at"];
  const rows = contacts.map((c) =>
    [
      c.email,
      c.firstName ?? "",
      c.lastName ?? "",
      c.status,
      c.tags.map((t) => t.tag.name).join(";"),
      c.source ?? "",
      c.createdAt.toISOString(),
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const body = [header.join(","), ...rows].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${Date.now()}.csv"`,
    },
  });
}
