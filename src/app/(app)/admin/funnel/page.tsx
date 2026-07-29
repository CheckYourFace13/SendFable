"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export default function AdminFunnelPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/funnel");
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">{error}</div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Signup funnel"
        description="Organic landing → signup → workspace → sender → contacts → campaign → first send → paid. First-party events only."
      />

      <p className="text-sm text-muted-foreground">
        Analytics enabled: {data.analyticsEnabled ? "yes" : "no (set ANALYTICS_ENABLED=true)"} · last{" "}
        {data.days} days
      </p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.stages.map((s: any) => (
          <div key={s.id} className="rounded-xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">{s.id}</div>
            <div className="mt-1 text-2xl font-semibold">{s.count}</div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {s.events.map((e: any) => (
                <li key={e.event}>
                  {e.event}: {e.count}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Top paths</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(data.topPaths || []).length === 0 && (
              <li className="text-muted-foreground">No events yet.</li>
            )}
            {(data.topPaths || []).map((r: any) => (
              <li key={r.path} className="flex justify-between gap-4">
                <span>{r.path}</span>
                <Badge variant="secondary">{r.count}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">UTM campaigns (last-touch field)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(data.topCampaigns || []).length === 0 && (
              <li className="text-muted-foreground">No UTM campaigns yet.</li>
            )}
            {(data.topCampaigns || []).map((r: any) => (
              <li key={r.campaign} className="flex justify-between gap-4">
                <span>{r.campaign}</span>
                <Badge variant="secondary">{r.count}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Link className="text-sm text-coral underline" href="/admin">
        Back to admin
      </Link>
    </div>
  );
}
