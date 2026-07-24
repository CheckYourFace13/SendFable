"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type GoalId = "announce" | "event" | "offer" | "winback" | "newsletter" | "welcome";

const GOALS: Array<{
  id: GoalId;
  label: string;
  template: string;
  audience: string;
  subject: string;
  cta: string;
  features: string[];
  accent: string;
}> = [
  {
    id: "announce",
    label: "Announce something",
    template: "Grand opening",
    audience: "Full list + locals tag",
    subject: "We’re open — come say hello",
    cta: "See what’s new",
    features: ["Announcement template", "Send Confidence", "Reply-to your address"],
    accent: "bg-coral",
  },
  {
    id: "event",
    label: "Promote an event",
    template: "Event invite",
    audience: "Events segment",
    subject: "You’re invited this Saturday",
    cta: "Reserve a spot",
    features: ["Date & location blocks", "RSVP-friendly CTA", "Reminder follow-up"],
    accent: "bg-teal",
  },
  {
    id: "offer",
    label: "Share an offer",
    template: "Limited offer",
    audience: "Engaged in 90 days",
    subject: "This weekend only — for you",
    cta: "Claim the offer",
    features: ["Offer callout block", "Clear end date", "Click tracking"],
    accent: "bg-ink",
  },
  {
    id: "winback",
    label: "Bring customers back",
    template: "Win-back",
    audience: "Quiet 60+ days",
    subject: "We miss you — here’s a little something",
    cta: "Come back",
    features: ["Quiet-audience segment", "Gentle tone templates", "Suppression-safe sends"],
    accent: "bg-coral",
  },
  {
    id: "newsletter",
    label: "Send a newsletter",
    template: "Weekly digest",
    audience: "Newsletter subscribers",
    subject: "What’s happening this week",
    cta: "Read more",
    features: ["Multi-story layout", "Recurring schedule", "Link performance"],
    accent: "bg-teal",
  },
  {
    id: "welcome",
    label: "Welcome new subscribers",
    template: "Welcome series",
    audience: "Joined in last 7 days",
    subject: "Welcome — here’s what to expect",
    cta: "Get started",
    features: ["Welcome template", "Expectation-setting copy", "Brand color import"],
    accent: "bg-ink",
  },
];

export function GoalPicker() {
  const [active, setActive] = useState<GoalId>("announce");
  const goal = GOALS.find((g) => g.id === active)!;

  return (
    <section className="border-b border-ink/10 bg-parchment py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-md text-ink text-balance">
            What are you trying to share?
          </h2>
          <p className="mt-3 text-charcoal/75">
            Pick a goal and see a ready-made starting point — template, audience, subject, and CTA.
          </p>
        </div>

        <div
          className="mt-10 flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Campaign goals"
        >
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={active === g.id}
              onClick={() => setActive(g.id)}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                active === g.id
                  ? "border-ink bg-ink text-page"
                  : "border-ink/15 bg-page text-ink hover:border-ink/30"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div
          className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          role="tabpanel"
          aria-label={`${goal.label} preview`}
        >
          <div className="overflow-hidden rounded-xl border-2 border-ink/10 bg-page shadow-lg">
            <div className="border-b border-ink/10 bg-page px-4 py-3">
              <p className="text-xs text-ink/70">Subject</p>
              <p className="font-medium text-ink">{goal.subject}</p>
            </div>
            <div className="space-y-3 bg-parchment/40 p-6">
              <div className={cn("h-2 w-20 rounded", goal.accent)} />
              <p className="font-display text-xl text-ink">{goal.template}</p>
              <div className="h-28 rounded-lg bg-lavender/60" />
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
            <div className="rounded-xl border-2 border-ink/10 bg-page p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                Suggested audience
              </p>
              <p className="mt-1 text-lg text-ink">{goal.audience}</p>
            </div>
            <div className="rounded-xl border-2 border-ink/10 bg-page p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                Recommended CTA
              </p>
              <p className="mt-1 text-lg text-ink">{goal.cta}</p>
            </div>
            <div className="rounded-xl border-2 border-ink/10 bg-ink p-5 text-page">
              <p className="text-xs font-semibold uppercase tracking-wider text-page/50">
                Helpful features
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {goal.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
