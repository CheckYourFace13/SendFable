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
  entitlementLabel?: string;
  contacts: number;
  emailsThisMonth: number;
  smsThisMonth: number;
  autopilot: { enabled: boolean; pageUrl: string } | null;
  lastCampaign: { name: string; status: string; channel: string } | null;
  sending: { value: string; displayName: string | null; status: string } | null;
  health: { ok: boolean; label: string };
};

export default function InternalWorkspacesAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    websiteUrl: "",
    approvalEmail: "",
    replyTo: "",
    senderDisplayName: "",
  });

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
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowAdd(true);
  }, []);

  async function addBusiness(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setMsg("");
    try {
      const res = await fetch("/api/admin/internal-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          websiteUrl: draft.websiteUrl,
          approvalEmail: draft.approvalEmail || undefined,
          replyTo: draft.replyTo || undefined,
          senderDisplayName: draft.senderDisplayName || undefined,
          provisionSurface: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Failed");
        return;
      }
      setMsg(
        json.created
          ? `Created ${draft.name}. Form: /f/${json.provision?.formSlug}`
          : `${draft.name} already exists. Form: /f/${json.provision?.formSlug || "—"}`
      );
      setDraft({ name: "", websiteUrl: "", approvalEmail: "", replyTo: "", senderDisplayName: "" });
      setShowAdd(false);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function viewAs(workspaceId: string, next = "/dashboard") {
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
      router.push(next);
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
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg bg-ink px-3 py-2 text-sm text-page disabled:opacity-60"
        >
          + Add internal business
        </button>
        <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm">
          Admin home
        </Link>
        <Link href="/admin/workspaces" className="rounded-lg border px-3 py-2 text-sm">
          All workspaces
        </Link>
      </div>

      {showAdd && (
        <form onSubmit={(e) => void addBusiness(e)} className="grid max-w-xl gap-3 rounded-xl border bg-white p-4">
          <label className="text-sm">
            Business name
            <input
              required
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Website
            <input
              required
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="https://example.com"
              value={draft.websiteUrl}
              onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Owner/approval email
            <input
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="you@company.com"
              value={draft.approvalEmail}
              onChange={(e) => setDraft({ ...draft, approvalEmail: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Reply-To
            <input
              type="email"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={draft.replyTo}
              onChange={(e) => setDraft({ ...draft, replyTo: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Sender display name
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="Defaults to the business name"
              value={draft.senderDisplayName}
              onChange={(e) => setDraft({ ...draft, senderDisplayName: e.target.value })}
            />
          </label>
          <button
            type="submit"
            disabled={!!busy}
            className="rounded-lg bg-ink px-3 py-2 text-sm text-page disabled:opacity-60"
          >
            {busy === "create" ? "Working…" : "Create internal business"}
          </button>
        </form>
      )}

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Workspace</th>
              <th className="px-3 py-2">Entitlement</th>
              <th className="px-3 py-2">Contacts</th>
              <th className="px-3 py-2">Email / mo</th>
              <th className="px-3 py-2">SMS / mo</th>
              <th className="px-3 py-2">Autopilot</th>
              <th className="px-3 py-2">Last campaign</th>
              <th className="px-3 py-2">Sending</th>
              <th className="px-3 py-2">Health</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-muted-foreground">
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
                <td className="px-3 py-3">{r.entitlementLabel || r.plan}</td>
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
                  <span className={r.health?.ok === false ? "text-red-700" : "text-muted-foreground"}>
                    {r.health?.label || "—"}
                  </span>
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
                      onClick={() => void viewAs(r.id, "/dashboard")}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      disabled={!!busy || !!r.disabledAt}
                      className="text-left text-coral underline disabled:opacity-50"
                      onClick={() => void viewAs(r.id, "/dashboard")}
                    >
                      View as
                    </button>
                    <button
                      type="button"
                      disabled={!!busy || !!r.disabledAt}
                      className="text-left text-coral underline disabled:opacity-50"
                      onClick={() => void viewAs(r.id, "/settings")}
                    >
                      Settings
                    </button>
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
