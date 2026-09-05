"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ANNUAL_SAVINGS_LABEL,
  PAID_PLAN_ORDER,
  PLAN_ALLOWANCE_EXPLANATION,
  PLANS,
  annualEffectiveMonthly,
  mailchimpPriceFor,
  upToContacts,
  upToEmails,
  type PaidPlanKey,
} from "@/lib/plans";
import type { Plan } from "@prisma/client";
import { UsageUpgradeBanner } from "@/components/app/usage-upgrade-banner";
import { track } from "@/lib/track";

export default function BillingPage() {
  const [plan, setPlan] = useState<Plan>("FREE");
  const [annual, setAnnual] = useState(false);
  const [usage, setUsage] = useState({ emails: 0, contacts: 0 });
  const [loading, setLoading] = useState<string | null>(null);
  const [showBadgeValue, setShowBadgeValue] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/billing/status");
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setUsage(data.usage);
        setShowBadgeValue(Boolean(data.showNoBadgeValue));
      }
    })();
    track("pricing_from_app_viewed");
  }, []);

  async function checkout(target: PaidPlanKey) {
    setLoading(target);
    track("plan_cta_clicked", { plan: target, interval: annual ? "year" : "month" });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: target,
          interval: annual ? "year" : "month",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  async function portal() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Portal unavailable");
    window.location.href = data.url;
  }

  const current = PLANS[plan];
  const emailPct = Math.min(100, (usage.emails / current.emailsPerMonth) * 100);
  const contactPct = Math.min(100, (usage.contacts / current.contactCap) * 100);

  return (
    <div>
      <UsageUpgradeBanner
        planName={current.name}
        planIsFree={plan === "FREE"}
        emailsUsed={usage.emails}
        emailsCap={current.emailsPerMonth}
        contactsUsed={usage.contacts}
        contactsCap={current.contactCap}
        surface="billing"
      />
      <PageHeader title="Billing" description={`You're on the ${current.name} plan.`}>
        {plan !== "FREE" && (
          <Button variant="outline" onClick={() => void portal()}>
            Manage subscription
          </Button>
        )}
      </PageHeader>

      <div className="mb-8 max-w-lg rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Usage this calendar month</h3>
        <p className="mt-1 text-xs text-muted-foreground">{PLAN_ALLOWANCE_EXPLANATION}</p>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Emails (up to {current.emailsPerMonth.toLocaleString()})</span>
              <span>
                {usage.emails.toLocaleString()} / {current.emailsPerMonth.toLocaleString()}
              </span>
            </div>
            <Progress value={emailPct} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Contacts (up to {current.contactCap.toLocaleString()})</span>
              <span>
                {usage.contacts.toLocaleString()} / {current.contactCap.toLocaleString()}
              </span>
            </div>
            <Progress value={contactPct} />
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Label>Monthly</Label>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <Label>
          Annual <span className="text-muted-foreground">({ANNUAL_SAVINGS_LABEL})</span>
        </Label>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Paid plans renew automatically until canceled. Manage or cancel anytime in the Stripe
        Customer Portal — cancellation normally stops the next renewal at the end of the paid term
        and is not itself a refund. Refunds are not automatic or guaranteed except for duplicate or
        erroneous charges or where legally required; see the{" "}
        <a className="underline" href="/refund-policy">
          Billing &amp; Refund Policy
        </a>
        . Also see{" "}
        <a className="underline" href="/terms">
          Terms
        </a>
        ,{" "}
        <a className="underline" href="/privacy">
          Privacy
        </a>
        , and{" "}
        <a className="underline" href="mailto:support@sendfable.com">
          support@sendfable.com
        </a>
        . Public checkout may be temporarily unavailable during maintenance. Owner-controlled
        Checkout remains available when configured.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PAID_PLAN_ORDER.map((key) => {
          const p = PLANS[key];
          const price = annual ? annualEffectiveMonthly(key) : p.monthlyPrice;
          const mc = mailchimpPriceFor(p.contactCap);
          const savings = mc - p.monthlyPrice;
          return (
            <div key={key} className="rounded-xl border bg-white p-6">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">${price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              {annual && <p className="mt-1 text-xs text-teal">${p.yearlyPrice}/year</p>}
              <p className="mt-1 text-sm text-emerald-700">Save ~${savings}/mo vs. Mailchimp</p>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>{upToContacts(key)}</li>
                <li>{upToEmails(key)}</li>
                {p.customDomains && <li>Custom domain auth</li>}
                {showBadgeValue && !p.badge && <li>No platform badge</li>}
              </ul>
              <Button
                className="mt-6 w-full"
                disabled={plan === key || loading === key}
                onClick={() => void checkout(key)}
              >
                {plan === key ? "Current plan" : loading === key ? "Redirecting…" : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Need more than {PLANS.PRO_PLUS.contactCap.toLocaleString()} contacts or{" "}
        {PLANS.PRO_PLUS.emailsPerMonth.toLocaleString()} emails per month?{" "}
        <Link href="/contact" className="underline">
          Contact us for a custom plan
        </Link>
        .
      </p>
    </div>
  );
}
