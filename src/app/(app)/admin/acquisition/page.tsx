"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export default function AdminAcquisitionPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const res = await fetch("/api/admin/acquisition");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Forbidden");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(action: string, extra?: Record<string, unknown>) {
    setBusy(action);
    try {
      const res = await fetch("/api/admin/acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error || "Failed");
      await load();
    } finally {
      setBusy("");
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

  const t = data.today;
  const o = data.overall;
  const p = data.pipeline;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customer acquisition"
        description="Discover → qualify → personalize → send (gated) → follow up → stop on reply/signup. Sending stays off until flags are enabled."
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant={data.flags.SENDFABLE_ACQUISITION_ENABLED ? "default" : "secondary"}>
          master {String(data.flags.SENDFABLE_ACQUISITION_ENABLED)}
        </Badge>
        <Badge
          variant={data.flags.SENDFABLE_ACQUISITION_DISCOVERY_ENABLED ? "default" : "secondary"}
        >
          discovery {String(data.flags.SENDFABLE_ACQUISITION_DISCOVERY_ENABLED)}
        </Badge>
        <Badge
          variant={data.flags.SENDFABLE_ACQUISITION_SENDING_ENABLED ? "default" : "secondary"}
        >
          sending {String(data.flags.SENDFABLE_ACQUISITION_SENDING_ENABLED)}
        </Badge>
        <Badge variant="secondary">
          new/day {data.flags.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT}
        </Badge>
        <Badge variant="secondary">
          total/day {data.flags.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT}
        </Badge>
        <Badge variant="secondary">min score {data.flags.SENDFABLE_ACQUISITION_MIN_SCORE}</Badge>
        <Badge variant={data.fromConfigured ? "default" : "secondary"}>
          from {data.fromConfigured ? "configured" : "NOT SET"}
        </Badge>
        <Badge variant={data.paused ? "destructive" : "secondary"}>
          pipeline {data.paused ? `PAUSED: ${data.pauseReason}` : "running"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void action("discover", { limit: 20 })}
        >
          {busy === "discover" ? "…" : "Run discovery"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void action("queue_drafts", { limit: 20 })}
        >
          {busy === "queue_drafts" ? "…" : "Queue dry-run drafts"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void action(data.paused ? "resume" : "pause", { reason: "owner" })}
        >
          {data.paused ? "Resume pipeline" : "Pause pipeline"}
        </button>
      </div>

      <section>
        <h2 className="font-semibold">Today</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(t).map(([k, v]) => (
            <div key={k} className="rounded-xl border bg-white p-4">
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="mt-1 text-2xl font-semibold">{String(v)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Overall</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(o).map(([k, v]) => (
              <li key={k}>
                {k}: <strong>{String(v)}</strong>
              </li>
            ))}
            <li>
              signup conversion:{" "}
              {o.contacted > 0 ? `${Math.round((o.signups / o.contacted) * 1000) / 10}%` : "—"}
            </li>
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Pipeline</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(p).map(([k, v]) => (
              <li key={k}>
                {k}: <strong>{String(v)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Top industries</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(data.topIndustries || []).map((r: any) => (
              <li key={r.category}>
                {r.category}: {r.count}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Top cities</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(data.topCities || []).map((r: any) => (
              <li key={r.city}>
                {r.city}: {r.count}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Weekly optimization (advisory)</h2>
        {data.weekly && (
          <ul className="mt-3 space-y-1 text-sm">
            <li>sent: {data.weekly.sent}</li>
            <li>replies: {data.weekly.replies}</li>
            <li>signups: {data.weekly.signups}</li>
            <li>bounces: {data.weekly.bounces}</li>
            <li>complaints: {data.weekly.complaints}</li>
            {(data.weekly.recommendations || []).map((r: string) => (
              <li key={r} className="text-muted-foreground">
                → {r}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Recent prospects</h2>
        <ul className="mt-3 divide-y text-sm">
          {(data.recent || []).map((r: any) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <div>
                <Link className="text-coral underline" href={`/admin/acquisition/${r.id}`}>
                  {r.businessName}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {r.category}
                  {r.city ? ` · ${r.city}` : ""} · score {r.score}
                </span>
                {r.personalizationClaim && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {r.personalizationClaim}
                  </p>
                )}
              </div>
              <Badge variant="secondary">{r.status}</Badge>
            </li>
          ))}
          {(data.recent || []).length === 0 && (
            <li className="text-muted-foreground">No prospects yet. Run dry-run or discovery.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
