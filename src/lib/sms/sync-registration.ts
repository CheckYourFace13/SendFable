/**
 * Poll Telnyx brand/campaign status and advance lifecycle.
 * When Brand becomes VERIFIED, create Campaign exactly once.
 * Never logs EIN. Notifies only on meaningful terminal/action states.
 */

import { prisma } from "@/lib/prisma";
import { getSmsProviderOps } from "@/lib/sms/provider-ops-registry";
import {
  parseOwnerPilotMeta,
  writeOwnerPilotMeta,
} from "@/lib/sms/owner-pilot-meta";
import {
  brandPhaseFromStatus,
  campaignPhaseFromStatus,
  canCreateCampaignForBrandStatus,
  humanLifecycleMessage,
  type SmsLifecyclePhase,
} from "@/lib/sms/registration-lifecycle";
import { ensureCampaignSubmitted } from "@/lib/sms/provider-submit";

export async function syncPendingSmsRegistrations(): Promise<{
  checked: number;
  updated: number;
  campaignsCreated: number;
  notifications: string[];
}> {
  // Include brand-only profiles (campaignId null) — the sequencing fix path.
  const pending = await prisma.smsComplianceProfile.findMany({
    where: {
      OR: [
        { reviewStatus: { in: ["PROVIDER_SUBMITTED", "PROVIDER_PENDING", "READY_FOR_PROVIDER"] } },
        {
          brandId: { not: null },
          campaignId: null,
          reviewStatus: { notIn: ["CANCELLED", "SUSPENDED"] },
        },
      ],
    },
    take: 25,
  });

  let updated = 0;
  let campaignsCreated = 0;
  const notifications: string[] = [];
  if (!pending.length) return { checked: 0, updated: 0, campaignsCreated: 0, notifications };

  const ops = getSmsProviderOps({ forceLive: true });

  for (const profile of pending) {
    try {
      let brandStatus: string | null = null;
      let campaignStatus: string | null = null;
      let phase: SmsLifecyclePhase | null = null;
      let rejectReason: string | null = null;
      let notifyStatus: string | null = null;
      const meta = parseOwnerPilotMeta(profile.internalNotes);

      if (profile.brandId) {
        const brand = await ops.retrieveBrand(profile.brandId);
        brandStatus = brand.status;
        phase = brandPhaseFromStatus(brand.status);

        await prisma.smsRegistration.updateMany({
          where: { workspaceId: profile.workspaceId, kind: "brand" },
          data: {
            status:
              brand.status === "approved"
                ? "APPROVED"
                : brand.status === "rejected"
                  ? "REJECTED"
                  : "SUBMITTED",
            rejectionReason: brand.failureReason || undefined,
          },
        });

        if (brand.status === "rejected") {
          rejectReason = brand.failureReason || "Brand verification failed";
          notifyStatus = "BRAND_FAILED";
          phase = "BRAND_FAILED";
        } else if (brand.status === "approved") {
          if (meta.lastNotifyStatus !== "BRAND_VERIFIED" && !profile.campaignId) {
            notifyStatus = "BRAND_VERIFIED";
          }
          // Auto-create campaign once when brand verifies (never recreate Brand)
          if (!profile.campaignId && canCreateCampaignForBrandStatus(brand.status)) {
            const camp = await ensureCampaignSubmitted(profile.id);
            if (camp.skippedReason === "insufficient_funds") {
              console.warn(
                `[sms-sync] campaign deferred (provider balance) workspace=${profile.workspaceId}`
              );
              phase = "BRAND_VERIFIED";
              await prisma.smsComplianceProfile.update({
                where: { id: profile.id },
                data: {
                  reviewStatus: "PROVIDER_PENDING",
                  providerStatus: "SUBMITTED",
                  internalNotes: writeOwnerPilotMeta(profile.internalNotes, {
                    lifecyclePhase: "BRAND_VERIFIED",
                  }),
                },
              });
              updated += 1;
              continue;
            }
            if (camp.created) campaignsCreated += 1;
            campaignStatus = camp.campaignStatus;
            phase = camp.phase;
            if (camp.phase === "NUMBER_READY" || camp.phase === "CAMPAIGN_APPROVED") {
              notifyStatus = "CAMPAIGN_APPROVED";
            }
            updated += 1;
            if (notifyStatus && notifyStatus !== meta.lastNotifyStatus) {
              notifications.push(`${profile.workspaceId}:${notifyStatus}`);
              console.log(`[sms-sync] owner notify ${notifyStatus} workspace=${profile.workspaceId}`);
            }
            continue;
          }
        }
      }

      if (profile.campaignId) {
        const campaign = await ops.retrieveCampaign(profile.campaignId);
        campaignStatus = campaign.status;
        const campPhase = campaignPhaseFromStatus(campaign.status);
        phase = campaign.status === "approved" ? "NUMBER_READY" : campPhase;

        const bothApproved = brandStatus === "approved" && campaign.status === "approved";
        // If we didn't refresh brand this pass but campaign approved, still treat as ready
        const campaignApproved = campaign.status === "approved";
        const anyRejected = brandStatus === "rejected" || campaign.status === "rejected";

        if (campaign.status === "rejected") {
          rejectReason = campaign.failureReason || "Campaign rejected";
          notifyStatus = "CAMPAIGN_REJECTED";
          phase = "CAMPAIGN_REJECTED";
        } else if (campaignApproved) {
          notifyStatus = "CAMPAIGN_APPROVED";
        }

        const nextReview = campaignApproved
          ? "APPROVED"
          : anyRejected
            ? "REJECTED"
            : "PROVIDER_PENDING";
        const nextProvider = campaignApproved
          ? "APPROVED"
          : anyRejected
            ? "REJECTED"
            : "PENDING_CARRIER";

        const changed =
          profile.reviewStatus !== nextReview ||
          profile.providerStatus !== nextProvider ||
          (rejectReason && rejectReason !== profile.rejectionReason) ||
          meta.lifecyclePhase !== phase;

        if (changed) {
          const nextNotes = writeOwnerPilotMeta(profile.internalNotes, {
            lifecyclePhase: phase!,
            numberPurchaseUnlocked: campaignApproved ? true : meta.numberPurchaseUnlocked,
            lastNotifyStatus:
              notifyStatus && notifyStatus !== meta.lastNotifyStatus
                ? notifyStatus
                : meta.lastNotifyStatus,
          });

          await prisma.smsComplianceProfile.update({
            where: { id: profile.id },
            data: {
              reviewStatus: nextReview,
              providerStatus: nextProvider,
              ...(campaignApproved ? { approvedAt: new Date() } : {}),
              ...(rejectReason ? { rejectionReason: rejectReason } : {}),
              internalNotes: nextNotes,
            },
          });

          await prisma.smsRegistration.updateMany({
            where: { workspaceId: profile.workspaceId, kind: "campaign" },
            data: {
              status: campaignApproved
                ? "APPROVED"
                : campaign.status === "rejected"
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
        void bothApproved;
        continue;
      }

      // Brand-only pending update
      if (profile.brandId && phase) {
        const nextNotes = writeOwnerPilotMeta(profile.internalNotes, {
          lifecyclePhase: phase,
          lastNotifyStatus:
            notifyStatus && notifyStatus !== meta.lastNotifyStatus
              ? notifyStatus
              : meta.lastNotifyStatus,
        });
        if (meta.lifecyclePhase !== phase || (rejectReason && rejectReason !== profile.rejectionReason)) {
          await prisma.smsComplianceProfile.update({
            where: { id: profile.id },
            data: {
              reviewStatus: phase === "BRAND_FAILED" ? "REJECTED" : "PROVIDER_PENDING",
              providerStatus: phase === "BRAND_FAILED" ? "REJECTED" : "SUBMITTED",
              ...(rejectReason ? { rejectionReason: rejectReason } : {}),
              internalNotes: nextNotes,
            },
          });
          updated += 1;
          if (notifyStatus && notifyStatus !== meta.lastNotifyStatus) {
            notifications.push(`${profile.workspaceId}:${notifyStatus}`);
            console.log(
              `[sms-sync] ${humanLifecycleMessage(phase)} workspace=${profile.workspaceId}`
            );
          }
        }
      }
    } catch (err) {
      console.error(
        `[sms-sync] failed workspace=${profile.workspaceId}`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { checked: pending.length, updated, campaignsCreated, notifications };
}
