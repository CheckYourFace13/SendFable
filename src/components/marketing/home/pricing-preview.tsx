"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";

const ORDER: Plan[] = ["FREE", "STARTER", "GROWTH", "PRO"];

function planBlurb(plan: Plan): string[] {
  const p = PLANS[plan];
  const lines = [
    `${p.emailsPerMonth.toLocaleString()} emails/mo`,
    `${p.contactCap.toLocaleString()} contacts`,
  ];
  if (p.customDomains) lines.push("Custom domain auth");
  if (p.seats > 1) lines.push(`${p.seats} team seats`);
  if (p.badge) lines.push("Sent with Sendfable badge");
  else lines.push("No platform badge");
  return lines;
}

export function PricingPreview({
  embedded = false,
  showFullLink = true,
}: {
  embedded?: boolean;
  showFullLink?: boolean;
}) {
  const [annual, setAnnual] = useState(false);

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

          <div
            className="mt-8 inline-flex rounded-full border border-ink/15 bg-page p-1"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              aria-pressed={!annual}
              onClick={() => setAnnual(false)}
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
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
                "min-h-10 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                annual ? "bg-ink text-page" : "text-ink/70"
              )}
            >
              Annual
            </button>
          </div>
        </div>
        )}

        {embedded && (
          <div
            className="mb-8 flex justify-center"
            role="group"
            aria-label="Billing period"
          >
            <div className="inline-flex rounded-full border border-ink/15 bg-page p-1">
              <button
                type="button"
                aria-pressed={!annual}
                onClick={() => setAnnual(false)}
                className={cn(
                  "min-h-10 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
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
                  "min-h-10 rounded-full px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                  annual ? "bg-ink text-page" : "text-ink/70"
                )}
              >
                Annual
              </button>
            </div>
          </div>
        )}

        <ul className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ORDER.map((key) => {
            const p = PLANS[key];
            const recommended = key === "GROWTH";
            const price = annual
              ? key === "FREE"
                ? 0
                : Math.round(p.yearlyPrice / 12)
              : p.monthlyPrice;

            return (
              <li
                key={key}
                className={cn(
                  "flex flex-col rounded-xl border-2 p-6",
                  recommended
                    ? "border-coral bg-page shadow-lg"
                    : "border-ink/10 bg-page"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl text-ink">{p.name}</h3>
                  {recommended && (
                    <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-coral-solid">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-ink">${price}</span>
                  <span className="text-sm text-ink/55">
                    {key === "FREE" ? "" : annual ? "/mo billed yearly" : "/mo"}
                  </span>
                </div>
                {annual && key !== "FREE" && (
                  <p className="mt-1 text-xs text-teal">${p.yearlyPrice}/yr</p>
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
                  <Link href="/signup">{key === "FREE" ? "Start writing free" : "Get started"}</Link>
                </Button>
              </li>
            );
          })}
        </ul>

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
