import { prisma } from "@/lib/prisma";
import {
  acquisitionDiscoveryEnabled,
  acquisitionEnabled,
  acquisitionSendingEnabled,
} from "@/lib/acquisition/flags";
import { withAcquisitionLock } from "@/lib/acquisition/lock";
import { runDiscovery } from "@/lib/acquisition/discovery/discover";
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

/**
 * Autonomous acquisition tick — discovery, approve, send, replies, ramp.
 * No daily owner report noise; exception alerts only.
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

    // Hourly reply poll (when IMAP configured)
    if (minute < 2) {
      const replies = await pollAcquisitionReplies();
      actions.push(`replies:${replies.processed}:${replies.reason || "ok"}`);
    }

    // Discovery ~12:00–13:00 UTC once per hour bucket
    if (acquisitionDiscoveryEnabled() && hourUtc === 12 && minute < 5) {
      const disc = await runDiscovery({ limit: 40, enrich: true });
      actions.push(`discover:${disc.upserted}/${disc.attempted}`);
    }

    // Auto-approve continuously during business hours UTC 13–21
    if (acquisitionDiscoveryEnabled() && hourUtc >= 13 && hourUtc <= 21 && minute < 5) {
      const ap = await autoApproveAndQueue({ limit: 25 });
      actions.push(`auto_approve:${ap.approved}`);
    }

    const paused = await isPipelinePaused();
    if (!paused.paused && acquisitionSendingEnabled()) {
      const sender = await verifyAcquisitionSender();
      if (!sender.ok) {
        actions.push(`sender_blocked:${sender.detail}`);
        // Alert at most once per day via event dedupe
        const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
        const recent = await prisma.acquisitionEvent.findFirst({
          where: { type: "sender_blocked_alert", createdAt: { gte: since } },
        });
        if (!recent) {
          await alertOwnerException(
            "SendFable acquisition cannot send — sender not SES-verified",
            `Preferred From: ${sender.from}\nDetail: ${sender.detail}\n\nVerify the identity in AWS SES (us-east-1), then sending can resume automatically.`
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
