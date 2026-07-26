"use client";

/**
 * Admin-only SMS area (owner). The API behind this page 404s while
 * SENDFABLE_SMS_ADMIN_ENABLED=false and 403s for non-owners — the page
 * itself grants nothing.
 */

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";

interface SmsAdminRow {
  workspaceId: string;
  workspaceName: string;
  plan: string;
  status: string;
  emailPlan: string;
  textOnly: boolean;
  bundleDiscount: string;
  billedMonthly: string;
  registrationStatus: string;
  numberStatus: string;
  outboundSegments: number;
  inboundSegments: number;
  includedInbound: number;
  inboundOverage: number;
  revenue: string;
  providerCost: string;
  grossProfit: string;
  marginPercent: string;
  deliveryFailures: number;
  optOutRate: string;
  warnings: string[];
  exceptionalCharges: Array<{ id: string; type: string; customerAmount: string; status: string }>;
  reconciledAt: string | null;
}

export default function AdminSmsPage() {
  const [data, setData] = useState<{
    month: string;
    customers: SmsAdminRow[];
    flags: Record<string, boolean>;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/sms");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Forbidden");
        return;
      }
      setData(json);
    })();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}. The SMS admin area is owner-only and flag-gated.
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Text messaging — admin"
        description={`SMS customers, usage, margins and controls for ${data.month}.`}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold">Feature flags</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(data.flags).map(([k, v]) => (
            <span
              key={k}
              className={`rounded px-2 py-1 ${v ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-600"}`}
            >
              {k.replace("SENDFABLE_SMS_", "").replace("_ENABLED", "")}: {v ? "on" : "off"}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          SMS customers ({data.customers.length})
        </h2>
        {!data.customers.length ? (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            No SMS subscriptions exist yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Workspace", "Plan", "Status", "Email plan", "Bundle", "Billed/mo",
                    "Registration", "Number", "Out segs", "In segs", "Included", "Overage",
                    "Revenue", "Provider cost", "Gross profit", "Margin", "Failures", "Opt-out rate",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.workspaceId} className="border-t">
                    <td className="px-3 py-2">
                      {c.workspaceName}
                      {c.textOnly && (
                        <span className="ml-1 rounded bg-indigo-100 px-1 text-[10px] text-indigo-800">text-only</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{c.plan}</td>
                    <td className="px-3 py-2">{c.status}</td>
                    <td className="px-3 py-2">{c.emailPlan}</td>
                    <td className="px-3 py-2">{c.bundleDiscount}</td>
                    <td className="px-3 py-2">{c.billedMonthly}</td>
                    <td className="px-3 py-2">{c.registrationStatus}</td>
                    <td className="px-3 py-2">{c.numberStatus}</td>
                    <td className="px-3 py-2">{c.outboundSegments}</td>
                    <td className="px-3 py-2">{c.inboundSegments}</td>
                    <td className="px-3 py-2">{c.includedInbound}</td>
                    <td className="px-3 py-2">{c.inboundOverage}</td>
                    <td className="px-3 py-2">{c.revenue}</td>
                    <td className="px-3 py-2">{c.providerCost}</td>
                    <td className="px-3 py-2">{c.grossProfit}</td>
                    <td className="px-3 py-2">{c.marginPercent}</td>
                    <td className="px-3 py-2">{c.deliveryFailures}</td>
                    <td className="px-3 py-2">{c.optOutRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.customers.some((c) => c.warnings.length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-amber-700">Margin & anomaly warnings</h2>
          <ul className="space-y-1 text-sm">
            {data.customers.flatMap((c) =>
              c.warnings.map((w, i) => (
                <li key={`${c.workspaceId}-${i}`} className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <span className="font-medium">{c.workspaceName}:</span> {w}
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {data.customers.some((c) => c.exceptionalCharges.length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Exceptional charges</h2>
          <ul className="space-y-1 text-sm">
            {data.customers.flatMap((c) =>
              c.exceptionalCharges.map((e) => (
                <li key={e.id} className="rounded border px-3 py-2">
                  {c.workspaceName}: {e.type} — {e.customerAmount} ({e.status})
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Controls (hold sending, approve/reject exceptional charges, plan change, number release,
        provider reconciliation) run through POST /api/admin/sms/actions and are audit-logged.
      </p>
    </div>
  );
}
