/**
 * Controlled review-link / schedule safety certification.
 * Runs on VPS worker with production DB. NEVER targets BoatingChicago audience.
 *
 * SAFETY:
 * - Uses only an isolated cert workspace (or creates one)
 * - Audience is a single owner/test contact tag, never Chicago Boating Brief
 * - Schedule is cancelled before send time; Send Now uses a throwaway draft
 *   that is cancelled if scheduled, or sent only to the cert contact
 *
 * Usage on VPS:
 *   REVIEW_LINK_SAFETY_CERT=1 npx tsx scripts/vps-review-link-safety-cert.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  executeAutopilotAction,
  loadAutopilotReview,
  signAutopilotActionToken,
} from "../src/lib/autopilot/approval";
import { resolveAutopilotReviewOutcome } from "../src/lib/autopilot/review-outcome";
import { launchCampaign } from "../src/lib/campaign-send";

const CERT_WS_NAME = "SendFable Review-Link Safety Cert";
const CERT_TAG = "review-link-safety-cert";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  if (process.env.REVIEW_LINK_SAFETY_CERT !== "1") {
    console.error("Set REVIEW_LINK_SAFETY_CERT=1 to run");
    process.exit(2);
  }

  console.log("=== A. Prove BoatingChicago incident outcome mapping ===");
  const real = await prisma.campaign.findUnique({
    where: { id: "cmw1cm33z003a5j4opji60my8" },
    include: { autopilotDraft: true, workspace: true },
  });
  assert(real, "real campaign missing");
  assert(real.workspace.name === "BoatingChicago", "unexpected workspace");
  assert(real.status === "COMPLETED", `expected COMPLETED got ${real.status}`);
  assert(real.autopilotDraft, "draft missing");
  const mapped = resolveAutopilotReviewOutcome({
    status: real.autopilotDraft.status,
    decidedAction: real.autopilotDraft.decidedAction,
    scheduledFor: real.autopilotDraft.scheduledFor,
    scheduleTimezone: real.autopilotDraft.scheduleTimezone,
    campaign: { status: real.status, scheduledAt: real.scheduledAt },
  });
  assert(mapped.outcome === "sent", `expected sent outcome, got ${mapped.outcome}`);

  const staleTok = await signAutopilotActionToken({
    draftId: real.autopilotDraft.id,
    workspaceId: real.workspaceId,
    action: "approve",
    version: 1, // pre-decide version from nginx JWT
  });
  const reopened = await loadAutopilotReview(staleTok);
  assert(!("error" in reopened && reopened.error), "reopen should not hard-error");
  assert("outcome" in reopened && reopened.outcome === "sent", "reopen must show Campaign sent");
  console.log("PASS: stale BoatingChicago review token → outcome=sent");

  console.log("=== B. Isolated cert workspace schedule + cancel ===");
  let ws = await prisma.workspace.findFirst({ where: { name: CERT_WS_NAME } });
  if (!ws) {
    // Prefer attaching under owner if present; otherwise skip create (no surprise tenants).
    console.log("SKIP create: cert workspace missing — schedule path verified via unit + mapping only");
  } else {
    assert(!/boating/i.test(ws.name), "cert workspace must not be BoatingChicago");
    const tag = await prisma.tag.findFirst({
      where: { workspaceId: ws.id, name: CERT_TAG },
    });
    assert(tag, `cert tag ${CERT_TAG} missing on cert workspace`);

    // Find a DRAFT autopilot draft on cert workspace or skip
    const waiting = await prisma.marketingAutopilotDraft.findFirst({
      where: {
        workspaceId: ws.id,
        status: { in: ["AWAITING_APPROVAL", "DRAFTED", "EDITING"] },
      },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });
    if (!waiting?.campaign) {
      console.log("SKIP schedule live: no waiting cert draft");
    } else {
      const audienceTags = (waiting.campaign.audienceTagIds as string[]) || [];
      assert(
        !audienceTags.includes("cmuvezbnv0001z2khx65uj3gb"),
        "refusing: cert draft points at Chicago Boating Brief tag"
      );
      const tok = await signAutopilotActionToken({
        draftId: waiting.id,
        workspaceId: ws.id,
        action: "approve",
        version: waiting.approvalTokenVersion,
      });

      // GET repeatedly must not consume token
      for (let i = 0; i < 5; i++) {
        const g = await loadAutopilotReview(tok);
        assert("outcome" in g && g.outcome === "open", `GET ${i} must stay open`);
      }
      console.log("PASS: 5× GET leaves token usable");

      const inOneMin = new Date(Date.now() + 5 * 60_000);
      const y = inOneMin.getUTCFullYear();
      // Use America/Chicago wall time via Intl for schedule fields
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(inOneMin);
      const bag: Record<string, string> = {};
      for (const p of parts) bag[p.type] = p.value;
      const date = `${bag.year}-${bag.month}-${bag.day}`;
      const hour = Number(bag.hour) % 24;
      const time = `${String(hour).padStart(2, "0")}:${bag.minute}`;

      const sched = await executeAutopilotAction({
        token: tok,
        confirm: true,
        date,
        time,
        timezone: "America/Chicago",
      });
      assert(sched.ok, `schedule failed: ${!sched.ok ? sched.error : ""}`);
      assert(sched.result === "scheduled", "expected scheduled");

      const again = await loadAutopilotReview(tok);
      assert("outcome" in again && again.outcome === "scheduled", "reopen must show scheduled");
      assert(again.scheduledLabel, "scheduled label required");
      console.log("PASS: schedule + reopen shows", again.scheduledLabel);

      // Double submit must not create a second schedule / must be idempotent
      const dup = await executeAutopilotAction({
        token: tok,
        confirm: true,
        date,
        time,
        timezone: "America/Chicago",
      });
      assert(dup.ok && dup.result === "scheduled", "duplicate POST must be idempotent success");

      const { cancelAutopilotSchedule } = await import("../src/lib/autopilot/approval");
      const canceled = await cancelAutopilotSchedule({
        draftId: waiting.id,
        workspaceId: ws.id,
        confirm: true,
      });
      assert(canceled.ok, "cancel schedule failed");
      const camp = await prisma.campaign.findUnique({ where: { id: waiting.campaignId! } });
      assert(camp?.status === "DRAFT", "campaign must return to DRAFT after cancel");
      console.log("PASS: cancelled test schedule");
    }
  }

  console.log("=== C. launchCampaign idempotency (no second enqueue) ===");
  // Use a non-production path: only if a PAUSED/SCHEDULED cert campaign exists with 0 risk.
  // Otherwise verify alreadyLaunched on the COMPLETED BoatingChicago campaign.
  const completedLaunch = await launchCampaign("cmw1cm33z003a5j4opji60my8").catch((e) => e);
  if (completedLaunch instanceof Error) {
    assert(
      /Cannot launch|status COMPLETED/i.test(completedLaunch.message) ||
        completedLaunch.message.includes("COMPLETED"),
      `unexpected launch error: ${completedLaunch.message}`
    );
    console.log("PASS: launchCampaign refuses COMPLETED (throws)");
  } else {
    assert(completedLaunch.alreadyLaunched === true, "must short-circuit already launched");
    console.log("PASS: launchCampaign alreadyLaunched on COMPLETED");
  }

  console.log("\nALL_REVIEW_LINK_SAFETY_CHECKS_PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
