import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail, randomToken } from "@/lib/utils";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { isSuppressed } from "@/lib/suppression";
import { signToken } from "@/lib/tokens";
import { sendDoubleOptInConfirmation } from "@/lib/transactional";
import { PLANS } from "@/lib/plans";
import { getWorkspaceOwner } from "@/lib/session";

const schema = z.object({
  slug: z.string().min(1),
  fields: z.record(z.union([z.string(), z.boolean()])),
});

export async function POST(req: Request) {
  const rl = await rateLimit(
    "formSubmit",
    clientIp(req),
    RATE_LIMITS.formSubmit.limit,
    RATE_LIMITS.formSubmit.windowSec
  );
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: parsed.data.slug },
    include: { workspace: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const fieldDefs = form.fields as Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;

  const values = parsed.data.fields;
  for (const def of fieldDefs) {
    if (def.required) {
      const v = values[def.key];
      if (v === undefined || v === null || v === "") {
        return NextResponse.json({ error: `${def.label} is required` }, { status: 400 });
      }
    }
  }

  const emailRaw = String(values.email || values.Email || "");
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (await isSuppressed(form.workspaceId, email)) {
    // Silently succeed to avoid leaking suppression
    return NextResponse.json({ ok: true });
  }

  const owner = await getWorkspaceOwner(form.workspaceId);
  const count = await prisma.contact.count({ where: { workspaceId: form.workspaceId } });
  if (count >= PLANS[owner.plan].contactCap) {
    return NextResponse.json({ error: "This list is full" }, { status: 503 });
  }

  const firstName = String(values.firstName || values.first_name || "") || null;
  const lastName = String(values.lastName || values.last_name || "") || null;
  const customFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (["email", "firstName", "first_name", "lastName", "last_name"].includes(k)) continue;
    customFields[k] = String(v);
  }

  const tagIds = (form.tagIds as string[]) ?? [];
  const status = form.doubleOptIn ? "PENDING_CONFIRM" : "SUBSCRIBED";
  const confirmToken = form.doubleOptIn ? randomToken(24) : null;

  try {
    const contact = await prisma.contact.upsert({
      where: {
        workspaceId_email: { workspaceId: form.workspaceId, email },
      },
      create: {
        workspaceId: form.workspaceId,
        email,
        firstName,
        lastName,
        customFields,
        status,
        source: `form:${form.hostedSlug}`,
        confirmToken,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      update: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        customFields,
        ...(form.doubleOptIn
          ? { status: "PENDING_CONFIRM", confirmToken }
          : { status: "SUBSCRIBED" }),
        source: `form:${form.hostedSlug}`,
      },
    });

    if (tagIds.length) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId) => ({ contactId: contact.id, tagId })),
        skipDuplicates: true,
      });
    }

    await prisma.signupForm.update({
      where: { id: form.id },
      data: { submitCount: { increment: 1 } },
    });

    if (form.doubleOptIn && confirmToken) {
      const jwt = await signToken(
        "form-confirm",
        { contactId: contact.id, workspaceId: form.workspaceId },
        "7d"
      );
      await sendDoubleOptInConfirmation(email, form.workspace.name, jwt);
    }

    return NextResponse.json({
      ok: true,
      pendingConfirm: form.doubleOptIn,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ ok: true });
    }
    throw e;
  }
}
