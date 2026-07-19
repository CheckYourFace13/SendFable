import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS, mailchimpPriceFor } from "@/lib/plans";
import { PriceCalculator } from "@/components/marketing/price-calculator";

export const metadata = { title: "Pricing" };

const PAID = ["STARTER", "GROWTH", "PRO"] as const;

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when your list grows — still roughly half of Mailchimp.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Free</h2>
          <div className="mt-2 text-3xl font-bold">$0</div>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            <li>{PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo</li>
            <li>{PLANS.FREE.contactCap.toLocaleString()} contacts</li>
            <li>Sent with Sendfable badge</li>
          </ul>
          <Button asChild className="mt-6 w-full" variant="outline">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
        {PAID.map((key) => {
          const p = PLANS[key];
          const savings = mailchimpPriceFor(p.contactCap) - p.monthlyPrice;
          return (
            <div key={key} className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <div className="mt-2 text-3xl font-bold">
                ${p.monthlyPrice}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-sm text-emerald-700">Save ~${savings}/mo vs Mailchimp</p>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>{p.emailsPerMonth.toLocaleString()} emails/mo</li>
                <li>{p.contactCap.toLocaleString()} contacts</li>
                {p.customDomains && <li>Custom domain auth</li>}
                {p.seats > 1 && <li>{p.seats} team seats</li>}
                <li>or ${p.yearlyPrice}/yr</li>
              </ul>
              <Button asChild className="mt-6 w-full">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="mb-6 text-center text-2xl font-bold">Compare for your list</h2>
        <PriceCalculator />
      </div>
    </div>
  );
}
