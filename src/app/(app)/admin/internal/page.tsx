"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";

type Row = {
  id: string;
  name: string;
  websiteUrl: string | null;
  internalLabel: string | null;
  disabledAt: string | null;
  plan: string;
  planSource: string;
  contacts: number;
  emailsThisMonth: number;
  smsThisMonth: number;
  autopilot: { enabled: boolean; pageUrl: string } | null;
  lastCampaign: { name: string; status: string; channel: string } | null;
  sending: { value: string; displayName: string | null; status: string } | null;
};

export default function InternalWorkspacesAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/internal-workspaces");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setRows(json.workspaces || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function ensureDrinkKnird() {
    setBusy("create");
    setMsg("");
    try {
      const res = await fetch("/api/admin/internal-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "DrinkKnird",
          websiteUrl: "https://drinkknird.com",
          internalLabel: "DrinkKnird",
          plan: "FREE",
          provisionDrinkKnird: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Failed");
        return;
      }
      setMsg(
        json.created
          ? `Created DrinkKnird. Form: /f/${json.provision?.formSlug}`
          : `DrinkKnird already exists. Form: /f/${json.provision?.formSlug || "—"}`
      );
      await load();
    } finally {
      setBusy("");
    }
  }

  async function viewAs(workspaceId: string) {
    setBusy(workspaceId);
    try {
      const res = await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}. OWNER_ADMIN only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal workspaces"
        description="SendFable-owned properties for dogfooding the real product. INTERNAL PLAN OVERRIDE does not create Stripe subscriptions."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void ensureDrinkKnird()}
          className="rounded-lg bg-ink px-3 py-2 text-sm text-page disabled:opacity-60"
        >
          {busy === "create" ? "Working…" : "Ensure DrinkKnird (FREE)"}
        </button>
        <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm">
          Admin home
        </Link>
        <Link href="/admin/workspaces" className="rounded-lg border px-3 py-2 text-sm">
          All workspaces
        </Link>
      </div>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Workspace</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Contacts</th>
              <th className="px-3 py-2">Email / mo</th>
              <th className="px-3 py-2">SMS / mo</th>
              <th className="px-3 py-2">Autopilot</th>
              <th className="px-3 py-2">Last campaign</th>
              <th className="px-3 py-2">Sending</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-muted-foreground">
                  No internal workspaces yet. Create DrinkKnird to start dogfooding.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-3">
                  <div className="font-medium">{r.internalLabel || r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.websiteUrl}</div>
                  {r.disabledAt && (
                    <div className="text-xs text-red-600">Disabled</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div>{r.plan}</div>
                  <div className="text-[10px] uppercase tracking-wide text-amber-700">
                    {r.planSource === "INTERNAL_PLAN_OVERRIDE"
                      ? "Internal plan override"
                      : r.planSource}
                  </div>
                </td>
                <td className="px-3 py-3">{r.contacts}</td>
                <td className="px-3 py-3">{r.emailsThisMonth}</td>
                <td className="px-3 py-3">{r.smsThisMonth}</td>
                <td className="px-3 py-3">
                  {r.autopilot
                    ? r.autopilot.enabled
                      ? "ON"
                      : "OFF"
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  {r.lastCampaign
                    ? `${r.lastCampaign.name} (${r.lastCampaign.status}/${r.lastCampaign.channel})`
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  {r.sending
                    ? `${r.sending.displayName || "—"} · ${r.sending.status}`
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link className="text-coral underline" href={`/admin/internal/${r.id}`}>
                      Admin details
                    </Link>
                    <button
                      type="button"
                      disabled={!!busy || !!r.disabledAt}
                      className="text-left text-coral underline disabled:opacity-50"
                      onClick={() => void viewAs(r.id)}
                    >
                      View as workspace
                    </button>
                    <Link className="text-coral underline" href="/dashboard">
                      Open
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Future rows (not auto-created): BoatingChicago and other SendFable-owned sites.
      </p>
    </div>
  );
}
