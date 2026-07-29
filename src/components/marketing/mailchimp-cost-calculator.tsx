"use client";

import { useState } from "react";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { getCompetitor } from "@/data/competitors";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

function pickSendfablePlan(contacts: number, monthlySends: number) {
  for (const key of PLAN_ORDER) {
    const p = PLANS[key];
    if (contacts <= p.contactCap && monthlySends <= p.emailsPerMonth) {
      return key;
    }
  }
  return "PRO_PLUS" as const;
}

function approxMailchimpMonthly(contacts: number): number | null {
  const mailchimp = getCompetitor("mailchimp");
  if (!mailchimp) return null;
  const numeric = mailchimp.tiers
    .filter((t) => typeof t.monthlyPrice === "number" && typeof t.contacts === "number")
    .map((t) => ({ contacts: t.contacts!, monthly: t.monthlyPrice as number }))
    .sort((a, b) => a.contacts - b.contacts);
  if (!numeric.length) return null;
  let chosen = numeric[0]!;
  for (const row of numeric) {
    if (contacts <= row.contacts) {
      chosen = row;
      break;
    }
    chosen = row;
  }
  // If contacts exceed last tier, return last known approx
  return chosen.monthly;
}

export function MailchimpCostCalculator() {
  const [contacts, setContacts] = useState(2_500);
  const [sends, setSends] = useState(10_000);
  const [annual, setAnnual] = useState(false);

  const planKey = pickSendfablePlan(contacts, sends);
  const plan = PLANS[planKey];
  const sfMonthly = annual && planKey !== "FREE" ? plan.yearlyPrice / 12 : plan.monthlyPrice;
  const mc = approxMailchimpMonthly(contacts);
  const diffMonthly = mc == null ? null : mc - sfMonthly;
  const mailchimp = getCompetitor("mailchimp");

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="calc-contacts">Contact count</Label>
          <Input
            id="calc-contacts"
            type="number"
            min={0}
            value={contacts}
            onChange={(e) => setContacts(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="calc-sends">Estimated monthly sends</Label>
          <Input
            id="calc-sends"
            type="number"
            min={0}
            value={sends}
            onChange={(e) => setSends(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
        <div className="flex flex-col justify-end">
          <Label className="mb-1">Billing</Label>
          <div className="inline-flex rounded-full border border-ink/15 p-1">
            <button
              type="button"
              className={`min-h-11 rounded-full px-4 text-sm ${!annual ? "bg-ink text-page" : "text-ink/70"}`}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-full px-4 text-sm ${annual ? "bg-ink text-page" : "text-ink/70"}`}
              onClick={() => setAnnual(true)}
            >
              Annual
            </button>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-parchment/70 p-4">
          <dt className="font-semibold text-ink">SendFable plan (fit)</dt>
          <dd className="mt-1 text-ink/80">
            {plan.name} — about ${sfMonthly.toFixed(0)}/mo
            {annual && planKey !== "FREE" ? " billed yearly" : ""}
          </dd>
          <dd className="mt-1 text-xs text-ink/55">
            Up to {plan.contactCap.toLocaleString()} contacts · {plan.emailsPerMonth.toLocaleString()}{" "}
            emails/mo
          </dd>
        </div>
        <div className="rounded-lg bg-parchment/70 p-4">
          <dt className="font-semibold text-ink">Approx. Mailchimp Standard</dt>
          <dd className="mt-1 text-ink/80">
            {mc == null ? "Unavailable" : `about $${mc}/mo`}
          </dd>
          <dd className="mt-1 text-xs text-ink/55">
            Approximate snapshot checked {mailchimp?.pricingLastChecked ?? "—"}. Not a quote.
          </dd>
        </div>
      </dl>

      {diffMonthly != null ? (
        <p className="mt-4 text-sm text-ink/80">
          Estimated monthly difference (Mailchimp − SendFable):{" "}
          <strong>
            {diffMonthly >= 0 ? `about $${diffMonthly.toFixed(0)}` : `about −$${Math.abs(diffMonthly).toFixed(0)}`}
          </strong>
          . Estimated annual difference:{" "}
          <strong>
            {diffMonthly >= 0
              ? `about $${(diffMonthly * 12).toFixed(0)}`
              : `about −$${Math.abs(diffMonthly * 12).toFixed(0)}`}
          </strong>
          . Promotions, overages, and plan choices can reverse this.
        </p>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        This calculator does not guarantee savings. Mailchimp pricing changes and may include trials or
        discounts. Verify on{" "}
        <a className="underline" href="https://mailchimp.com/pricing/" rel="noopener noreferrer">
          mailchimp.com/pricing
        </a>
        .
      </p>
    </div>
  );
}
