"use client";

/**
 * Admin compliance review queue (SF-019B/H). EIN never shown in list or detail.
 */

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import Link from "next/link";

interface ListItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  legalEntityName: string | null;
  dbaBrandName: string | null;
  reviewStatus: string;
  selectedPlan: string | null;
  submittedAt: string | null;
  einOnFile: boolean;
}

export default function AdminSmsCompliancePage() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState({
    restrictedContentOk: false,
    prohibitedUseOk: false,
    dataCompleteOk: false,
    providerReadyOk: false,
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sms/compliance");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setItems(json.items || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    const res = await fetch(`/api/admin/sms/compliance?id=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Load failed");
      return;
    }
    setSelected(json.profile);
    setNote("");
  }

  async function transition(toStatus: string) {
    if (!selected?.id) return;
    const res = await fetch("/api/admin/sms/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: selected.id,
        toStatus,
        note,
        ...checks,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Transition failed");
      return;
    }
    setSelected(json.profile);
    await load();
  }

  if (error && !items.length && !selected) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="SMS compliance queue"
        description="Internal review before any provider submission. EIN/BRN never shown here."
      />
      <p className="text-sm">
        <Link className="underline" href="/admin/sms">
          ← SMS admin overview
        </Link>
      </p>
      {error && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              {["Workspace", "Legal name", "DBA", "Plan", "Status", "EIN on file", "Submitted"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void openDetail(it.id)}
                  >
                    {it.workspaceName}
                  </button>
                </td>
                <td className="px-3 py-2">{it.legalEntityName}</td>
                <td className="px-3 py-2">{it.dbaBrandName}</td>
                <td className="px-3 py-2">{it.selectedPlan}</td>
                <td className="px-3 py-2">{it.reviewStatus}</td>
                <td className="px-3 py-2">{it.einOnFile ? "yes" : "no"}</td>
                <td className="px-3 py-2">
                  {it.submittedAt ? new Date(it.submittedAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                  No compliance profiles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <section className="space-y-4 rounded-xl border p-5 text-sm">
          <h2 className="font-semibold">
            Review — {(selected.legalEntityName as string) || "Untitled"}
          </h2>
          <p>
            Status: <strong>{String(selected.reviewStatus)}</strong> · Plan:{" "}
            {String(selected.selectedPlan || "—")} · EIN on file:{" "}
            {selected.einOnFile ? "yes" : "no"}
          </p>
          <ul className="grid gap-1 text-xs md:grid-cols-2">
            <li>Website: {String(selected.websiteUrl || "—")}</li>
            <li>Privacy: {String(selected.privacyPolicyUrl || "—")}</li>
            <li>SMS Terms: {String(selected.smsTermsUrl || "—")}</li>
            <li>Use case: {String(selected.smsUseCase || "—")}</li>
            <li>Volume: {String(selected.estimatedMonthlyVolume ?? "—")}</li>
            <li>
              Fee est:{" "}
              {selected.feeEstimate
                ? `$${(Number((selected.feeEstimate as { oneTimeCents: number }).oneTimeCents) / 100).toFixed(2)}`
                : "—"}
            </li>
            <li>
              Margin est:{" "}
              {selected.marginEstimateBp != null
                ? `${(Number(selected.marginEstimateBp) / 100).toFixed(1)}%`
                : "—"}
            </li>
          </ul>
          <div className="rounded bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            <p className="font-medium">Opt-in</p>
            {String(selected.optInDescription || "")}
            <p className="mt-2 font-medium">Samples</p>
            {String(selected.sampleMessage1 || "")}
            {"\n"}
            {String(selected.sampleMessage2 || "")}
            <p className="mt-2 font-medium">HELP / STOP</p>
            {String(selected.helpResponse || "")}
            {"\n"}
            {String(selected.stopResponse || "")}
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            {(
              [
                ["restrictedContentOk", "Restricted content screened OK"],
                ["prohibitedUseOk", "Prohibited use screened OK"],
                ["dataCompleteOk", "Data complete"],
                ["providerReadyOk", "Provider-ready"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checks[k]}
                  onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <label className="block text-xs">
            Note
            <textarea
              className="mt-1 w-full rounded border px-2 py-1"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              "INTERNAL_REVIEW",
              "NEEDS_CUSTOMER_CHANGES",
              "READY_FOR_PROVIDER",
              "REJECTED",
              "CANCELLED",
            ].map((s) => (
              <button
                key={s}
                type="button"
                className="rounded border px-3 py-1 text-xs"
                onClick={() => void transition(s)}
              >
                → {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            PROVIDER_SUBMITTED stays blocked while SENDFABLE_SMS_REGISTRATION_ENABLED=false.
          </p>
        </section>
      )}
    </div>
  );
}
