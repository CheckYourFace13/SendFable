import { prisma } from "@/lib/prisma";
import {
  acquisitionDiscoveryEnabled,
  acquisitionEnabled,
  acquisitionSendingEnabled,
} from "@/lib/acquisition/flags";
import { withAcquisitionLock } from "@/lib/acquisition/lock";
import { runInventoryAutofill } from "@/lib/acquisition/discovery/autofill";
import { getInventoryHealth } from "@/lib/acquisition/discovery/inventory";
import { autoApproveAndQueue } from "@/lib/acquisition/auto-approve";
import {
  draftMessageForProspect,
  sendAcquisitionMessage,
} from "@/lib/acquisition/send";
import {
  ensurePipelineControl,
  isPipelinePaused,
} from "@/lib/acquisition/caps";
import {
  evaluateAutoRamp,
  evaluateSafetyPauseAndBackoff,
} from "@/lib/acquisition/ramp";
import {
  defaultProspectTimeZone,
  isWithinSendWindow,
} from "@/lib/acquisition/schedule";
import { pollAcquisitionReplies } from "@/lib/acquisition/reply-imap";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";
import { alertOwnerException } from "@/lib/acquisition/notify";
import { checkAcquisitionDeliveryAttribution } from "@/lib/acquisition/delivery-health";

/**
 * Autonomous acquisition tick — discovery autofill, approve, send, replies, ramp.
 * Inventory STARVED prioritizes discovery; no daily owner noise.
 */
export async function runAcquisitionTick(now = new Date()): Promise<{
  ran: boolean;
  actions: string[];
}> {
  if (!acquisitionEnabled()) {
    return { ran: false, actions: ["disabled"] };
  }

  const lock = await withAcquisitionLock("tick", 55, async () => {
    const actions: string[] = [];
    await ensurePipelineControl();
    await prisma.acquisitionPipelineControl.update({
      where: { id: "default" },
      data: { lastTickAt: now },
    });

    const hourUtc = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // Inventory first when STARVED/LOW — do not wait for once-daily noon window
    if (acquisitionDiscoveryEnabled()) {
      const health = await getInventoryHealth(now);
      const prioritize =
        health.status === "STARVED" ||
        (health.status === "LOW" && minute < 5) ||
        (minute < 2 && health.needsDiscovery);

      if (prioritize) {
        const fill = await runInventoryAutofill(now);
        if (fill.ran) {
          actions.push(
            `autofill:${fill.batches}b/${fill.newDomains}new/${fill.qualified}q/${fill.approved}ap`
          );
        }
        const after = fill.healthAfter || health;
        actions.push(
          `inventory:${after.sendableInventory}:${after.status}:${after.daysOfInventory}d`
        );
      }
    }

    // Hourly reply poll (when IMAP configured)
    if (minute < 2) {
      const replies = await pollAcquisitionReplies();
      actions.push(`replies:${replies.processed}:${replies.reason || "ok"}`);
    }

    // Delivery attribution watch (after Casey sends)
    if (minute === 15 || minute === 45) {
      const del = await checkAcquisitionDeliveryAttribution(now);
      if (del.pending > 0) actions.push(`delivery_pending:${del.pending}`);
    }

    // Auto-approve throughout the hour when discovery is on
    if (acquisitionDiscoveryEnabled() && minute < 5) {
      const ap = await autoApproveAndQueue({ limit: 25 });
      actions.push(`auto_approve:${ap.approved}`);
    }

    const paused = await isPipelinePaused();
    if (!paused.paused && acquisitionSendingEnabled()) {
      const sender = await verifyAcquisitionSender();
      if (!sender.ok) {
        actions.push(`sender_blocked:${sender.detail}`);
        const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
        const recent = await prisma.acquisitionEvent.findFirst({
          where: { type: "sender_blocked_alert", createdAt: { gte: since } },
        });
        if (!recent) {
          await alertOwnerException(
            "SendFable acquisition cannot send — sender not SES-verified",
            `Preferred From: ${sender.from}\nDetail: ${sender.detail}\n\nVerify casey@sendfable.com in AWS SES (us-east-1), then sending can resume automatically.`
          );
          await prisma.acquisitionEvent.create({
            data: { type: "sender_blocked_alert", meta: { detail: sender.detail } },
          });
        }
      } else {
        const safety = await evaluateSafetyPauseAndBackoff();
        actions.push(`safety:${safety.ok ? "ok" : "paused"}`);
        if (safety.ok) {
          const due = await prisma.acquisitionProspect.findMany({
            where: {
              nextFollowUpAt: { lte: now },
              status: { in: ["CONTACTED", "FOLLOW_UP_1"] },
              contactEmail: { not: null },
            },
            take: 15,
          });
          for (const p of due) {
            const step = p.status === "CONTACTED" ? "FOLLOW_UP_1" : "FOLLOW_UP_2";
            await draftMessageForProspect(p.id, step, { dryRun: false });
          }

          const candidates = await prisma.acquisitionMessage.findMany({
            where: {
              dryRun: false,
              status: { in: ["DRAFT", "SCHEDULED"] },
            },
            include: { prospect: true },
            orderBy: { createdAt: "asc" },
            take: 30,
          });

          let sent = 0;
          let failStreak = 0;
          for (const m of candidates) {
            const tz = defaultProspectTimeZone(m.prospect.state);
            if (!isWithinSendWindow(now, tz).ok) continue;
            const r = await sendAcquisitionMessage(m.id);
            if (r.ok) {
              sent++;
              failStreak = 0;
              actions.push(`sent:${m.step}`);
            } else if (r.reason === "send_failed") {
              failStreak++;
              if (failStreak >= 5) {
                const { hardPauseAcquisition } = await import("@/lib/acquisition/ramp");
                await hardPauseAcquisition("repeated_send_failures");
                actions.push("hard_pause:send_failures");
                break;
              }
            }
          }
          if (sent === 0) actions.push("send:none");
        }
      }
    } else if (!acquisitionSendingEnabled()) {
      actions.push("sending_off");
    } else {
      actions.push(`paused:${paused.reason || "yes"}`);
    }

    // Ramp eval once daily ~22:00 UTC
    if (hourUtc === 22 && minute < 5) {
      const ramp = await evaluateAutoRamp(now);
      actions.push(`ramp:${ramp.reason}:stage${ramp.stage}`);
    }

    return actions;
  });

  if (!lock.acquired) return { ran: false, actions: ["lock_busy"] };
  return { ran: true, actions: lock.result || [] };
}

export { alertOwnerException as alertOwner } from "@/lib/acquisition/notify";
