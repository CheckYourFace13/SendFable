import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { identityNeedsRewrite, coveredByVerifiedDomain } from "@/lib/identities";
import { createSesDomainIdentity, dkimRecordsFor } from "@/lib/ses-domains";
import { signToken } from "@/lib/tokens";
import { sendSenderVerification } from "@/lib/transactional";
import { PLANS } from "@/lib/plans";
import { normalizeEmail, isValidEmail } from "@/lib/utils";

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ADDRESS"),
    email: z.string().email().max(254),
    displayName: z.string().trim().min(1).max(80),
  }),
  z.object({
    type: z.literal("DOMAIN"),
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .max(253)
      .regex(DOMAIN_RE, "Enter a bare domain like yourcompany.com"),
  }),
]);

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const identities = await prisma.senderIdentity.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ identities });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only admins can manage sender identities" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const input = parsed.data;

  if (input.type === "ADDRESS") {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const existing = await prisma.senderIdentity.findUnique({
      where: { workspaceId_value: { workspaceId: ctx.workspace.id, value: email } },
    });
    if (existing) {
      return NextResponse.json({ error: "This address is already added" }, { status: 409 });
    }

    const rewriteRequired = identityNeedsRewrite(email);
    const autoVerified = !rewriteRequired && (await coveredByVerifiedDomain(ctx.workspace.id, email));

    const hasDefault = await prisma.senderIdentity.findFirst({
      where: { workspaceId: ctx.workspace.id, isDefault: true },
    });

    const identity = await prisma.senderIdentity.create({
      data: {
        workspaceId: ctx.workspace.id,
        type: "ADDRESS",
        value: email,
        displayName: input.displayName,
        rewriteRequired,
        status: autoVerified ? "VERIFIED" : "PENDING",
        verifiedAt: autoVerified ? new Date() : null,
        isDefault: !hasDefault && autoVerified,
      },
    });

    if (!autoVerified) {
      const token = await signToken("sender-verify", { identityId: identity.id }, "7d");
      await prisma.senderIdentity.update({
        where: { id: identity.id },
        data: { verificationToken: token },
      });
      await sendSenderVerification(email, token);
    }

    return NextResponse.json({ identity, rewriteRequired, autoVerified });
  }

  // DOMAIN
  const owner = await getWorkspaceOwner(ctx.workspace.id);
  if (!PLANS[owner.plan].customDomains) {
    return NextResponse.json(
      { error: "Custom domain authentication is available on Growth and Pro plans.", upgradeRequired: true },
      { status: 402 }
    );
  }

  const domain = input.domain;
  const existing = await prisma.senderIdentity.findUnique({
    where: { workspaceId_value: { workspaceId: ctx.workspace.id, value: domain } },
  });
  if (existing) {
    return NextResponse.json({ error: "This domain is already added" }, { status: 409 });
  }

  const tokens = await createSesDomainIdentity(domain);
  const identity = await prisma.senderIdentity.create({
    data: {
      workspaceId: ctx.workspace.id,
      type: "DOMAIN",
      value: domain,
      status: "PENDING",
      dkimTokens: tokens,
    },
  });

  return NextResponse.json({ identity, dkimRecords: dkimRecordsFor(domain, tokens) });
}
