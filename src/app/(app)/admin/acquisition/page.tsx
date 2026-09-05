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

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Growth health</h2>
        {data.growthHealth && (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              Inventory:{" "}
              <strong
                className={
                  data.growthHealth.inventoryStatus === "STARVED" ||
                  data.growthHealth.discovery === "STARVED"
                    ? "text-red-700"
                    : data.growthHealth.inventoryStatus === "LOW"
                      ? "text-amber-700"
                      : "text-emerald-700"
                }
              >
                {data.growthHealth.inventoryStatus || data.growthHealth.discovery}
              </strong>
            </div>
            <div>
              Qualified inventory: <strong>{data.growthHealth.qualifiedInventory}</strong>
              {data.growthHealth.preferredTarget
                ? ` / ${data.growthHealth.preferredTarget} target`
                : ""}
            </div>
            <div>
              Days of inventory: <strong>{data.growthHealth.daysOfInventory}</strong>
            </div>
            {typeof data.growthHealth.attemptsToday === "number" && (
              <div>
                Discovery today: {data.growthHealth.attemptsToday}/
                {data.growthHealth.dailyCeiling}
              </div>
            )}
            <div>Last discovery: {data.growthHealth.lastDiscoveryAt || "—"}</div>
            <div>Last email sent: {data.growthHealth.lastEmailSentAt || "—"}</div>
            <div>
              Sent today: <strong>{data.growthHealth.sentToday}</strong>
            </div>
            <div>Sent 7d: {data.growthHealth.sent7d}</div>
            <div>Delivered 7d: {data.growthHealth.delivered7d}</div>
            <div>Replies 7d: {data.growthHealth.replies7d}</div>
            <div>Signups 7d: {data.growthHealth.signups7d}</div>
            <div>Paid 7d: {data.growthHealth.paid7d}</div>
            <div>
              Ramp stage: <strong>{data.growthHealth.rampStage}</strong>
            </div>
            <div>Next ramp: {data.growthHealth.nextRamp}</div>
            <div>Last tick: {data.autonomy?.lastTickAt || "—"}</div>
          </div>
        )}
        {(data.growthHealth?.inventoryStatus === "STARVED" ||
          data.growthHealth?.discovery === "STARVED") && (
          <p className="mt-3 text-sm text-red-800">
            Inventory is STARVED — continuous discovery autofill is prioritized automatically.
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Conversion optimization</h2>
        {data.conversionOptimization ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-muted-foreground">{data.conversionOptimization.sampleNote}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                LAST 25 DELIVERED:{" "}
                <strong>{data.conversionOptimization.last25.delivered}</strong>
              </div>
              <div>click %: <strong>{data.conversionOptimization.last25.clickPct}%</strong></div>
              <div>reply %: <strong>{data.conversionOptimization.last25.replyPct}%</strong></div>
              <div>
                positive reply %:{" "}
                <strong>{data.conversionOptimization.last25.positiveReplyPct}%</strong>
              </div>
              <div>signup %: <strong>{data.conversionOptimization.last25.signupPct}%</strong></div>
              <div>
                first-send %:{" "}
                <strong>{data.conversionOptimization.last25.firstSendPct}%</strong>
              </div>
              <div>paid %: <strong>{data.conversionOptimization.last25.paidPct}%</strong></div>
            </div>
            <div>
              BEST SEGMENT:{" "}
              <strong>
                {data.conversionOptimization.bestSegment
                  ? `${data.conversionOptimization.bestSegment.vertical} + ${data.conversionOptimization.bestSegment.signal}`
                  : "—"}
              </strong>
            </div>
            <div>
              WORST SEGMENT:{" "}
              <strong>
                {data.conversionOptimization.worstSegment
                  ? `${data.conversionOptimization.worstSegment.vertical} + ${data.conversionOptimization.worstSegment.signal}`
                  : "—"}
              </strong>
            </div>
            <div>
              CURRENT COPY VERSION:{" "}
              <strong>{data.conversionOptimization.currentCopyVersion}</strong>
            </div>
            <div>
              NEXT AUTO-OPTIMIZATION: {data.conversionOptimization.nextAutoOptimization}
            </div>
            <div>
              Status: <strong>{data.conversionOptimization.status}</strong> · delivered INITIAL
              total: {data.conversionOptimization.totalDeliveredInitial}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Loading conversion metrics…</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Autonomy status</h2>
        {data.autonomy && (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              Status: <strong>{data.autonomy.status}</strong>
            </div>
            <div>
              Stage: <strong>{data.autonomy.stage}</strong> ({data.autonomy.newPerDay} new /{" "}
              {data.autonomy.totalPerDay} total)
            </div>
            <div>
              Today sent: <strong>{data.autonomy.todaySent}</strong>
            </div>
            <div>7d bounce: {data.autonomy.rates7d?.bouncePct}%</div>
            <div>7d complaint: {data.autonomy.rates7d?.complaintPct}%</div>
            <div>7d unsub: {data.autonomy.rates7d?.unsubPct}%</div>
            <div>Replies: {data.autonomy.replies}</div>
            <div>Positive: {data.autonomy.positiveReplies}</div>
            <div>Signups: {data.autonomy.signups}</div>
            <div>First sends: {data.autonomy.firstSends}</div>
            <div>Paid: {data.autonomy.paid}</div>
            <div>Next ramp: {data.autonomy.nextRamp}</div>
            <div>Sender: {data.autonomy.senderOk ? "OK" : data.autonomy.senderDetail}</div>
            <div>IMAP replies: {data.autonomy.imapConfigured ? "configured" : "not configured"}</div>
            {data.autonomy.pauseReason && (
              <div className="text-red-700">Pause: {data.autonomy.pauseReason}</div>
            )}
          </div>
        )}
      </section>

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
          {busy === "queue_drafts" ? "…" : "Auto-approve queue"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void action(data.paused ? "resume" : "pause", { reason: "owner" })}
        >
          {data.paused ? "Resume pipeline" : "Pause pipeline"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          className="rounded-lg border px-3 py-1.5 text-sm"
          onClick={() => void action("reduce_stage", { reason: "owner" })}
        >
          Reduce stage
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
