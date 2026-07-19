/**
 * Production owner bootstrap — run inside the app container:
 *   npx tsx scripts/create-owner.ts
 *
 * Env:
 *   OWNER_EMAIL (default chris@sendfable.com)
 *   OWNER_PASSWORD (required — strong temporary password)
 *   OWNER_NAME (optional)
 *   OWNER_WORKSPACE (optional)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PLATFORM_TEMPLATES } from "../src/lib/platform-templates";
import { compileEmailHtml } from "../src/lib/email-compiler";
import type { Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const asJson = (v: unknown) => v as Prisma.InputJsonValue;

async function main() {
  const email = (process.env.OWNER_EMAIL || "chris@sendfable.com").trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error("OWNER_PASSWORD must be set and at least 16 characters");
  }
  const name = process.env.OWNER_NAME || "Chris";
  const workspaceName = process.env.OWNER_WORKSPACE || "Sendfable";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      emailVerified: new Date(),
      plan: "PRO",
      accountRampLevel: 1,
    },
    update: {
      name,
      passwordHash,
      emailVerified: new Date(),
      // Ensure demo-style flags stay clear
      flaggedAt: null,
      flagReason: null,
      sendingHeldAt: null,
    },
  });

  let membership = await prisma.membership.findFirst({
    where: { userId: user.id, role: "OWNER" },
    include: { workspace: true },
  });

  if (!membership) {
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        mailingAddress: "Address pending — set in Settings before any real send",
        onboardingCompletedAt: new Date(),
        onboardingStep: 10,
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    membership = await prisma.membership.findFirstOrThrow({
      where: { userId: user.id, workspaceId: workspace.id },
      include: { workspace: true },
    });
  }

  // Disable demo account if present
  const demo = await prisma.user.findUnique({ where: { email: "demo@sendfable.com" } });
  if (demo) {
    const disabledHash = await bcrypt.hash(`disabled-${Date.now()}-${Math.random()}`, 12);
    await prisma.user.update({
      where: { id: demo.id },
      data: {
        passwordHash: disabledHash,
        emailVerified: null,
        sendingHeldAt: new Date(),
        sendingHoldReason: "Demo account disabled in production",
        flaggedAt: new Date(),
        flagReason: "production_demo_disabled",
      },
    });
    console.log("Disabled demo@sendfable.com");
  }

  // Platform templates
  for (const t of PLATFORM_TEMPLATES) {
    const compiledHtml = compileEmailHtml(t.designJson, { mailingAddress: "" });
    await prisma.template.upsert({
      where: { shareSlug: t.shareSlug },
      create: {
        workspaceId: null,
        name: t.name,
        designJson: asJson(t.designJson),
        compiledHtml,
        category: t.category,
        industry: t.industry,
        goal: t.goal,
        suggestedSubjects: asJson(t.suggestedSubjects),
        suggestedPreviewText: t.suggestedPreviewText,
        recommendedCta: t.recommendedCta,
        isPlatform: true,
        shareSlug: t.shareSlug,
      },
      update: {
        name: t.name,
        designJson: asJson(t.designJson),
        compiledHtml,
        category: t.category,
        industry: t.industry,
        goal: t.goal,
        suggestedSubjects: asJson(t.suggestedSubjects),
        suggestedPreviewText: t.suggestedPreviewText,
        recommendedCta: t.recommendedCta,
        isPlatform: true,
      },
    });
  }

  console.log("Owner ready:", email);
  console.log("Workspace:", membership.workspace.name, membership.workspace.id);
  console.log("Platform templates:", PLATFORM_TEMPLATES.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
