/**
 * Enable TheDrinkPlace opt-in auto welcome + Autopilot auto-send.
 * Sets mailing address to the verified operator address.
 *
 *   npx tsx scripts/tdp-enable-auto-newsletter.ts --confirm-owner-qa
 */
import { prisma } from "../src/lib/prisma";

const CONFIRM = "--confirm-owner-qa";
const MAILING = "iScream Studio, Inc.\n1364 Patriot Blvd\nGlenview, IL 60026";

async function main() {
  if (!process.argv.includes(CONFIRM)) {
    console.error("Refusing: pass --confirm-owner-qa");
    process.exit(1);
  }

  const ws = await prisma.workspace.findFirst({
    where: { isInternal: true, name: "TheDrinkPlace" },
  });
  if (!ws) throw new Error("TheDrinkPlace missing");

  const audience = await prisma.tag.findFirst({
    where: { workspaceId: ws.id, name: "TheDrinkPlace Subscribers" },
  });
  if (!audience) throw new Error("audience tag missing");

  const identity = await prisma.senderIdentity.findFirst({
    where: { workspaceId: ws.id, status: "VERIFIED" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!identity) throw new Error("verified sender missing");

  await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      mailingAddress: MAILING,
      timezone: "America/Chicago",
      autoWelcomeEnabled: true,
      websiteUrl: ws.websiteUrl || "https://thedrinkplace.com",
      defaultSenderIdentityId: identity.id,
    },
  });

  const autopilot = await prisma.marketingAutopilotConfig.upsert({
    where: { workspaceId: ws.id },
    create: {
      workspaceId: ws.id,
      pageUrl: "https://thedrinkplace.com/guides",
      enabled: true,
      autoSendEnabled: true,
      checkFrequency: "WEEKLY",
      audienceType: "tags",
      audienceTagIds: [audience.id],
      channel: "EMAIL",
      remindersEnabled: false,
    },
    update: {
      pageUrl: "https://thedrinkplace.com/guides",
      enabled: true,
      autoSendEnabled: true,
      checkFrequency: "WEEKLY",
      audienceType: "tags",
      audienceTagIds: [audience.id],
      channel: "EMAIL",
      remindersEnabled: false,
    },
  });

  // Confirm other internal brands remain approval-only
  const others = await prisma.marketingAutopilotConfig.findMany({
    where: { workspaceId: { not: ws.id }, autoSendEnabled: true },
    include: { workspace: { select: { name: true } } },
  });
  const otherWelcomes = await prisma.workspace.findMany({
    where: { id: { not: ws.id }, autoWelcomeEnabled: true },
    select: { name: true },
  });

  console.log(
    JSON.stringify(
      {
        workspaceId: ws.id,
        autoWelcomeEnabled: true,
        autopilot: {
          id: autopilot.id,
          enabled: autopilot.enabled,
          autoSendEnabled: autopilot.autoSendEnabled,
          checkFrequency: autopilot.checkFrequency,
          pageUrl: autopilot.pageUrl,
          lastFetchedAt: autopilot.lastFetchedAt,
          lastAutoSentAt: autopilot.lastAutoSentAt,
        },
        mailingAddress: MAILING,
        timezone: "America/Chicago",
        sender: { value: identity.value, displayName: identity.displayName },
        otherAutoSendWorkspaces: others.map((o) => o.workspace.name),
        otherAutoWelcomeWorkspaces: otherWelcomes.map((w) => w.name),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
