"use client";

/**
 * Soft upgrade prompt for Free plans near usage caps.
 * Shows at most one banner per page (emails preferred over contacts when both high).
 * Session-deduped analytics so trivial navigation does not spam impressions.
 */

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  crossedUsageThreshold,
  nextMonthlySendResetLabel,
  usagePromptCopy,
  type UsageMetric,
} from "@/lib/usage-thresholds";
import { track } from "@/lib/track";

export function UsageUpgradeBanner({
  planName,
  planIsFree,
  emailsUsed,
  emailsCap,
  contactsUsed,
  contactsCap,
  surface,
}: {
  planName: string;
  planIsFree: boolean;
  emailsUsed: number;
  emailsCap: number;
  contactsUsed: number;
  contactsCap: number;
  /** Where this banner is rendered — used for analytics + dedupe */
  surface: "dashboard" | "billing" | "campaigns" | "contacts";
}) {
  const pick = useMemo(() => {
    if (!planIsFree) return null;
    const emailT = crossedUsageThreshold(emailsUsed, emailsCap);
    const contactT = crossedUsageThreshold(contactsUsed, contactsCap);
    if (!emailT && !contactT) return null;
    const emailScore = emailT ?? 0;
    const contactScore = contactT ?? 0;
    const metric: UsageMetric = emailScore >= contactScore ? "emails" : "contacts";
    const used = metric === "emails" ? emailsUsed : contactsUsed;
    const cap = metric === "emails" ? emailsCap : contactsCap;
    const threshold = crossedUsageThreshold(used, cap)!;
    const copy = usagePromptCopy({
      metric,
      used,
      cap,
      planName,
      resetLabel: metric === "emails" && threshold >= 100 ? nextMonthlySendResetLabel() : null,
    });
    return { metric, used, cap, copy, threshold };
  }, [planIsFree, planName, emailsUsed, emailsCap, contactsUsed, contactsCap]);

  useEffect(() => {
    if (!pick) return;
    const key = `sf_upgrade_view:${surface}:${pick.metric}:${pick.threshold}`;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
      sessionStorage?.setItem(key, "1");
    } catch {
      /* private mode */
    }
    track("upgrade_prompt_viewed", {
      surface,
      metric: pick.metric,
      threshold: pick.threshold,
      tone: pick.copy.tone,
    });
  }, [pick, surface]);

  if (!pick) return null;

  const styles =
    pick.copy.tone === "blocking"
      ? "border-coral/40 bg-coral/10 text-ink"
      : pick.copy.tone === "prominent"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : "border-ink/10 bg-parchment/80 text-ink";

  const cta =
    pick.copy.tone === "blocking"
      ? "View plans"
      : pick.copy.tone === "prominent"
        ? "See options"
        : "View plans";

  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${styles}`} role="status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{pick.copy.title}</p>
          <p className="mt-0.5 opacity-90">{pick.copy.body}</p>
        </div>
        <Button asChild size="sm" className="shrink-0 bg-coral-solid text-white hover:bg-coral-hover">
          <Link
            href="/billing"
            onClick={() =>
              track("upgrade_prompt_clicked", {
                surface,
                metric: pick.metric,
                threshold: pick.threshold,
              })
            }
          >
            {cta}
          </Link>
        </Button>
      </div>
    </div>
  );
}
