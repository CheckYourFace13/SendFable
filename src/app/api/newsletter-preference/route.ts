import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/tokens";

const DEST_RE = /^[a-z0-9][a-z0-9 \-]{0,39}$/i;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string; destination?: string | null };
    const token = (body.token || "").trim();
    if (!token) return NextResponse.json({ error: "token_required" }, { status: 400 });
    const payload = await verifyToken("newsletter-pref", token);
    if (!payload?.contactId || !payload?.workspaceId) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
    const contact = await prisma.contact.findFirst({
      where: { id: payload.contactId, workspaceId: payload.workspaceId },
      select: { id: true, customFields: true },
    });
    if (!contact) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const prior =
      contact.customFields && typeof contact.customFields === "object"
        ? (contact.customFields as Record<string, string>)
        : {};
    const next = { ...prior };
    const raw = body.destination;
    if (raw == null || String(raw).trim() === "") {
      delete next.newsletterDestination;
    } else {
      const dest = String(raw).trim();
      if (!DEST_RE.test(dest)) {
        return NextResponse.json({ error: "invalid_destination" }, { status: 400 });
      }
      next.newsletterDestination = dest.slice(0, 40);
    }
    await prisma.contact.update({
      where: { id: contact.id },
      data: { customFields: next },
    });
    return NextResponse.json({ ok: true, destination: next.newsletterDestination ?? null });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
}
