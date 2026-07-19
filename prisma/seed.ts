import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createEmptyDesign, compileEmailHtml } from "../src/lib/email-compiler";
import { PLATFORM_TEMPLATES } from "../src/lib/platform-templates";

const asJson = (v: unknown) => v as Prisma.InputJsonValue;

const prisma = new PrismaClient();

const FIRST = [
  "Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Quinn", "Avery", "Jamie", "Taylor",
];
const LAST = [
  "Lee", "Chen", "Patel", "Garcia", "Nguyen", "Kim", "Brown", "Davis", "Wilson", "Martinez",
];

async function main() {
  console.log("Seeding Sendfable demo…");

  await prisma.clickEvent.deleteMany();
  await prisma.campaignLink.deleteMany();
  await prisma.campaignRecipient.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.template.deleteMany({ where: { isPlatform: false } });
  await prisma.contactTag.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.signupForm.deleteMany();
  await prisma.senderIdentity.deleteMany();
  await prisma.suppressionEntry.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      email: "demo@sendfable.com",
      name: "Demo User",
      passwordHash,
      emailVerified: new Date(),
      plan: "GROWTH",
      accountRampLevel: 3,
      monthlySendCount: 1840,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Demo Workspace",
      mailingAddress: "100 Market Street, Suite 400, San Francisco, CA 94105, USA",
      timezone: "America/Los_Angeles",
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  const sender = await prisma.senderIdentity.create({
    data: {
      workspaceId: workspace.id,
      type: "ADDRESS",
      value: "hello@demo.sendfable.com",
      displayName: "Demo Workspace",
      status: "VERIFIED",
      verifiedAt: new Date(),
      isDefault: true,
      rewriteRequired: false,
    },
  });

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { defaultSenderIdentityId: sender.id },
  });

  const tags = await Promise.all(
    ["VIP", "Newsletter", "Customers", "Trial"].map((name, i) =>
      prisma.tag.create({
        data: {
          workspaceId: workspace.id,
          name,
          color: ["#4F46E5", "#059669", "#D97706", "#DB2777"][i],
        },
      })
    )
  );

  const contacts = [];
  for (let i = 0; i < 200; i++) {
    const firstName = FIRST[i % FIRST.length];
    const lastName = LAST[Math.floor(i / FIRST.length) % LAST.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const status =
      i % 47 === 0 ? "UNSUBSCRIBED" : i % 61 === 0 ? "BOUNCED" : "SUBSCRIBED";
    contacts.push({
      workspaceId: workspace.id,
      email,
      firstName,
      lastName,
      status: status as "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED",
      source: "import",
      createdAt: new Date(Date.now() - (200 - i) * 3 * 60 * 60 * 1000),
    });
  }

  await prisma.contact.createMany({ data: contacts });
  const created = await prisma.contact.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });

  const tagLinks = created.flatMap((c, i) => {
    const links = [{ contactId: c.id, tagId: tags[1].id }]; // Newsletter
    if (i % 5 === 0) links.push({ contactId: c.id, tagId: tags[0].id });
    if (i % 3 === 0) links.push({ contactId: c.id, tagId: tags[2].id });
    if (i % 7 === 0) links.push({ contactId: c.id, tagId: tags[3].id });
    return links;
  });
  await prisma.contactTag.createMany({ data: tagLinks, skipDuplicates: true });

  await prisma.segment.create({
    data: {
      workspaceId: workspace.id,
      name: "VIP customers",
      rules: {
        match: "all",
        conditions: [
          { field: "tag", operator: "in", value: "VIP" },
          { field: "status", operator: "eq", value: "SUBSCRIBED" },
        ],
      },
    },
  });

  const design1 = createEmptyDesign();
  design1.blocks[0].props.text = "Welcome to the neighborhood";
  const design2 = createEmptyDesign();
  design2.blocks[0].props.text = "Product update";

  await prisma.template.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: "Welcome series",
        designJson: asJson(design1),
        compiledHtml: compileEmailHtml(design1, {
          mailingAddress: workspace.mailingAddress,
        }),
      },
      {
        workspaceId: workspace.id,
        name: "Monthly digest",
        designJson: asJson(design2),
        compiledHtml: compileEmailHtml(design2, {
          mailingAddress: workspace.mailingAddress,
        }),
      },
    ],
  });

  const completedDesign = createEmptyDesign();
  completedDesign.blocks[0].props.text = "March product roundup";
  const completedHtml = compileEmailHtml(completedDesign, {
    mailingAddress: workspace.mailingAddress,
    previewText: "What's new this month",
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: "March product roundup",
      status: "COMPLETED",
      senderIdentityId: sender.id,
      subject: "What's new this month, {{first_name|friend}}",
      previewText: "Product updates you'll actually use",
      designJson: asJson(completedDesign),
      compiledHtml: completedHtml,
      audienceType: "all",
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600_000),
      recipientCount: 180,
      sentCount: 180,
      deliveredCount: 176,
      openCount: 82,
      clickCount: 31,
      bounceCount: 4,
      complaintCount: 0,
      unsubscribeCount: 2,
      failedCount: 0,
    },
  });

  const subscribed = await prisma.contact.findMany({
    where: { workspaceId: workspace.id, status: "SUBSCRIBED" },
    take: 180,
  });

  const link = await prisma.campaignLink.create({
    data: {
      campaignId: campaign.id,
      url: "https://example.com/updates",
      index: 0,
      clickCount: 40,
      uniqueClickCount: 31,
    },
  });

  await prisma.campaignRecipient.createMany({
    data: subscribed.map((c, i) => {
      const opened = i < 82;
      const clicked = i < 31;
      const bounced = i >= 176;
      return {
        campaignId: campaign.id,
        contactId: c.id,
        email: c.email,
        mergeData: {
          email: c.email,
          first_name: c.firstName,
          last_name: c.lastName,
        },
        status: bounced ? "FAILED" : "SENT",
        sesMessageId: `seed-${campaign.id}-${i}`,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        deliveredAt: bounced ? null : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60_000),
        openedAt: opened
          ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + (i % 12) * 3600_000)
          : null,
        firstClickedAt: clicked
          ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + (i % 12) * 3600_000 + 120_000)
          : null,
        bouncedAt: bounced ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30_000) : null,
        error: bounced ? "Hard bounce" : null,
      };
    }),
  });

  const clickRecipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id, firstClickedAt: { not: null } },
    take: 31,
  });
  await prisma.clickEvent.createMany({
    data: clickRecipients.map((r) => ({
      linkId: link.id,
      recipientId: r.id,
    })),
  });

  const draftDesign = createEmptyDesign();
  await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: "April newsletter (draft)",
      status: "DRAFT",
      senderIdentityId: sender.id,
      subject: "Spring ideas for {{first_name|there}}",
      previewText: "Fresh tips inside",
      designJson: asJson(draftDesign),
      compiledHtml: compileEmailHtml(draftDesign, {
        mailingAddress: workspace.mailingAddress,
      }),
      audienceType: "tags",
      audienceTagIds: asJson([tags[1].id]),
    },
  });

  await prisma.signupForm.create({
    data: {
      workspaceId: workspace.id,
      name: "Newsletter signup",
      fields: [
        { key: "email", label: "Email", type: "email", required: true },
        { key: "firstName", label: "First name", type: "text", required: false },
      ],
      doubleOptIn: true,
      hostedSlug: "demo-newsletter",
      tagIds: [tags[1].id],
      submitCount: 42,
    },
  });

  // Platform library templates (workspaceId null, isPlatform true)
  for (const t of PLATFORM_TEMPLATES) {
    const compiledHtml = compileEmailHtml(t.designJson, {
      mailingAddress: "123 Main St, City, ST 12345",
    });
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
        workspaceId: null,
      },
    });
  }

  console.log(`✓ Platform templates: ${PLATFORM_TEMPLATES.length}`);
  console.log("✓ Demo ready");
  console.log("  Email:    demo@sendfable.com");
  console.log("  Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
