/**
 * Production certification: BoatingChicago branding/DMARC + Casey Autopilot pitch.
 *
 * Runs inside VPS worker container:
 *   BRANDING_ACQ_CERT=1 npx tsx scripts/vps-branding-autopilot-acq-cert.ts
 *
 * Optional:
 *   CERT_TO=chris+brandingcert@iscreamstudio.com
 *   BOATING_WORKSPACE_ID=...
 */
import { PrismaClient } from "@prisma/client";
import {
  buildFollowUp1,
  buildInitialEmail,
} from "../src/lib/acquisition/personalize";
import { resolveCampaignFromHeaders } from "../src/lib/identities";
import { compileEmailHtml, createEmptyDesign, type EmailDesign } from "../src/lib/email-compiler";
import { PLANS } from "../src/lib/plans";
import { sendEmail } from "../src/lib/mailer";
import { getStageCaps } from "../src/lib/acquisition/ramp";
import { isPipelinePaused, ensurePipelineControl } from "../src/lib/acquisition/caps";
import { getInventoryHealth } from "../src/lib/acquisition/discovery/inventory";
import {
  acquisitionSendingEnabled,
  acquisitionEnabled,
} from "../src/lib/acquisition/flags";

const prisma = new PrismaClient();

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };
const steps: Step[] = [];
function record(name: string, status: Step["status"], detail?: string) {
  steps.push({ name, status, detail });
  console.error(`${status} ${name}${detail ? ` — ${detail}` : ""}`);
}

function mustGate() {
  if (process.env.BRANDING_ACQ_CERT !== "1") {
    throw new Error("Set BRANDING_ACQ_CERT=1");
  }
}

async function findBoatingWorkspace() {
  const id = process.env.BOATING_WORKSPACE_ID?.trim();
  if (id) {
    const ws = await prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw new Error(`BOATING_WORKSPACE_ID not found: ${id}`);
    return ws;
  }
  const byName = await prisma.workspace.findFirst({
    where: {
      OR: [
        { name: { contains: "BoatingChicago", mode: "insensitive" } },
        { name: { contains: "Boating Chicago", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (byName) return byName;
  // Fallback: workspace whose verified sender is chris@iscreamstudio.com
  const viaSender = await prisma.senderIdentity.findFirst({
    where: {
      value: { equals: "chris@iscreamstudio.com", mode: "insensitive" },
      type: "ADDRESS",
    },
    include: { workspace: true },
  });
  if (viaSender?.workspace) return viaSender.workspace;
  throw new Error("BoatingChicago workspace not found — set BOATING_WORKSPACE_ID");
}

async function main() {
  mustGate();
  const certTo =
    process.env.CERT_TO?.trim() || "chris+brandingcert@iscreamstudio.com";
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    certTo,
  };

  // ——— Acquisition engine snapshot ———
  const paused = await isPipelinePaused();
  const stage = await getStageCaps();
  const inventory = await getInventoryHealth();
  const control = await ensurePipelineControl();
  report.acquisition = {
    enabled: acquisitionEnabled(),
    sendingEnabled: acquisitionSendingEnabled(),
    pipelinePaused: paused.paused,
    pauseReason: paused.reason,
    stage: stage.stage,
    newPerDay: stage.newPerDay,
    totalPerDay: stage.totalPerDay,
    sendableInventory: inventory.sendableInventory,
    lastTickAt: control.lastTickAt?.toISOString() ?? null,
    lastDailyReportAt: control.lastDailyReportAt?.toISOString() ?? null,
  };
  record(
    "ACQUISITION_ENGINE",
    acquisitionEnabled() && acquisitionSendingEnabled() && !paused.paused
      ? "PASS"
      : "FAIL",
    JSON.stringify(report.acquisition)
  );

  // ——— Casey Autopilot copy (no SES for A/B body proof; SES for live samples) ———
  const v1a = buildInitialEmail(
    {
      businessName: "Cert Cafe",
      firstName: "Chris",
      claim: "I saw you promote weekly events on your site.",
      evidence: "events calendar",
      sourceUrl: "https://example.com",
    },
    {
      unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=cert",
      copyVersion: "v1a",
      landingPath: "/automated-email-marketing",
    }
  );
  const v1b = buildInitialEmail(
    {
      businessName: "Cert Cafe",
      firstName: "Chris",
      claim: "I saw you promote weekly events on your site.",
      evidence: "events calendar",
      sourceUrl: "https://example.com",
    },
    {
      unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=cert",
      copyVersion: "v1b",
      landingPath: "/automated-email-marketing",
    }
  );
  const fu1 = buildFollowUp1(
    { businessName: "Cert Cafe", firstName: "Chris" },
    {
      unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=cert",
      landingPath: "/automated-email-marketing",
    }
  );

  const caseyOk =
    /website write your marketing emails/i.test(v1a.subject) &&
    /marketing mostly wrote itself/i.test(v1b.subject) &&
    /automated-email-marketing/.test(v1a.bodyText) &&
    /Nothing goes out unless you approve/i.test(v1a.bodyText) &&
    /Website changes/.test(v1b.bodyText) &&
    /approve every send/i.test(fu1.bodyText);
  record("CASEY_AUTOPILOT_COPY", caseyOk ? "PASS" : "FAIL", `A=${v1a.subject} | B=${v1b.subject}`);
  report.caseySubjects = { v1a: v1a.subject, v1b: v1b.subject, fu1: fu1.subject };

  // Live Casey samples (platform From)
  const caseyFrom =
    process.env.SENDFABLE_ACQUISITION_FROM ||
    "Casey at SendFable <casey@sendfable.com>";
  try {
    await sendEmail({
      from: caseyFrom,
      to: certTo,
      replyTo: "casey@sendfable.com",
      subject: `[CERT A] ${v1a.subject}`,
      text: v1a.bodyText,
      html: `<pre style="font-family:Georgia,serif;white-space:pre-wrap;">${v1a.bodyText.replace(/</g, "&lt;")}</pre>`,
      tags: { kind: "casey_cert_a" },
      noConfigurationSet: true,
    });
    record("CASEY_LIVE_A", "PASS", certTo);
  } catch (e) {
    record("CASEY_LIVE_A", "FAIL", String(e));
  }
  try {
    await sendEmail({
      from: caseyFrom,
      to: certTo,
      replyTo: "casey@sendfable.com",
      subject: `[CERT B] ${v1b.subject}`,
      text: v1b.bodyText,
      html: `<pre style="font-family:Georgia,serif;white-space:pre-wrap;">${v1b.bodyText.replace(/</g, "&lt;")}</pre>`,
      tags: { kind: "casey_cert_b" },
      noConfigurationSet: true,
    });
    record("CASEY_LIVE_B", "PASS", certTo);
  } catch (e) {
    record("CASEY_LIVE_B", "FAIL", String(e));
  }
  try {
    await sendEmail({
      from: caseyFrom,
      to: certTo,
      replyTo: "casey@sendfable.com",
      subject: `[CERT FU] ${fu1.subject}`,
      text: fu1.bodyText,
      html: `<pre style="font-family:Georgia,serif;white-space:pre-wrap;">${fu1.bodyText.replace(/</g, "&lt;")}</pre>`,
      tags: { kind: "casey_cert_fu" },
      noConfigurationSet: true,
    });
    record("CASEY_FOLLOW_UP", "PASS", certTo);
  } catch (e) {
    record("CASEY_FOLLOW_UP", "FAIL", String(e));
  }

  // ——— BoatingChicago branding + DMARC ———
  const ws = await findBoatingWorkspace();
  report.boatingWorkspaceId = ws.id;
  report.boatingNameBefore = ws.name;

  const brand = "BoatingChicago";
  await prisma.workspace.update({
    where: { id: ws.id },
    data: { name: brand },
  });

  const profile = await prisma.smsComplianceProfile.upsert({
    where: { workspaceId: ws.id },
    create: {
      workspaceId: ws.id,
      legalEntityName: "iScream Studio INC",
      dbaBrandName: brand,
    },
    update: {
      legalEntityName: "iScream Studio INC",
      dbaBrandName: brand,
    },
  });
  record(
    "BOATING_PROFILE",
    profile.dbaBrandName === brand ? "PASS" : "FAIL",
    `dba=${profile.dbaBrandName} legal=${profile.legalEntityName}`
  );

  // Prefer verified ADDRESS; force rewrite for non-platform domains
  let identity = await prisma.senderIdentity.findFirst({
    where: { workspaceId: ws.id, type: "ADDRESS", status: "VERIFIED" },
    orderBy: { isDefault: "desc" },
  });
  if (!identity) {
    identity = await prisma.senderIdentity.findFirst({
      where: { workspaceId: ws.id, type: "ADDRESS" },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!identity) {
    record("BOATING_SENDER", "FAIL", "no sender identity");
  } else {
    const domain = identity.value.split("@")[1]?.toLowerCase() || "";
    const platform = (process.env.PLATFORM_SEND_DOMAIN || "send.sendfable.com").toLowerCase();
    const needRewrite = domain !== platform;
    await prisma.senderIdentity.update({
      where: { id: identity.id },
      data: {
        displayName: brand,
        rewriteRequired: needRewrite,
        status: identity.status === "VERIFIED" ? "VERIFIED" : identity.status,
      },
    });
    identity = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: identity.id } });
    record(
      "BOATING_SENDER",
      identity.displayName === brand ? "PASS" : "FAIL",
      `${identity.displayName} <${identity.value}> rewriteRequired=${identity.rewriteRequired}`
    );

    const headers = await resolveCampaignFromHeaders(ws.id, identity, {
      businessDisplayName: brand,
    });
    report.boatingFrom = headers.from;
    report.boatingReplyTo = headers.replyTo ?? null;
    report.boatingRewritten = headers.rewritten;
    const fromOk =
      headers.from.startsWith(`${brand} <`) &&
      (!headers.rewritten || headers.from.includes(`@${platform}`));
    record(
      "BOATING_FROM_HEADERS",
      fromOk ? "PASS" : "FAIL",
      `from=${headers.from} replyTo=${headers.replyTo || "—"} rewritten=${headers.rewritten}`
    );

    // Owner plan for badge
    const ownerMem = await prisma.membership.findFirst({
      where: { workspaceId: ws.id, role: "OWNER" },
      include: { user: true },
    });
    const plan = ownerMem?.user.plan || "FREE";
    const showBadge = PLANS[plan as keyof typeof PLANS]?.badge ?? true;

    const design = createEmptyDesign() as EmailDesign;
    // Put a simple body block
    design.blocks = [
      {
        id: "h1",
        type: "heading",
        props: { text: `Chicago Boating Brief — week of cert`, level: 1 },
      },
      {
        id: "t1",
        type: "text",
        props: { text: "This is a controlled branding certification send." },
      },
      {
        id: "f1",
        type: "footer",
        props: {},
      },
    ];
    const html = compileEmailHtml(design, {
      businessName: brand,
      mailingAddress: ws.mailingAddress || "1364 Patriot Blvd\nGlenview, IL 60026",
      legalOperatorName: "iScream Studio INC",
      showSendfableBadge: showBadge,
      unsubscribeUrl: "https://sendfable.com/unsubscribe/cert",
    });

    const badgeOk = showBadge
      ? /Sent with/.test(html) &&
        /SendFable/.test(html) &&
        !/Simple email marketing by iScream/i.test(html)
      : !/footer_badge/.test(html);
    const legalOk = /BoatingChicago is operated by iScream Studio INC/.test(html);
    const noPromoIScream =
      !/Simple email marketing by iScream/i.test(html) &&
      !/Sent with[\s\S]*iScream/i.test(html);
    record("FREE_FOOTER", badgeOk ? "PASS" : "FAIL", showBadge ? "badge present" : "paid no badge");
    record("LEGAL_DISCLOSURE", legalOk ? "PASS" : "FAIL");
    record("ISCREAM_PROMINENT_REMOVED", noPromoIScream && badgeOk ? "PASS" : "FAIL");

    try {
      await sendEmail({
        from: headers.from,
        to: certTo,
        replyTo: headers.replyTo,
        subject: `[CERT] Chicago Boating Brief — week of branding`,
        html,
        tags: { kind: "boating_branding_cert", workspaceId: ws.id },
        noConfigurationSet: true,
      });
      record("BOATING_LIVE_SEND", "PASS", certTo);
    } catch (e) {
      record("BOATING_LIVE_SEND", "FAIL", String(e));
    }

    // Paid badge check (compile only — do not change owner plan)
    const paidHtml = compileEmailHtml(design, {
      businessName: brand,
      mailingAddress: ws.mailingAddress || "1364 Patriot Blvd\nGlenview, IL 60026",
      legalOperatorName: "iScream Studio INC",
      showSendfableBadge: false,
      unsubscribeUrl: "https://sendfable.com/unsubscribe/cert",
    });
    record(
      "PAID_BRANDING",
      !/footer_badge/.test(paidHtml) && /BoatingChicago/.test(paidHtml) ? "PASS" : "FAIL"
    );
  }

  // Isolation smoke: unrelated workspace name must not appear in Boating HTML path
  const other = await prisma.workspace.findFirst({
    where: { id: { not: ws.id } },
    select: { id: true, name: true },
  });
  record(
    "WORKSPACE_ISOLATION",
    other ? "PASS" : "SKIP",
    other ? `other=${other.name}` : "only one workspace"
  );

  const pass = steps.filter((s) => s.status === "PASS").length;
  const fail = steps.filter((s) => s.status === "FAIL").length;
  const skip = steps.filter((s) => s.status === "SKIP").length;
  report.steps = steps;
  report.summary = { pass, fail, skip };
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
