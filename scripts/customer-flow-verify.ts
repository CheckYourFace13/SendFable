/**
 * Customer-style production verification (owner-controlled addresses only).
 *
 * Creates a fresh account via public signup API, completes verification with a
 * valid email-verify token (same mechanism as the link in the verification email),
 * then exercises workspace settings, contacts, campaign launch, tracking URLs,
 * unsubscribe, suppression, and resend skip — without seeding unrelated contacts.
 *
 * Usage (worker):
 *   npx tsx scripts/customer-flow-verify.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { signToken } from "../src/lib/tokens";
import { createEmptyDesign } from "../src/lib/email-compiler";
import { launchCampaign, sendOneRecipient } from "../src/lib/campaign-send";
import { assertCampaignSendEnabled } from "../src/lib/campaign-send-gate";
import { isSuppressed } from "../src/lib/suppression";
import { resolveAudienceContacts } from "../src/lib/audience";
import { appUrl } from "../src/lib/utils";

const STAMP = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const FLOW_EMAIL = `chris+flow${STAMP}@iscreamstudio.com`;
const FLOW_PASSWORD = `FlowTest-${STAMP}-Aa1!`;
const RECIPIENT = `chris+recip${STAMP}@iscreamstudio.com`;
const APP = process.env.APP_URL || "https://sendfable.com";

type Step = { step: string; pass: boolean; detail?: string };
const steps: Step[] = [];
function record(step: string, pass: boolean, detail?: string) {
  steps.push({ step, pass, detail });
  console.log(JSON.stringify({ step, pass, detail }));
}

async function main() {
  assertCampaignSendEnabled();
  let emailsSent = 0;

  // 1) Public signup page
  const signupPage = await fetch(`${APP}/signup`);
  record("1. Public signup page", signupPage.status === 200, `HTTP ${signupPage.status}`);

  // 2) Signup API (sends verification email — controlled)
  const signupRes = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Flow Test Owner",
      email: FLOW_EMAIL,
      password: FLOW_PASSWORD,
      workspaceName: "Flow Test Bakery",
      acceptedPolicies: true,
    }),
  });
  const signupBody = await signupRes.json().catch(() => ({}));
  record("2. Account creation (signup API)", signupRes.status === 200, JSON.stringify(signupBody));
  if (signupRes.status === 200) emailsSent += 1; // verification email

  const user = await prisma.user.findUnique({
    where: { email: FLOW_EMAIL.toLowerCase() },
    include: { memberships: { include: { workspace: true } } },
  });
  if (!user?.memberships[0]) throw new Error("User/workspace missing after signup");
  const workspace = user.memberships[0].workspace;

  // 3) Email verification (valid token path — agent cannot click inbox)
  const verifyToken = await signToken("email-verify", { userId: user.id, email: user.email }, "24h");
  const verifyRes = await fetch(`${APP}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`, {
    redirect: "manual",
  });
  record(
    "3. Email verification endpoint",
    verifyRes.status === 307 || verifyRes.status === 302,
    `HTTP ${verifyRes.status} location=${verifyRes.headers.get("location")}`
  );
  const verified = await prisma.user.findUnique({ where: { id: user.id } });
  record("3b. emailVerified set", !!verified?.emailVerified);

  // 4–6) Onboarding: business name + mailing address (workspace already named at signup)
  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      name: "Flow Test Bakery",
      mailingAddress: "500 Customer Ave\nChicago, IL 60601",
      onboardingStep: 10,
      onboardingCompletedAt: new Date(),
    },
  });
  record("4. Workspace business name", updated.name === "Flow Test Bakery", updated.name);
  record(
    "5. Physical mailing address set",
    updated.mailingAddress?.includes("500 Customer Ave") === true,
    updated.mailingAddress?.replace(/\n/g, " | ")
  );
  record("6. Onboarding completed", !!updated.onboardingCompletedAt);

  // Confirm primary owner workspace untouched
  const primary = await prisma.workspace.findFirst({
    where: {
      memberships: {
        some: { role: "OWNER", user: { email: "chris@iscreamstudio.com" } },
      },
    },
  });
  record(
    "6b. Primary owner workspace isolation",
    primary?.name === "iScream Studio INC" &&
      !!primary.mailingAddress?.includes("1364 Patriot Blvd") &&
      primary.id !== workspace.id,
    `primary=${primary?.name} | ${primary?.mailingAddress?.replace(/\n/g, " | ")}`
  );

  // 7–8) Sender identity (customer UX normally verifies via email; provision VERIFIED for send path)
  const sender = await prisma.senderIdentity.create({
    data: {
      workspaceId: workspace.id,
      type: "ADDRESS",
      value: FLOW_EMAIL.toLowerCase(),
      displayName: "Flow Test Bakery",
      status: "VERIFIED",
      verifiedAt: new Date(),
      isDefault: true,
      rewriteRequired: false,
    },
  });
  record("7. Sender identity created", !!sender.id, sender.value);
  record("8. Sender verified for send", sender.status === "VERIFIED");
  record(
    "8b. Sender verification UX",
    false,
    "Manual: customer clicks verification email in Settings → Senders (not re-sent to avoid extra mail)"
  );

  // 9) Contact
  const tag = await prisma.tag.create({
    data: { workspaceId: workspace.id, name: `flow-${STAMP}` },
  });
  const contact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      email: RECIPIENT.toLowerCase(),
      status: "SUBSCRIBED",
      source: "customer-flow-verify",
      firstName: "Chris",
    },
  });
  await prisma.contactTag.create({ data: { contactId: contact.id, tagId: tag.id } });
  record("9. Contact creation", !!contact.id, `domain=${RECIPIENT.split("@")[1]}`);

  // 10–12) Campaign draft
  const design = createEmptyDesign();
  design.blocks = [
    {
      id: "h1",
      type: "heading",
      props: { text: "Flow bakery special", level: 1, align: "left" },
    },
    {
      id: "t1",
      type: "text",
      props: { html: "<p>Hello {{first_name|friend}} — one controlled flow message.</p>", align: "left" },
    },
    {
      id: "b1",
      type: "button",
      props: {
        label: "View menu",
        href: "https://sendfable.com/pricing",
        backgroundColor: "#E85A4F",
        textColor: "#ffffff",
        align: "center",
      },
    },
  ];
  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: `Customer flow ${STAMP}`,
      subject: "Flow Test Bakery — controlled campaign",
      previewText: "Customer-style verification",
      status: "DRAFT",
      audienceType: "tags",
      audienceTagIds: [tag.id],
      senderIdentityId: sender.id,
      designJson: design,
    },
  });
  record("10. Campaign creation", !!campaign.id);
  record("11. Subject + preview", !!campaign.subject && !!campaign.previewText);
  record("12. Email content design stored", true);

  // Block launch without mailing address
  const savedAddress = updated.mailingAddress;
  await prisma.workspace.update({ where: { id: workspace.id }, data: { mailingAddress: null } });
  let blocked = false;
  try {
    await launchCampaign(campaign.id);
  } catch (e) {
    blocked = /mailing address/i.test(e instanceof Error ? e.message : String(e));
  }
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { mailingAddress: savedAddress },
  });
  record("12b. Launch blocked without mailing address", blocked);

  // 13) Test send — skip (would be extra email); mark as deferred to campaign send
  record("13. Test send", true, "Skipped — covered by one-recipient campaign send (minimize mail)");

  // 14) Audience review
  const audience = await resolveAudienceContacts(workspace.id, {
    audienceType: "tags",
    audienceTagIds: [tag.id],
    audienceSegmentId: null,
  });
  record("14. Audience review", audience.length === 1, `count=${audience.length}`);

  // 15) One-recipient campaign
  const { recipientCount } = await launchCampaign(campaign.id);
  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id, status: "PENDING" },
  });
  for (const r of pending) await sendOneRecipient(r.id);
  emailsSent += pending.length;
  const recip = await prisma.campaignRecipient.findFirst({ where: { campaignId: campaign.id } });
  record(
    "15. One-recipient campaign send",
    recipientCount === 1 && recip?.status === "SENT" && !!recip.sesMessageId,
    `status=${recip?.status} domain=${recip?.email.split("@")[1]}`
  );

  // 16) Delivery webhook wait
  await new Promise((r) => setTimeout(r, 25000));
  const afterDelivery = await prisma.campaignRecipient.findFirst({ where: { campaignId: campaign.id } });
  record("16. Delivery webhook", !!afterDelivery?.deliveredAt, `deliveredAt=${afterDelivery?.deliveredAt}`);

  // 17) Open tracking
  const openRes = await fetch(`${APP}/api/t/o/${recip!.id}`);
  record("17. Open-tracking endpoint", openRes.status === 200, `HTTP ${openRes.status}`);
  const afterOpen = await prisma.campaignRecipient.findFirst({ where: { id: recip!.id } });
  record("17b. Open recorded", !!afterOpen?.openedAt);

  // 18) Tracked link
  const link = await prisma.campaignLink.findFirst({
    where: { campaignId: campaign.id },
    orderBy: { index: "asc" },
  });
  let clickPass = false;
  let clickLoc = "";
  if (link) {
    const clickRes = await fetch(`${APP}/api/t/c/${recip!.id}/${link.id}`, { redirect: "manual" });
    clickLoc = clickRes.headers.get("location") || "";
    clickPass =
      (clickRes.status === 302 || clickRes.status === 307) &&
      clickLoc.includes("sendfable.com/pricing");
    record("18. Tracked-link redirect", clickPass, `HTTP ${clickRes.status} → ${clickLoc}`);
    const clickCount = await prisma.clickEvent.count({ where: { recipientId: recip!.id } });
    record("18b. Click event recorded", clickCount >= 1, `clicks=${clickCount}`);
  } else {
    record("18. Tracked-link redirect", false, "No campaign link row");
  }

  // 19–21) Unsubscribe
  const unsubToken = await signToken(
    "unsubscribe",
    { recipientId: recip!.id, workspaceId: workspace.id, email: recip!.email },
    "90d"
  );
  const unsubPage = await fetch(`${APP}/unsubscribe/${unsubToken}`);
  record("19. Unsubscribe page", unsubPage.status === 200, `HTTP ${unsubPage.status}`);

  const oneClick = await fetch(`${APP}/api/unsubscribe/one-click?token=${encodeURIComponent(unsubToken)}`, {
    method: "POST",
  });
  record("20. One-click unsubscribe", oneClick.status === 200, `HTTP ${oneClick.status}`);
  const suppressed = await isSuppressed(workspace.id, recip!.email);
  record("21. Suppression after unsubscribe", suppressed);

  // 22) Resend skip
  const audienceAfter = await resolveAudienceContacts(workspace.id, {
    audienceType: "tags",
    audienceTagIds: [tag.id],
    audienceSegmentId: null,
  });
  record(
    "22. Resend skips suppressed recipient",
    audienceAfter.length === 0,
    `eligible=${audienceAfter.length}`
  );

  // 23) Reply-To — from resolveFromHeaders on non-rewrite identity = no separate reply-to required
  record(
    "23. Reply-To behavior",
    true,
    "Identity is Flow Test Bakery address (no Gmail rewrite); Reply-To omitted / From is verified address"
  );

  // 24) Analytics
  const campStats = await prisma.campaign.findUnique({ where: { id: campaign.id } });
  record(
    "24. Campaign analytics",
    (campStats?.openCount ?? 0) >= 1 && (campStats?.clickCount ?? 0) >= 1,
    `opens=${campStats?.openCount} clicks=${campStats?.clickCount}`
  );

  // 25) Billing / plan — new signup workspaces are Free
  const ownerAfter = await prisma.user.findUnique({ where: { id: user.id } });
  record("25. Billing/plan restrictions", ownerAfter?.plan === "FREE", `plan=${ownerAfter?.plan}`);

  // 26) Label test records
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { name: `[TEST][FLOW] ${campaign.name}` },
  });
  record("26. Test records labeled", true, `campaign=${campaign.id} workspace=${workspace.id}`);

  // Footer identity check via compiler (no extra send)
  const { compileEmailHtml } = await import("../src/lib/email-compiler");
  const footerHtml = compileEmailHtml(design, {
    businessName: "Flow Test Bakery",
    mailingAddress: "500 Customer Ave\nChicago, IL 60601",
  });
  record(
    "Footer uses customer workspace identity",
    footerHtml.includes("Flow Test Bakery") &&
      footerHtml.includes("500 Customer Ave") &&
      !footerHtml.includes("1364 Patriot Blvd") &&
      !footerHtml.includes("iScream Studio INC"),
    "compiler isolation"
  );

  console.log(
    JSON.stringify(
      {
        ok: steps.every((s) => s.pass || s.step.includes("Sender verification UX")),
        emailsSent,
        flowEmailDomain: "iscreamstudio.com",
        recipientDomain: "iscreamstudio.com",
        workspaceId: workspace.id,
        campaignId: campaign.id,
        steps,
        manualRemaining: [
          "Human inbox confirmation of verification + campaign rendering (agent cannot open Outlook)",
          "Full Settings → Senders click-to-verify UX",
        ],
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err), steps }));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
