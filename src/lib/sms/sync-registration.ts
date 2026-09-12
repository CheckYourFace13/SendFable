/**
 * Poll Telnyx brand/campaign status and update DB.
 * Never logs EIN. Notifies owner only on APPROVED / REJECTED / ACTION REQUIRED.
 */

import { prisma } from "@/lib/prisma";
import { getSmsProviderOps } from "@/lib/sms/provider-ops-registry";
import {
  parseOwnerPilotMeta,
  writeOwnerPilotMeta,
} from "@/lib/sms/owner-pilot-meta";

export async function syncPendingSmsRegistrations(): Promise<{
  checked: number;
  updated: number;
  notifications: string[];
}> {
  const pending = await prisma.smsComplianceProfile.findMany({
    where: {
      reviewStatus: { in: ["PROVIDER_SUBMITTED", "PROVIDER_PENDING"] },
      brandId: { not: null },
      campaignId: { not: null },
    },
    take: 25,
  });

  let updated = 0;
  const notifications: string[] = [];
  if (!pending.length) return { checked: 0, updated: 0, notifications };

  const ops = getSmsProviderOps({ forceLive: true });

  for (const profile of pending) {
    if (!profile.brandId || !profile.campaignId) continue;
    try {
      const brand = await ops.retrieveBrand(profile.brandId);
      const campaign = await ops.retrieveCampaign(profile.campaignId);
      const bothApproved = brand.status === "approved" && campaign.status === "approved";
      const anyRejected = brand.status === "rejected" || campaign.status === "rejected";
      const actionRequired =
        /action|required|incomplete|expired/i.test(brand.status) ||
        /action|required|incomplete|expired/i.test(campaign.status);

      const nextReview = bothApproved
        ? "APPROVED"
        : anyRejected
          ? "REJECTED"
          : "PROVIDER_PENDING";
      const nextProvider = bothApproved
        ? "APPROVED"
        : anyRejected
          ? "REJECTED"
          : "PENDING_CARRIER";

      const rejectReason = anyRejected
        ? [brand.failureReason, campaign.failureReason].filter(Boolean).join(" | ") ||
          `brand=${brand.status}; campaign=${campaign.status}`
        : null;

      const changed =
        profile.reviewStatus !== nextReview ||
        profile.providerStatus !== nextProvider ||
        (rejectReason && rejectReason !== profile.rejectionReason);

      if (changed) {
        const meta = parseOwnerPilotMeta(profile.internalNotes);
        let notifyStatus: string | null = null;
        if (bothApproved) notifyStatus = "APPROVED";
        else if (anyRejected) notifyStatus = "REJECTED";
        else if (actionRequired) notifyStatus = "ACTION_REQUIRED";

        const nextNotes =
          notifyStatus && notifyStatus !== meta.lastNotifyStatus
            ? writeOwnerPilotMeta(profile.internalNotes, {
                lastNotifyStatus: notifyStatus,
                numberPurchaseUnlocked: bothApproved ? true : meta.numberPurchaseUnlocked,
              })
            : bothApproved
              ? writeOwnerPilotMeta(profile.internalNotes, {
                  numberPurchaseUnlocked: true,
                })
              : profile.internalNotes;

        await prisma.smsComplianceProfile.update({
          where: { id: profile.id },
          data: {
            reviewStatus: nextReview,
            providerStatus: nextProvider,
            ...(bothApproved ? { approvedAt: new Date() } : {}),
            ...(rejectReason ? { rejectionReason: rejectReason } : {}),
            ...(nextNotes !== profile.internalNotes ? { internalNotes: nextNotes } : {}),
          },
        });

        await prisma.smsRegistration.updateMany({
          where: { workspaceId: profile.workspaceId, kind: "brand" },
          data: {
            status: brand.status === "approved" ? "APPROVED" : anyRejected ? "REJECTED" : "SUBMITTED",
            rejectionReason: brand.failureReason || undefined,
          },
        });
        await prisma.smsRegistration.updateMany({
          where: { workspaceId: profile.workspaceId, kind: "campaign" },
          data: {
            status: campaign.status === "approved"
              ? "APPROVED"
              : anyRejected
                ? "REJECTED"
                : "PENDING_CARRIER",
            rejectionReason: campaign.failureReason || undefined,
          },
        });

        updated += 1;
        if (notifyStatus && notifyStatus !== meta.lastNotifyStatus) {
          notifications.push(`${profile.workspaceId}:${notifyStatus}`);
          console.log(
            `[sms-sync] owner notify ${notifyStatus} workspace=${profile.workspaceId}` +
              (rejectReason ? ` reason=${rejectReason.slice(0, 200)}` : "")
          );
        }
      }
    } catch (err) {
      console.error(
        `[sms-sync] failed workspace=${profile.workspaceId}`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { checked: pending.length, updated, notifications };
}
