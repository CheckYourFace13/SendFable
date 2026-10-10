/**
 * Provision DrinkKnird as an INTERNAL FREE workspace on the running app DB.
 * Safe to re-run (idempotent).
 *
 * Usage (worker container):
 *   npx tsx scripts/vps-provision-drinkknird.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  createInternalWorkspace,
  provisionDrinkKnirdProductSurface,
} from "../src/lib/admin/internal-workspaces";

async function main() {
  const ownerEmail = (
    process.env.PLATFORM_OWNER_EMAIL ||
    process.env.OWNER_ALERT_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!ownerEmail) {
    throw new Error("PLATFORM_OWNER_EMAIL or OWNER_ALERT_EMAIL required");
  }

  const admin = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!admin) {
    throw new Error(`Owner user not found for ${ownerEmail}`);
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { platformRole: "OWNER_ADMIN" },
  });

  const { workspace, created } = await createInternalWorkspace({
    adminUserId: admin.id,
    name: "DrinkKnird",
    websiteUrl: "https://drinkknird.com",
    internalLabel: "DrinkKnird",
    plan: "FREE",
  });

  const provision = await provisionDrinkKnirdProductSurface({
    workspaceId: workspace.id,
    adminUserId: admin.id,
    replyToEmail: admin.email,
  });

  console.log(
    JSON.stringify(
      {
        created,
        workspaceId: workspace.id,
        plan: workspace.internalPlanOverride,
        formSlug: provision.form.hostedSlug,
        hostedFormUrl: `https://sendfable.com/f/${provision.form.hostedSlug}`,
        tag: provision.tag.name,
        displayName: provision.identity.displayName,
        replyTo: provision.identity.value,
        autopilotWatch: provision.autopilot.pageUrl,
        autopilotFrequency: provision.autopilot.checkFrequency,
        welcomeCampaignId: provision.welcome.id,
        ownerAdmin: admin.email,
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
