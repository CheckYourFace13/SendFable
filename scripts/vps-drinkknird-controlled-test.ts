/**
 * Controlled DrinkKnird dogfood check after provision:
 * - form submit with owner email
 * - contact + tag + source
 * - optional single test send via campaign test endpoint is NOT done here
 *   (requires session). This script verifies DB state + form public API.
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const ws = await prisma.workspace.findFirst({
    where: { isInternal: true, name: "DrinkKnird" },
  });
  if (!ws) throw new Error("DrinkKnird workspace missing");

  const form = await prisma.signupForm.findFirst({
    where: { workspaceId: ws.id, name: "DrinkKnird Newsletter" },
  });
  if (!form) throw new Error("DrinkKnird Newsletter form missing");

  const ownerEmail = (
    process.env.PLATFORM_OWNER_EMAIL ||
    process.env.OWNER_ALERT_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!ownerEmail) throw new Error("owner email env missing");

  const base =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "https://sendfable.com";

  const submit = await fetch(`${base}/api/forms/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: form.hostedSlug,
      fields: {
        email: ownerEmail,
        firstName: "Owner",
      },
    }),
  });
  const submitJson = await submit.json().catch(() => ({}));
  if (!submit.ok) {
    throw new Error(`Form submit failed: ${submit.status} ${JSON.stringify(submitJson)}`);
  }

  const contact = await prisma.contact.findFirst({
    where: { workspaceId: ws.id, email: ownerEmail },
    include: { tags: { include: { tag: true } } },
  });
  if (!contact) throw new Error("Contact not created");

  const identity = await prisma.senderIdentity.findFirst({
    where: { workspaceId: ws.id, isDefault: true },
  });
  const autopilot = await prisma.marketingAutopilotConfig.findUnique({
    where: { workspaceId: ws.id },
  });
  const welcome = await prisma.campaign.findFirst({
    where: { workspaceId: ws.id, name: "Welcome to DrinkKnird", status: "DRAFT" },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        workspaceId: ws.id,
        planOverride: ws.internalPlanOverride,
        formSlug: form.hostedSlug,
        hostedFormUrl: `${base}/f/${form.hostedSlug}`,
        contactId: contact.id,
        contactStatus: contact.status,
        contactSource: contact.source,
        tags: contact.tags.map((t) => t.tag.name),
        smsStatus: contact.smsStatus,
        displayName: identity?.displayName ?? null,
        replyTo: identity?.value ?? null,
        identityStatus: identity?.status ?? null,
        rewriteRequired: identity?.rewriteRequired ?? null,
        autopilotEnabled: autopilot?.enabled ?? false,
        watchUrl: autopilot?.pageUrl ?? null,
        checkFrequency: autopilot?.checkFrequency ?? null,
        welcomeDraftId: welcome?.id ?? null,
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
