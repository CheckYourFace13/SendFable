"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";

const PLANS = ["FREE", "STARTER", "GROWTH", "PRO", "PRO_PLUS"] as const;

export default function InternalWorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/internal-workspaces/${params.id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setData(json.workspace);
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/internal-workspaces/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Failed");
        return;
      }
      setMsg("Updated");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function viewAs() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: params.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        {error}
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.internalLabel || data.name}
        description="INTERNAL owner workspace — same product limits as a normal customer unless you change INTERNAL PLAN OVERRIDE."
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/internal" className="rounded-lg border px-3 py-2 text-sm">
          Back
        </Link>
        <button
          type="button"
          disabled={busy || !!data.disabledAt}
          onClick={() => void viewAs()}
          className="rounded-lg bg-ink px-3 py-2 text-sm text-page disabled:opacity-60"
        >
          View as workspace
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void patch({ action: data.disabledAt ? "enable" : "disable" })
          }
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {data.disabledAt ? "Enable" : "Disable"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void patch({ action: "provision_drinkknird" })}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Re-run DrinkKnird provision
        </button>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Website", data.websiteUrl],
          ["Plan", data.plan],
          ["Plan source", data.planSource],
          ["Contacts", data.contacts],
          ["Campaigns", data.campaigns],
          ["Disabled", data.disabledAt ? "yes" : "no"],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border bg-white p-4 text-sm">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="font-medium">{String(v ?? "—")}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">INTERNAL PLAN OVERRIDE</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes entitlement only. Does not create or fake a Stripe subscription.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLANS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy || data.plan === p}
              onClick={() => void patch({ action: "set_plan", plan: p })}
              className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Forms</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {(data.forms || []).map((f: any) => (
            <li key={f.id}>
              {f.name}{" "}
              <a className="text-coral underline" href={`/f/${f.hostedSlug}`} target="_blank" rel="noreferrer">
                /f/{f.hostedSlug}
              </a>{" "}
              · submits {f.submitCount}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Sender identities</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {(data.senderIdentities || []).map((s: any) => (
            <li key={s.id}>
              {s.displayName} &lt;{s.value}&gt; · {s.status}
              {s.rewriteRequired ? " · platform rewrite" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Autopilot</h2>
        {data.autopilot ? (
          <div className="mt-2 space-y-1 text-sm">
            <div>Enabled: {data.autopilot.enabled ? "yes" : "no"}</div>
            <div>Watch: {data.autopilot.pageUrl}</div>
            <div>Frequency: {data.autopilot.checkFrequency}</div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Not configured</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Recent admin audit</h2>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
          {(data.recentAudit || []).map((a: any) => (
            <li key={a.id}>
              {new Date(a.createdAt).toISOString()} · {a.action}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
