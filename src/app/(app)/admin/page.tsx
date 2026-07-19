"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/overview");
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
        {error}. Admin is limited to the platform owner.
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const s = data.system;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin control center"
        description="Owner-only system health, users, and early-access leads."
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-coral underline" href="/admin/users">
          Users
        </Link>
        <Link className="text-coral underline" href="/admin/early-access">
          Early access leads
        </Link>
        <Link className="text-coral underline" href="/settings/ses">
          SES readiness
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["App", s.app],
          ["Database", s.database],
          ["Redis", s.redis],
          ["Queue depth", s.queueDepth ?? "—"],
          ["SES ready", s.sesReady ? "yes" : "no"],
          ["Stripe ready", s.stripeReady ? "yes" : "no"],
          ["Early launch", s.earlyLaunch ? "on" : "off"],
          ["Version", s.version],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 font-semibold">{String(value)}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Counts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.counts).map(([k, v]) => (
            <Badge key={k} variant="secondary">
              {k}: {String(v)}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{s.lastBackupNote}</p>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Recent audit events</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data.audit || []).length === 0 && (
            <li className="text-muted-foreground">No audit events yet.</li>
          )}
          {(data.audit || []).map((a: any) => (
            <li key={a.id} className="flex justify-between gap-4 border-b py-2 last:border-0">
              <span className="font-medium">{a.action}</span>
              <span className="text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
