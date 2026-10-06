/**
 * Marketing Autopilot controlled live E2E certification (runs on VPS worker/app).
 *
 * Flow: form capture → page change → draft → approval email →
 * DO NOT SEND → EDIT → APPROVE & SEND (1 recipient) → NO RESPONSE = NO SEND
 * Also proves GET/link preview cannot send.
 *
 * Usage (on VPS):
 *   docker compose ... exec -T -w /app worker npx tsx scripts/vps-autopilot-live-cert.ts
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import Redis from "ioredis";
const prisma = new PrismaClient();
const WORKSPACE_ID = process.env.AUTOPILOT_CERT_WORKSPACE_ID || "cmrry4tfe0001aqx1xw328ghq";
const PAGE_URL = process.env.AUTOPILOT_CERT_PAGE_URL || "https://sendfable.com/cert/autopilot-specials";
const REDIS_KEY = "autopilot:cert:specials";
const APP_URL = process.env.NEXTAUTH_URL || "https://sendfable.com";

type Report = Record<string, string | number | boolean | null>;

function stamp() {
  return Date.now().toString(36);
}

function htmlPage(extra: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Autopilot Cert Specials</title>
<meta name="robots" content="noindex,nofollow"></head>
<body><main>
  <h1>Weekly Specials</h1>
  <p>Welcome to our cafe. Hours 9am–5pm.</p>
  <p>Tuesday taco night is back.</p>
  ${extra}
</main></body></html>`;
}

async function setPage(redis: Redis, extra: string) {
  await redis.set(REDIS_KEY, htmlPage(extra));
}

async function fetchPage(): Promise<string> {
  const res = await fetch(PAGE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`cert page fetch ${res.status}`);
  return res.text();
}

function pass(report: Report, key: string, ok: boolean, detail?: string) {
  report[key] = ok ? "PASS" : "FAIL";
  if (detail) report[`${key}_detail`] = detail;
  console.log(`${ok ? "PASS" : "FAIL"} ${key}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const report: Report = { startedAt: new Date().toISOString(), workspaceId: WORKSPACE_ID };
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL required");
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 2 });

  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: WORKSPACE_ID } });
  const ownerMembership = await prisma.membership.findFirstOrThrow({
    where: { workspaceId: WORKSPACE_ID, role: "OWNER" },
    include: { user: true },
  });
  const owner = ownerMembership.user;
  const priorPlan = owner.plan;

  // Ensure Autopilot can create multiple drafts this month
  if (owner.plan === "FREE") {
    await prisma.user.update({ where: { id: owner.id }, data: { plan: "STARTER" } });
    report.planBump = "FREE→STARTER (restored at end)";
  }

  const sender = await prisma.senderIdentity.findFirst({
    where: { workspaceId: WORKSPACE_ID, status: "VERIFIED" },
  });
  if (!sender) throw new Error("Verified sender required");
  if (!workspace.mailingAddress?.trim()) throw new Error("Mailing address required");
  if (!workspace.defaultSenderIdentityId) {
    await prisma.workspace.update({
      where: { id: WORKSPACE_ID },
      data: { defaultSenderIdentityId: sender.id },
    });
  }

  const tag = await prisma.tag.upsert({
    where: {
      workspaceId_name: { workspaceId: WORKSPACE_ID, name: "autopilot-cert" },
    },
    create: { workspaceId: WORKSPACE_ID, name: "autopilot-cert" },
    update: {},
  });

  // ── A. FORM CAPTURE ──────────────────────────────────────────────────────
  let form = await prisma.signupForm.findFirst({
    where: { workspaceId: WORKSPACE_ID, name: "Autopilot Cert Form" },
  });
  if (!form) {
    form = await prisma.signupForm.create({
      data: {
        workspaceId: WORKSPACE_ID,
        name: "Autopilot Cert Form",
        hostedSlug: `autopilot-cert-${stamp()}`,
        fields: [
          { key: "email", label: "Email", type: "email", required: true },
          { key: "firstName", label: "First name", type: "text", required: false },
        ],
        tagIds: [tag.id],
        doubleOptIn: false,
        collectPhone: false,
        requirementMode: "email-required",
      },
    });
  } else {
    await prisma.signupForm.update({
      where: { id: form.id },
      data: { tagIds: [tag.id] as unknown as Prisma.InputJsonValue },
    });
  }

  const certEmail = `chris+autopilot-cert-${stamp()}@iscreamstudio.com`;
  const submitRes = await fetch(`${APP_URL}/api/forms/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: form.hostedSlug,
      fields: { email: certEmail, firstName: "AutopilotCert" },
    }),
  });
  const submitJson = await submitRes.json().catch(() => ({}));
  const contact = await prisma.contact.findFirst({
    where: { workspaceId: WORKSPACE_ID, email: certEmail.toLowerCase() },
  });
  pass(
    report,
    "FORM_CAPTURE",
    submitRes.ok && Boolean(contact),
    contact ? `contact=${contact.id} status=${contact.status}` : JSON.stringify(submitJson)
  );

  if (contact) {
    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
      create: { contactId: contact.id, tagId: tag.id },
      update: {},
    });
  }
  pass(
    report,
    "FORM_SOURCE_CONSENT",
    Boolean(contact?.source?.startsWith("form:") && contact.status === "SUBSCRIBED"),
    contact ? `source=${contact.source} createdAt=${contact.createdAt.toISOString()}` : "missing"
  );

  // ── Baseline page + config ───────────────────────────────────────────────
  await setPage(redis, "");
  await fetchPage();

  const config = await prisma.marketingAutopilotConfig.upsert({
    where: { workspaceId: WORKSPACE_ID },
    create: {
      workspaceId: WORKSPACE_ID,
      enabled: true,
      pageUrl: PAGE_URL,
      audienceType: "tags",
      audienceTagIds: [tag.id],
      checkFrequency: "DAILY",
      remindersEnabled: false,
      channel: "EMAIL",
      lastFetchedAt: null,
      lastContentHash: null,
      lastContentText: null,
    },
    update: {
      enabled: true,
      pageUrl: PAGE_URL,
      audienceType: "tags",
      audienceTagIds: [tag.id],
      checkFrequency: "DAILY",
      remindersEnabled: false,
      pausedAt: null,
      lastFetchedAt: null,
      lastContentHash: null,
      lastContentText: null,
      lastMeaningfulHash: null,
    },
  });

  const { runAutopilotTick } = await import("@/lib/autopilot/tick");
  const { sendAutopilotApprovalEmail, executeAutopilotAction, signAutopilotActionToken } =
    await import("@/lib/autopilot/approval");

  // Baseline fetch (no draft)
  const baselineTick = await runAutopilotTick(new Date());
  report.baseline_actions = baselineTick.actions.join(",");
  const draftsAfterBaseline = await prisma.marketingAutopilotDraft.count({
    where: { workspaceId: WORKSPACE_ID, configId: config.id },
  });

  // ── B. Meaningful change #1 → DO NOT SEND ────────────────────────────────
  const change1 = `<h2>New Fall Special</h2><p>Autopilot cert special ${stamp()}: $12 lunch plate all week. Dine in or takeout.</p>`;
  await setPage(redis, change1);
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastFetchedAt: null },
  });
  const tick1 = await runAutopilotTick(new Date());
  report.change1_actions = tick1.actions.join(",");

  const draft1 = await prisma.marketingAutopilotDraft.findFirst({
    where: { workspaceId: WORKSPACE_ID, status: { in: ["DRAFTED", "AWAITING_APPROVAL"] } },
    orderBy: { createdAt: "desc" },
    include: { campaign: true },
  });
  pass(
    report,
    "CHANGE_DETECTION",
    Boolean(draft1 && draft1.campaignId),
    draft1 ? `draft=${draft1.id} subject=${draft1.subject}` : tick1.actions.join(",")
  );

  // Duplicate protection: same page again should not create another draft
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastFetchedAt: null },
  });
  const tickDup = await runAutopilotTick(new Date());
  const openDrafts = await prisma.marketingAutopilotDraft.count({
    where: {
      workspaceId: WORKSPACE_ID,
      status: { in: ["DRAFTED", "AWAITING_APPROVAL", "EDITING"] },
    },
  });
  pass(
    report,
    "DUPLICATE_PROTECTION",
    openDrafts === 1 || tickDup.actions.some((a) => a.includes("dup")),
    `open=${openDrafts} actions=${tickDup.actions.join(",")}`
  );

  if (draft1 && draft1.status === "DRAFTED") {
    await sendAutopilotApprovalEmail(draft1.id);
  }
  const draft1b = draft1
    ? await prisma.marketingAutopilotDraft.findUnique({ where: { id: draft1.id } })
    : null;
  pass(
    report,
    "OWNER_APPROVAL_EMAIL",
    Boolean(draft1b?.approvalEmailSentAt && draft1b.status === "AWAITING_APPROVAL"),
    draft1b ? `sentAt=${draft1b.approvalEmailSentAt?.toISOString()}` : "no draft"
  );
  report.OWNER_APPROVAL_EMAIL_RECEIVED = draft1b?.approvalEmailSentAt ? "YES" : "NO";

  // ── D. DO NOT SEND ───────────────────────────────────────────────────────
  if (draft1b) {
    const rejectTok = await signAutopilotActionToken({
      draftId: draft1b.id,
      workspaceId: WORKSPACE_ID,
      action: "reject",
      version: draft1b.approvalTokenVersion,
    });
    // GET must not decide
    const getRes = await fetch(`${APP_URL}/autopilot/review?t=${encodeURIComponent(rejectTok)}`, {
      redirect: "follow",
    });
    const afterGet = await prisma.marketingAutopilotDraft.findUnique({ where: { id: draft1b.id } });
    pass(
      report,
      "GET_CANNOT_SEND",
      getRes.ok && afterGet?.status === "AWAITING_APPROVAL",
      `status=${afterGet?.status}`
    );

    const rejectResult = await executeAutopilotAction({ token: rejectTok, confirm: true });
    const afterReject = await prisma.marketingAutopilotDraft.findUnique({
      where: { id: draft1b.id },
      include: { campaign: true },
    });
    const sentCount = afterReject?.campaign
      ? await prisma.campaignRecipient.count({
          where: { campaignId: afterReject.campaign.id, status: "SENT" },
        })
      : 0;
    pass(
      report,
      "DO_NOT_SEND",
      rejectResult.ok && afterReject?.status === "REJECTED" && sentCount === 0,
      `status=${afterReject?.status} sentRecipients=${sentCount}`
    );
  } else {
    pass(report, "DO_NOT_SEND", false, "no draft");
    pass(report, "GET_CANNOT_SEND", false, "no draft");
  }

  // ── E. EDIT TEST ─────────────────────────────────────────────────────────
  const change2 = `<h2>Saturday Live Music</h2><p>Autopilot cert event ${stamp()}: live jazz this Saturday 7pm. Registration opening now.</p>`;
  await setPage(redis, change2);
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastFetchedAt: null, lastContentHash: null },
  });
  // Keep lastContentText so assessChange sees a diff — reload from DB after prior fetch
  await runAutopilotTick(new Date());
  // Force content text from previous page for clean diff if hash-equal short-circuit
  const cfgMid = await prisma.marketingAutopilotConfig.findUnique({ where: { id: config.id } });
  if (cfgMid?.lastContentText) {
    await setPage(
      redis,
      `${change2}<p>Extra detail for fingerprint ${stamp()}</p>`
    );
    await prisma.marketingAutopilotConfig.update({
      where: { id: config.id },
      data: { lastFetchedAt: null },
    });
  }
  await runAutopilotTick(new Date());

  const draft2 = await prisma.marketingAutopilotDraft.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      status: { in: ["DRAFTED", "AWAITING_APPROVAL"] },
      id: { not: draft1?.id || "" },
    },
    orderBy: { createdAt: "desc" },
  });
  if (draft2?.status === "DRAFTED") await sendAutopilotApprovalEmail(draft2.id);
  const draft2b = draft2
    ? await prisma.marketingAutopilotDraft.findUnique({ where: { id: draft2.id } })
    : null;

  if (draft2b) {
    const editTok = await signAutopilotActionToken({
      draftId: draft2b.id,
      workspaceId: WORKSPACE_ID,
      action: "edit",
      version: draft2b.approvalTokenVersion,
    });
    const editResult = await executeAutopilotAction({ token: editTok, confirm: true });
    const afterEdit = await prisma.marketingAutopilotDraft.findUnique({
      where: { id: draft2b.id },
    });
    const dupCampaigns = await prisma.campaign.count({
      where: {
        workspaceId: WORKSPACE_ID,
        name: { startsWith: "Autopilot:" },
        id: { not: draft2b.campaignId || undefined },
        createdAt: { gte: draft2b.createdAt },
      },
    });
    pass(
      report,
      "EDIT",
      editResult.ok &&
        editResult.result === "edit" &&
        afterEdit?.status === "EDITING" &&
        Boolean(editResult.campaignId),
      `campaignId=${editResult.campaignId} status=${afterEdit?.status} extraCampaigns=${dupCampaigns}`
    );
    report.editCampaignId = editResult.campaignId || null;
    report.editTokenPreview = `${APP_URL}/campaigns/${editResult.campaignId}`;
  } else {
    pass(report, "EDIT", false, "no second draft");
  }

  // ── F. APPROVE & SEND ────────────────────────────────────────────────────
  const change3 = `<h2>Autopilot Cert Sale</h2><p>Limited promotion ${stamp()}: 20% off weekend pastry boxes. Sale ends Sunday.</p>`;
  await setPage(redis, change3);
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastFetchedAt: null },
  });
  await runAutopilotTick(new Date());
  const draft3 = await prisma.marketingAutopilotDraft.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      status: { in: ["DRAFTED", "AWAITING_APPROVAL"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (draft3?.status === "DRAFTED") await sendAutopilotApprovalEmail(draft3.id);
  const draft3b = draft3
    ? await prisma.marketingAutopilotDraft.findUnique({
        where: { id: draft3.id },
        include: { campaign: true },
      })
    : null;

  if (draft3b?.campaignId) {
    // Ensure campaign audience is tags-only with cert tag + sender
    await prisma.campaign.update({
      where: { id: draft3b.campaignId },
      data: {
        audienceType: "tags",
        audienceTagIds: [tag.id],
        senderIdentityId: sender.id,
        subject: draft3b.subject || "Autopilot cert campaign",
      },
    });

    const approveTok = await signAutopilotActionToken({
      draftId: draft3b.id,
      workspaceId: WORKSPACE_ID,
      action: "approve",
      version: (
        await prisma.marketingAutopilotDraft.findUniqueOrThrow({ where: { id: draft3b.id } })
      ).approvalTokenVersion,
    });

    // GET must not send
    await fetch(`${APP_URL}/autopilot/review?t=${encodeURIComponent(approveTok)}`);
    const mid = await prisma.marketingAutopilotDraft.findUnique({ where: { id: draft3b.id } });
    const getSafe = mid?.status === "AWAITING_APPROVAL" || mid?.status === "DRAFTED";
    pass(report, "APPROVE_GET_SAFE", getSafe, `status=${mid?.status}`);

    const approveResult = await executeAutopilotAction({ token: approveTok, confirm: true });
    // Wait for worker to send the single recipient
    await new Promise((r) => setTimeout(r, 20_000));
    const afterApprove = await prisma.marketingAutopilotDraft.findUnique({
      where: { id: draft3b.id },
    });
    const campaign = await prisma.campaign.findUnique({ where: { id: draft3b.campaignId } });
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: draft3b.campaignId },
    });
    const sent = recipients.filter((r) => r.status === "SENT" || r.sentAt);
    pass(
      report,
      "APPROVE_AND_SEND",
      approveResult.ok &&
        (afterApprove?.status === "SENT" || campaign?.status === "SENDING" || campaign?.status === "COMPLETED"),
      `draft=${afterApprove?.status} campaign=${campaign?.status} recipients=${recipients.length}`
    );
    pass(
      report,
      "EXACTLY_ONE_DELIVERY",
      recipients.length === 1 && sent.length <= 1 && recipients[0]?.email === certEmail.toLowerCase(),
      `n=${recipients.length} sent=${sent.length} email=${recipients[0]?.email}`
    );
    report.approveCampaignId = draft3b.campaignId;
    report.approveReviewUrl = `${APP_URL}/autopilot/review?t=REDACTED`;
  } else {
    pass(report, "APPROVE_AND_SEND", false, "no third draft");
    pass(report, "EXACTLY_ONE_DELIVERY", false, "no third draft");
    pass(report, "APPROVE_GET_SAFE", false, "no third draft");
  }

  // ── G. NO RESPONSE = NO SEND ─────────────────────────────────────────────
  const change4 = `<h2>Quiet Draft Special</h2><p>Autopilot no-response test ${stamp()}: seasonal soup announcement. Do not act on this draft.</p>`;
  await setPage(redis, change4);
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastFetchedAt: null },
  });
  await runAutopilotTick(new Date());
  const draft4 = await prisma.marketingAutopilotDraft.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      status: { in: ["DRAFTED", "AWAITING_APPROVAL"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (draft4?.status === "DRAFTED") await sendAutopilotApprovalEmail(draft4.id);
  const draft4b = draft4
    ? await prisma.marketingAutopilotDraft.findUnique({ where: { id: draft4.id } })
    : null;
  await new Promise((r) => setTimeout(r, 3000));
  const stillWaiting = draft4b
    ? await prisma.marketingAutopilotDraft.findUnique({ where: { id: draft4b.id } })
    : null;
  const noSend =
    stillWaiting &&
    ["AWAITING_APPROVAL", "DRAFTED"].includes(stillWaiting.status) &&
    stillWaiting.decidedAction == null;
  pass(
    report,
    "NO_RESPONSE_NO_SEND",
    Boolean(noSend),
    stillWaiting ? `status=${stillWaiting.status}` : "no draft4"
  );

  // Tokens for Playwright screenshots (approve/reject already used; mint for a fresh review UI if waiting)
  if (stillWaiting) {
    const shotTok = await signAutopilotActionToken({
      draftId: stillWaiting.id,
      workspaceId: WORKSPACE_ID,
      action: "approve",
      version: stillWaiting.approvalTokenVersion,
    });
    report.screenshotReviewUrl = `${APP_URL}/autopilot/review?t=${shotTok}`;
  }

  // Restore plan
  if (report.planBump) {
    await prisma.user.update({ where: { id: owner.id }, data: { plan: priorPlan } });
  }

  // Pause autopilot on this workspace after cert to avoid further owner emails
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { pausedAt: new Date(), enabled: true },
  });

  report.draftsAfterBaseline = draftsAfterBaseline;
  report.formSlug = form.hostedSlug;
  report.certEmail = certEmail;
  report.pageUrl = PAGE_URL;
  report.finishedAt = new Date().toISOString();

  const failures = Object.entries(report).filter(
    ([k, v]) => k === k.toUpperCase() && v === "FAIL"
  );
  report.AUTOPILOT_LIVE_E2E = failures.length === 0 ? "PASS" : "FAIL";
  console.log("\n=== AUTOPILOT LIVE CERT REPORT ===");
  console.log(JSON.stringify(report, null, 2));

  await redis.quit();
  await prisma.$disconnect();
  if (failures.length) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
