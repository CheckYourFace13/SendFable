"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ANNUAL_SAVINGS_LABEL,
  PLAN_ALLOWANCE_EXPLANATION,
  PLAN_ORDER,
  PLANS,
  annualEffectiveMonthly,
  upToContacts,
  upToEmails,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";

function planBlurb(plan: Plan): string[] {
  const p = PLANS[plan];
  const lines = [upToContacts(plan), upToEmails(plan)];
  if (p.badge) lines.push("Sent with SendFable badge");
  else lines.push("No platform badge");
  if (p.customDomains) lines.push("Custom domain authentication");
  // Team seats exist in code for Pro / Pro Plus but are not advertised publicly
  // while invites remain early-launch / SES constrained.
  return lines;
}

/** Early-access CTA — public signup and public Checkout remain locked. */
const PRICING_CTA_HREF = "/early-access";

export function PricingPreview({
  embedded = false,
  showFullLink = true,
}: {
  embedded?: boolean;
  showFullLink?: boolean;
}) {
  const [annual, setAnnual] = useState(false);

  const toggle = (
    <div
      className="inline-flex rounded-full border border-ink/15 bg-page p-1"
      role="group"
      aria-label="Billing period"
    >
      <button
        type="button"
        aria-pressed={!annual}
        onClick={() => setAnnual(false)}
        className={cn(
          "min-h-11 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
          !annual ? "bg-ink text-page" : "text-ink/70"
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        aria-pressed={annual}
        onClick={() => setAnnual(true)}
        className={cn(
          "min-h-11 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
          annual ? "bg-ink text-page" : "text-ink/70"
        )}
      >
        Annual
      </button>
    </div>
  );

  const inner = (
    <div className={cn(!embedded && "mx-auto max-w-6xl px-4 sm:px-6")}>
      {!embedded && (
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-md text-ink text-balance">
            Clear pricing. Start free.
          </h2>
          <p className="mt-3 text-charcoal/75">
            Limits you can read. Upgrade when your list grows — no mystery add-ons on this page.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            {toggle}
            {annual && <p className="text-sm text-teal">{ANNUAL_SAVINGS_LABEL}</p>}
          </div>
        </div>
      )}

      {embedded && (
        <div className="mb-8 flex flex-col items-center gap-2">
          {toggle}
          {annual && <p className="text-sm text-teal">{ANNUAL_SAVINGS_LABEL}</p>}
        </div>
      )}

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {PLAN_ORDER.map((key) => {
          const p = PLANS[key];
          const recommended = key === "GROWTH";
          const price = annual
            ? key === "FREE"
              ? 0
              : annualEffectiveMonthly(key)
            : p.monthlyPrice;

          return (
            <li
              key={key}
              className={cn(
                "flex min-w-0 flex-col rounded-xl border-2 p-5 sm:p-6",
                recommended ? "border-coral bg-page shadow-lg" : "border-ink/10 bg-page"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-xl text-ink">{p.name}</h3>
                {recommended && (
                  <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-coral-solid">
                    Recommended
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-1">
                <span className="font-display text-4xl text-ink">${price}</span>
                <span className="text-sm text-ink/55">
                  {key === "FREE" ? "" : annual ? "/mo billed yearly" : "/mo"}
                </span>
              </div>
              {annual && key !== "FREE" && (
                <p className="mt-1 text-xs text-teal">${p.yearlyPrice}/year</p>
              )}
              <ul className="mt-5 flex-1 space-y-1.5 text-sm text-charcoal/75">
                {planBlurb(key).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  "mt-6 w-full",
                  recommended
                    ? "bg-coral-solid text-white hover:bg-coral-hover"
                    : "border-ink/20 bg-page text-ink hover:bg-parchment"
                )}
                variant={recommended ? "default" : "outline"}
              >
                <Link href={PRICING_CTA_HREF}>
                  {key === "FREE" ? "Request early access" : "Request early access"}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>

      <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-ink/70">
        {PLAN_ALLOWANCE_EXPLANATION}
      </p>
      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-ink/70">
        Need more than {PLANS.PRO_PLUS.contactCap.toLocaleString()} contacts or{" "}
        {PLANS.PRO_PLUS.emailsPerMonth.toLocaleString()} emails per month?{" "}
        <Link href="/contact" className="font-medium text-coral underline-offset-2 hover:underline">
          Contact us for a custom plan
        </Link>
        .
      </p>

      {showFullLink && (
        <p className="mt-8 text-center text-sm text-ink/70">
          <Link href="/pricing" className="font-medium text-coral motion-underline">
            See full pricing details
          </Link>
        </p>
      )}
    </div>
  );

  if (embedded) return inner;
  return (
    <section className="border-b border-ink/10 bg-parchment py-20 sm:py-24">
      {inner}
    </section>
  );
}
