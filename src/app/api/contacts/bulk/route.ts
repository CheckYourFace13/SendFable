import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { bulkActionSchema } from "@/lib/validators/audience";
import { unsubscribeContact } from "@/lib/suppression";

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bulkActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { action, contactIds, tagId } = parsed.data;
  const owned = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, id: { in: contactIds } },
    select: { id: true, email: true },
  });
  const ids = owned.map((c) => c.id);
  if (!ids.length) return NextResponse.json({ updated: 0 });

  if (action === "tag" || action === "untag") {
    if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });
    const tag = await prisma.tag.findFirst({
      where: { id: tagId, workspaceId: ctx.workspace.id },
    });
    if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

    if (action === "tag") {
      await prisma.contactTag.createMany({
        data: ids.map((contactId) => ({ contactId, tagId })),
        skipDuplicates: true,
      });
    } else {
      await prisma.contactTag.deleteMany({
        where: { tagId, contactId: { in: ids } },
      });
    }
    return NextResponse.json({ updated: ids.length });
  }

  if (action === "unsubscribe") {
    for (const c of owned) {
      await unsubscribeContact(ctx.workspace.id, c.email, "bulk unsubscribe");
    }
    return NextResponse.json({ updated: owned.length });
  }

  if (action === "delete") {
    const result = await prisma.contact.deleteMany({
      where: { workspaceId: ctx.workspace.id, id: { in: ids } },
    });
    return NextResponse.json({ updated: result.count });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
