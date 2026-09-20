"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CAMPAIGN_GOALS, type CampaignGoal } from "@/lib/campaign-goals";

const PREVIEWS: Record<
  Exclude<CampaignGoal, "scratch">,
  { template: string; audience: string; subject: string; cta: string; features: string[]; accent: string }
> = {
  announce: {
    template: "Grand opening",
    audience: "Full list",
    subject: "We're open — come say hello",
    cta: "See what's new",
    features: ["Announcement template", "Send Confidence", "Reply-to your address"],
    accent: "bg-coral",
  },
  sale: {
    template: "Weekend sale / event",
    audience: "Engaged in 90 days",
    subject: "This weekend only",
    cta: "Shop the sale",
    features: ["Offer callout", "Clear end date", "Click tracking"],
    accent: "bg-teal",
  },
  winback: {
    template: "Win-back",
    audience: "Quiet 60+ days",
    subject: "We miss you",
    cta: "Come back",
    features: ["Quiet-audience segment", "Gentle tone", "Suppression-safe"],
    accent: "bg-coral",
  },
  news: {
    template: "Monthly newsletter",
    audience: "Newsletter subscribers",
    subject: "What's happening this week",
    cta: "Read more",
    features: ["Multi-story layout", "Mobile preview", "Link performance"],
    accent: "bg-teal",
  },
  welcome: {
    template: "Welcome",
    audience: "Joined in last 7 days",
    subject: "Welcome — here's what to expect",
    cta: "Get started",
    features: ["Welcome template", "Expectation-setting", "Brand color import"],
    accent: "bg-ink",
  },
};

export function GoalPicker() {
  const goals = CAMPAIGN_GOALS.filter((g) => g.id !== "scratch");
  const [active, setActive] = useState<Exclude<CampaignGoal, "scratch">>("announce");
  const meta = goals.find((g) => g.id === active)!;
  const goal = PREVIEWS[active];

  return (
    <section className="section-mist border-b border-ink/10 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-md text-ink text-balance">
            Not sure what to write?
          </h2>
          <p className="mt-3 text-charcoal/75">
            Pick a goal. We suggest a template, subject, and next step, then you finish in your
            account.
          </p>
        </div>

        <div
          className="mt-10 flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Campaign goals"
        >
          {goals.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={active === g.id}
              onClick={() => setActive(g.id as Exclude<CampaignGoal, "scratch">)}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                active === g.id
                  ? "border-ink bg-ink text-page"
                  : "border-ink/15 bg-surface text-ink hover:border-ink/30"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div
          className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          role="tabpanel"
          aria-label={`${meta.label} preview`}
        >
          <div className="overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-sm">
            <div className="border-b border-ink/10 px-4 py-3">
              <p className="text-xs text-ink/70">Subject</p>
              <p className="font-medium text-ink">{goal.subject}</p>
            </div>
            <div className="space-y-3 bg-parchment/50 p-6">
              <div className={cn("h-2 w-20 rounded", goal.accent)} />
              <p className="font-display text-xl text-ink">{goal.template}</p>
              <div className="h-28 rounded-lg bg-parchment" />
              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-ink/10" />
                <div className="h-2 w-5/6 rounded bg-ink/10" />
                <div className="h-2 w-2/3 rounded bg-ink/10" />
              </div>
              <div className="inline-block rounded-md bg-coral-solid px-4 py-2 text-sm font-semibold text-white">
                {goal.cta}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-ink/10 bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                Suggested audience
              </p>
              <p className="mt-1 text-lg text-ink">{goal.audience}</p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">Goal</p>
              <p className="mt-1 text-sm text-charcoal/80">{meta.description}</p>
            </div>
            <div className="rounded-xl border border-ink/10 bg-ink p-5 text-page">
              <p className="text-xs font-semibold uppercase tracking-wider text-page/50">
                Included when you start
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {goal.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?goal=${active}`}
                className="mt-5 inline-flex min-h-11 items-center rounded-md bg-coral-solid px-4 text-sm font-semibold text-white hover:bg-coral-hover"
              >
                Start with this goal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
