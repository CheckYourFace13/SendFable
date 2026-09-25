"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  allMatrixRows,
  estimateMonthlyAt,
  PRICING_MATRIX_VERIFIED,
  type PricingMatrixRow,
} from "@/data/competitors/pricing-matrix";
import { PLANS, sendfablePlanFor } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";

const CONTACT_OPTIONS = [250, 500, 1_000, 2_500, 5_000, 10_000, 20_000, 40_000] as const;

type Needs = "simple" | "automation" | "ecommerce" | "creator" | "crm";

export function PricingComparisonCalculator({ smsPublic = false }: { smsPublic?: boolean }) {
  const [contacts, setContacts] = useState<number>(2_500);
  const [emails, setEmails] = useState(10_000);
  const [sms, setSms] = useState<"yes" | "no">("no");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [needs, setNeeds] = useState<Needs>("simple");
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      return;
    }
    trackEvent("pricing_comparison_use", {
      contacts,
      emails,
      sms,
      billing,
      needs,
    });
  }, [contacts, emails, sms, billing, needs]);

  const rows = useMemo(() => allMatrixRows({ smsPublic }), [smsPublic]);
  const sf = sendfablePlanFor(contacts);
  const sfMonthly = sf.price;
  const sfDisplay =
    billing === "annual" && sf.plan !== "FREE"
      ? Math.round((PLANS[sf.plan].yearlyPrice / 12) * 100) / 100
      : sfMonthly;

  const comparisons = useMemo(() => {
    return rows
      .filter((r) => r.id !== "sendfable")
      .map((r) => {
        const est = estimateMonthlyAt(r, contacts);
        const monthlyDiff =
          est.price !== null && Number.isFinite(est.price) ? est.price - sfDisplay : null;
        return { row: r, est, monthlyDiff };
      })
      .filter((c) => {
        if (needs === "ecommerce") return ["klaviyo", "omnisend", "mailchimp"].includes(c.row.id);
        if (needs === "creator") return ["kit", "beehiiv", "flodesk", "mailerlite"].includes(c.row.id);
        if (needs === "crm") return ["hubspot", "activecampaign", "klaviyo"].includes(c.row.id);
        if (needs === "automation")
          return ["activecampaign", "getresponse", "mailchimp", "brevo"].includes(c.row.id);
        return true;
      });
  }, [rows, contacts, sfDisplay, needs]);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-ink">Price comparison calculator</h2>
      <p className="mt-2 text-sm text-ink/65">
        Estimates use dated public snapshots ({PRICING_MATRIX_VERIFIED}). We do not claim savings when
        a vendor’s price is uncertain.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium text-ink">Contacts</span>
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 bg-page px-3 py-2"
            value={contacts}
            onChange={(e) => setContacts(Number(e.target.value))}
          >
            {CONTACT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Monthly emails</span>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-page px-3 py-2"
            value={emails}
            onChange={(e) => setEmails(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Text messaging</span>
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 bg-page px-3 py-2"
            value={sms}
            onChange={(e) => setSms(e.target.value as "yes" | "no")}
          >
            <option value="no">No</option>
            <option value="yes">Yes (note: SendFable SMS not public yet)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Billing</span>
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 bg-page px-3 py-2"
            value={billing}
            onChange={(e) => setBilling(e.target.value as "monthly" | "annual")}
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual (SendFable effective)</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-ink">Primary need</span>
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 bg-page px-3 py-2"
            value={needs}
            onChange={(e) => setNeeds(e.target.value as Needs)}
          >
            <option value="simple">Simple campaigns</option>
            <option value="automation">Automation</option>
            <option value="ecommerce">Ecommerce</option>
            <option value="creator">Creator / newsletter</option>
            <option value="crm">CRM-heavy</option>
          </select>
        </label>
      </div>

      <div className="mt-8 rounded-xl bg-parchment p-5">
        <div className="text-sm font-medium text-ink/70">SendFable fit</div>
        <div className="mt-1 font-display text-3xl font-bold text-ink">
          {sf.plan === "FREE" ? "Free" : PLANS[sf.plan].name} · ${sfDisplay}
          <span className="text-base font-normal text-ink/60">/mo</span>
        </div>
        <p className="mt-2 text-sm text-ink/65">
          Up to {PLANS[sf.plan].contactCap.toLocaleString()} contacts ·{" "}
          {PLANS[sf.plan].emailsPerMonth.toLocaleString()} emails/mo
          {emails > PLANS[sf.plan].emailsPerMonth
            ? ` — your ${emails.toLocaleString()} emails/mo may need a higher plan or reduced volume`
            : ""}
          {sms === "yes"
            ? smsPublic
              ? " · Text is a separate add-on (Email, Text, or Both)"
              : " · SMS not publicly available on SendFable yet"
            : ""}
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          onClick={() => trackEvent("competitor_cta_click", { source: "pricing_calculator" })}
        >
          Start free — no credit card
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-ink/60">
              <th className="py-2 pr-3 font-medium">Provider</th>
              <th className="py-2 pr-3 font-medium">Est. monthly</th>
              <th className="py-2 pr-3 font-medium">vs SendFable</th>
              <th className="py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map(({ row, est, monthlyDiff }) => (
              <ComparisonRow key={row.id} row={row} est={est} monthlyDiff={monthlyDiff} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonRow({
  row,
  est,
  monthlyDiff,
}: {
  row: PricingMatrixRow;
  est: { price: number | null; label: string };
  monthlyDiff: number | null;
}) {
  return (
    <tr className="border-b border-ink/5">
      <td className="py-3 pr-3 font-medium text-ink">
        {row.compareHref ? (
          <Link href={row.compareHref} className="text-coral hover:underline">
            {row.name}
          </Link>
        ) : (
          row.name
        )}
      </td>
      <td className="py-3 pr-3">{est.label}</td>
      <td className="py-3 pr-3">
        {monthlyDiff === null ? (
          <span className="text-ink/50">Not claimed</span>
        ) : monthlyDiff > 0 ? (
          <span>
            ~${monthlyDiff.toFixed(0)}/mo more
            <span className="block text-xs text-ink/50">
              ~${(monthlyDiff * 12).toFixed(0)}/yr more
            </span>
          </span>
        ) : monthlyDiff < 0 ? (
          <span>
            ~${Math.abs(monthlyDiff).toFixed(0)}/mo less than SF
            <span className="block text-xs text-ink/50">Competitor cheaper at this estimate</span>
          </span>
        ) : (
          "Similar"
        )}
      </td>
      <td className="py-3 text-ink/60">
        {row.confidence === "exact"
          ? "Exact"
          : row.confidence === "approximate"
            ? "Approximate"
            : "Varies"}{" "}
        ·{" "}
        <a href={row.pricingUrl} className="underline" rel="nofollow noopener" target="_blank">
          Official
        </a>
      </td>
    </tr>
  );
}
