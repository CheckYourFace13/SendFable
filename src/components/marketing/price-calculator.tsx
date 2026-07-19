"use client";

import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { mailchimpPriceFor, sendfablePlanFor } from "@/lib/plans";
import { formatNumber } from "@/lib/utils";

export function PriceCalculator() {
  const [contacts, setContacts] = useState(2500);

  const comparison = useMemo(() => {
    const sf = sendfablePlanFor(contacts);
    const mc = mailchimpPriceFor(contacts);
    return { sf, mc, savings: Math.max(0, mc - sf.price) };
  }, [contacts]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Your list size</div>
          <div className="text-3xl font-bold tracking-tight">{formatNumber(contacts)}</div>
        </div>
        <div className="text-right text-sm text-emerald-700">
          Save ${comparison.savings}/mo
        </div>
      </div>
      <Slider
        className="mt-6"
        min={500}
        max={30000}
        step={500}
        value={[contacts]}
        onValueChange={([v]) => setContacts(v)}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-indigo-50 p-5">
          <div className="text-sm font-medium text-indigo-900">Sendfable</div>
          <div className="mt-1 text-3xl font-bold text-indigo-950">
            ${comparison.sf.price}
            <span className="text-base font-normal text-indigo-700">/mo</span>
          </div>
          <div className="mt-1 text-sm text-indigo-800">{comparison.sf.plan} plan</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-5">
          <div className="text-sm font-medium text-slate-600">Typical Mailchimp</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            ${comparison.mc}
            <span className="text-base font-normal text-slate-500">/mo</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">Standard-tier estimate</div>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Mailchimp prices as of 2026 — verify on mailchimp.com. Estimates use published Standard-plan
        contact tiers; your quote may differ.
      </p>
    </div>
  );
}
