"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PLANS, mailchimpPriceFor } from "@/lib/plans";
import type { Plan } from "@prisma/client";

export default function BillingPage() {
  const [plan, setPlan] = useState<Plan>("FREE");
  const [annual, setAnnual] = useState(false);
  const [usage, setUsage] = useState({ emails: 0, contacts: 0 });
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/billing/status");
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setUsage(data.usage);
      }
    })();
  }, []);

  async function checkout(target: "STARTER" | "GROWTH" | "PRO") {
    setLoading(target);
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

  const tiers: Array<"STARTER" | "GROWTH" | "PRO"> = ["STARTER", "GROWTH", "PRO"];

  return (
    <div>
      <PageHeader
        title="Billing"
        description={`You're on the ${current.name} plan.`}
      >
        {plan !== "FREE" && (
          <Button variant="outline" onClick={() => void portal()}>
            Manage subscription
          </Button>
        )}
      </PageHeader>

      <div className="mb-8 max-w-lg rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Usage this month</h3>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Emails</span>
              <span>
                {usage.emails.toLocaleString()} / {current.emailsPerMonth.toLocaleString()}
              </span>
            </div>
            <Progress value={emailPct} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Contacts</span>
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
        <Label>Annual <span className="text-muted-foreground">(2 months free)</span></Label>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((key) => {
          const p = PLANS[key];
          const price = annual ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice;
          const mc = mailchimpPriceFor(p.contactCap);
          const savings = mc - p.monthlyPrice;
          return (
            <div key={key} className="rounded-xl border bg-white p-6">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">${price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-sm text-emerald-700">
                Save ~${savings}/mo vs. Mailchimp
              </p>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>{p.emailsPerMonth.toLocaleString()} emails/mo</li>
                <li>{p.contactCap.toLocaleString()} contacts</li>
                {p.customDomains && <li>Custom domain auth</li>}
                {p.seats > 1 && <li>{p.seats} team seats</li>}
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
    </div>
  );
}
