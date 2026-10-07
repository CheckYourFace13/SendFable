"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";
import { track } from "@/lib/track";

/**
 * Shown only when the workspace has hit this month's Autopilot draft allowance.
 * Avoids soft-spam — no banner until the limit is actually reached.
 */
export function AutopilotUpgradeBanner({
  plan,
  draftsUsed,
  draftsCap,
  surface,
}: {
  plan: string;
  draftsUsed: number;
  draftsCap: number;
  surface: "autopilot_settings" | "dashboard";
}) {
  const atLimit = draftsCap > 0 && draftsUsed >= draftsCap;
  const nextPlan =
    plan === "FREE" ? "STARTER" : plan === "STARTER" ? "GROWTH" : null;
  const nextName = nextPlan ? PLANS[nextPlan].name : "a higher plan";
  const nextDrafts = nextPlan
    ? autopilotMaxDraftsPerMonth(nextPlan)
    : autopilotMaxDraftsPerMonth("GROWTH");

  useEffect(() => {
    if (!atLimit) return;
    const key = `sf_upgrade_view:${surface}:autopilot_drafts:100`;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
      sessionStorage?.setItem(key, "1");
    } catch {
      /* private mode */
    }
    track("limit_hit", { surface, metric: "autopilot_drafts", threshold: 100 });
    track("upgrade_prompt_viewed", {
      surface,
      metric: "autopilot_drafts",
      threshold: 100,
      tone: "blocking",
    });
  }, [atLimit, surface]);

  if (!atLimit) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-ink"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            You&apos;ve used your {draftsCap} Autopilot draft
            {draftsCap === 1 ? "" : "s"} this month
          </p>
          <p className="mt-0.5 opacity-90">
            Upgrade to {nextName} for {nextDrafts} drafts
            {plan === "FREE" ? " and daily checks" : plan === "STARTER" ? " and twice-daily checks" : ""}
            . Existing drafts and settings stay put.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              href="/pricing"
              onClick={() =>
                track("upgrade_prompt_clicked", {
                  surface,
                  metric: "autopilot_drafts",
                  cta: "view_plans",
                })
              }
            >
              View plans
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-coral-solid text-white hover:bg-coral-hover">
            <Link
              href="/billing"
              onClick={() =>
                track("upgrade_prompt_clicked", {
                  surface,
                  metric: "autopilot_drafts",
                  cta: "upgrade",
                })
              }
            >
              Upgrade
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
