import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail } from "@/lib/utils";
import { isSuppressed } from "@/lib/suppression";
import { numericCap, softwareQuotas } from "@/lib/internal-entitlement";
import { getWorkspaceOwner } from "@/lib/session";
import {
  BRIEF_AUDIENCE_TAG,
  ensureAudienceTag,
  requireIntegrationAuth,
} from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200),
  source: z.string().max(120).optional(),
  tagName: z.string().max(120).optional(),
  firstName: z.string().max(80).optional().nullable(),
  lastName: z.string().max(80).optional().nullable(),
});

/**
 * Idempotent contact upsert into the Chicago Boating Brief audience tag.
 * POST /api/v1/contacts/upsert
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (await isSuppressed(auth.workspace.id, email)) {
    // Do not leak suppression; treat as success for the client
    return NextResponse.json({
      ok: true,
      created: false,
      suppressed: true,
      tag: parsed.data.tagName || BRIEF_AUDIENCE_TAG,
    });
  }

  const owner = await getWorkspaceOwner(auth.workspace.id);
  const count = await prisma.contact.count({ where: { workspaceId: auth.workspace.id } });
  const contactCap = numericCap(
    softwareQuotas({
      isInternal: auth.workspace.isInternal,
      disabled: Boolean(auth.workspace.disabledAt),
      plan: owner.plan,
    }).contactCap
  );
  if (count >= contactCap) {
    return NextResponse.json({ error: "Contact cap reached" }, { status: 503 });
  }

  const tag = await ensureAudienceTag(auth.workspace.id);
  const tagName = parsed.data.tagName?.trim() || BRIEF_AUDIENCE_TAG;
  const audienceTag =
    tagName === BRIEF_AUDIENCE_TAG
      ? tag
      : await prisma.tag.upsert({
          where: { workspaceId_name: { workspaceId: auth.workspace.id, name: tagName } },
          create: { workspaceId: auth.workspace.id, name: tagName, color: "#0B3D6B" },
          update: {},
        });

  const existing = await prisma.contact.findFirst({
    where: { workspaceId: auth.workspace.id, email },
  });

  const source = parsed.data.source?.trim() || "api:boatingchicago";

  if (existing) {
    // Do not resurrect COMPLAINED/BOUNCED via API upsert
    if (existing.status === "BOUNCED" || existing.status === "COMPLAINED") {
      return NextResponse.json({
        ok: true,
        created: false,
        contactId: existing.id,
        status: existing.status,
        tag: audienceTag.name,
      });
    }

    const nextStatus =
      existing.status === "UNSUBSCRIBED" ? "UNSUBSCRIBED" : "SUBSCRIBED";

    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        source,
        firstName: parsed.data.firstName ?? existing.firstName,
        lastName: parsed.data.lastName ?? existing.lastName,
      },
    });

    await prisma.contactTag.upsert({
      where: {
        contactId_tagId: { contactId: existing.id, tagId: audienceTag.id },
      },
      create: { contactId: existing.id, tagId: audienceTag.id },
      update: {},
    });

    return NextResponse.json({
      ok: true,
      created: false,
      contactId: existing.id,
      status: nextStatus,
      tag: audienceTag.name,
    });
  }

  const contact = await prisma.contact.create({
    data: {
      workspaceId: auth.workspace.id,
      email,
      firstName: parsed.data.firstName ?? null,
      lastName: parsed.data.lastName ?? null,
      status: "SUBSCRIBED",
      source,
      tags: { create: [{ tagId: audienceTag.id }] },
    },
  });

  return NextResponse.json({
    ok: true,
    created: true,
    contactId: contact.id,
    status: contact.status,
    tag: audienceTag.name,
  });
}
