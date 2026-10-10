"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutopilotScheduleForm } from "@/components/app/autopilot-schedule-form";
import { AutopilotAccountPanel } from "@/components/app/autopilot-account-panel";
import { FREQUENCY_INTERVAL_MS, type AutopilotFrequency } from "@/lib/autopilot/types";
import { PLANS } from "@/lib/plans";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Freq = AutopilotFrequency;
type WaitingDraft = {
  id: string;
  status: string;
  subject: string | null;
  sourceUrl: string | null;
  audience: string | null;
  recipientCount: number | null;
  campaignId: string | null;
  campaignStatus: string | null;
  detectedAt: string | null;
  createdAt: string | null;
  scheduledLabel: string | null;
};

type Commercial = {
  includedPerMonth: number | null;
  trialAvailable: boolean;
  trialActive: boolean;
  trialCreationsRemaining: number;
  trialMonthsLeft: number;
  credits: number;
  promo: "NONE" | "MONTHLY" | "WEEKLY";
  packs: Array<{ id: string; credits: number; cents: number; label: string }>;
  brand: {
    businessName: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    fontLabel: string;
    buttonLabel: string;
    buttonStyle: string;
    confirmed: boolean;
    suggested: boolean;
  };
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "source", label: "Source" },
  { id: "cadence", label: "Cadence" },
  { id: "drafts", label: "Drafts" },
  { id: "brand", label: "Brand" },
  { id: "usage", label: "Usage" },
] as const;

const CADENCES: Array<{ id: Freq; label: string; unlock: string; plan: keyof typeof PLANS }> = [
  { id: "WEEKLY", label: "Weekly", unlock: "Free", plan: "FREE" },
  { id: "DAILY", label: "Daily", unlock: "Starter", plan: "STARTER" },
  { id: "TWICE_DAILY", label: "Twice daily", unlock: "Growth", plan: "GROWTH" },
];

const WAITING = new Set(["AWAITING_APPROVAL", "DRAFTED", "EDITING"]);

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function hostOf(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function nextCheckLabel(last: string | null, frequency: Freq, on: boolean) {
  if (!on) return "Off";
  if (!last) return "Soon";
  const next = new Date(new Date(last).getTime() + FREQUENCY_INTERVAL_MS[frequency]);
  if (frequency === "WEEKLY") {
    return next.toLocaleDateString(undefined, { weekday: "long" });
  }
  return next.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function resetLabel() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function ScribePage() {
  const [pageUrl, setPageUrl] = useState("");
  const [frequency, setFrequency] = useState<Freq>("WEEKLY");
  const [allowed, setAllowed] = useState<Freq[]>(["WEEKLY"]);
  const [enabled, setEnabled] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [draftsUsed, setDraftsUsed] = useState(0);
  const [internalUnlimited, setInternalUnlimited] = useState(false);
  const [drafts, setDrafts] = useState<WaitingDraft[]>([]);
  const [pendingSkip, setPendingSkip] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [commercial, setCommercial] = useState<Commercial | null>(null);

  async function load() {
    const [cRes, dRes] = await Promise.all([
      fetch("/api/autopilot/config"),
      fetch("/api/autopilot/drafts"),
    ]);
    if (cRes.ok) {
      const j = await cRes.json();
      setAllowed(j.allowedFrequencies || ["WEEKLY"]);
      if (j.config) {
        setPageUrl(j.config.pageUrl || "");
        setFrequency(j.config.checkFrequency || "WEEKLY");
        setEnabled(Boolean(j.config.enabled));
        setReminders(j.config.remindersEnabled !== false);
        setLastChecked(j.config.lastFetchedAt || null);
      }
      setWaiting(j.waitingDrafts || 0);
      setPlan(j.plan || "FREE");
      setDraftsUsed(typeof j.draftsUsedThisMonth === "number" ? j.draftsUsedThisMonth : 0);
      setInternalUnlimited(Boolean(j.internalUnlimited));
      setCommercial(j.commercial || null);
    }
    if (dRes.ok) {
      const j = await dRes.json();
      setDrafts(j.drafts || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(next?: { turnOn?: boolean; frequency?: Freq }) {
    setSaving(true);
    try {
      const res = await fetch("/api/autopilot/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrl,
          audienceType: "all",
          checkFrequency: next?.frequency || frequency,
          enabled: next?.turnOn ?? enabled,
          remindersEnabled: reminders,
          paused: false,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "Could not save");
        return;
      }
      setEnabled(Boolean(j.config?.enabled));
      toast.success(j.config?.enabled ? "Scribe is on" : "Saved");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function checkNow() {
    const res = await fetch("/api/autopilot/check-now", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Check failed");
      return;
    }
    toast.success("Check complete. A check does not use a creation.");
    await load();
  }

  async function decide(
    id: string,
    action: "skip" | "edit" | "schedule" | "cancel-schedule",
    schedule?: { date: string; time: string; timezone: string }
  ) {
    const res = await fetch(`/api/autopilot/drafts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirm: true, ...schedule }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not update this draft");
      return;
    }
    if (action === "edit" && data.campaignId) {
      window.location.href = `/campaigns/${data.campaignId}`;
      return;
    }
    if (action === "schedule") toast.success(`Scheduled for ${data.scheduledLabel || "the time you chose"}`);
    else if (action === "cancel-schedule") toast.success("Schedule canceled. Nothing will send.");
    else toast.success("Campaign skipped. It will not send.");
    setPendingSkip(null);
    setSchedulingId(null);
    await load();
  }

  const scheduledDrafts = drafts.filter((draft) => draft.campaignStatus === "SCHEDULED");
  const waitingDrafts = drafts.filter(
    (draft) => WAITING.has(draft.status) && draft.campaignStatus !== "SCHEDULED"
  );
  const recentDrafts = drafts.filter(
    (draft) => !WAITING.has(draft.status) && draft.campaignStatus !== "SCHEDULED"
  );

  const trial = Boolean(commercial?.trialActive);
  const cap = internalUnlimited
    ? null
    : trial
      ? 1
      : commercial?.includedPerMonth ?? 0;
  const used = internalUnlimited ? 0 : trial ? (commercial?.trialCreationsRemaining ? 0 : 1) : draftsUsed;
  const remaining = cap == null ? null : Math.max(0, cap - used);
  const exhausted = cap != null && cap > 0 && used >= cap;
  const planName = plan in PLANS ? PLANS[plan as keyof typeof PLANS].name : plan;
  const freqLabel = CADENCES.find((item) => item.id === frequency)?.label || "Weekly";

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading Scribe…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav
        aria-label="Scribe sections"
        className="sticky top-0 z-20 -mx-4 mb-6 border-b border-ink/10 bg-parchment/95 px-4 py-2 backdrop-blur"
      >
        <div className="flex gap-2 overflow-x-auto">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="overview" className="scroll-mt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Scribe</p>
        <h1 className="mt-2 font-display text-3xl text-ink">Scribe</h1>
        <p className="mt-2 max-w-prose text-ink/70">
          Turn fresh content into a campaign ready for your review.
        </p>
        <p className="mt-4 text-sm font-semibold">{enabled ? "ON" : "OFF"}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Scribe is watching</dt>
            <dd className="font-medium">{pageUrl ? hostOf(pageUrl) : "No page yet"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Checks</dt>
            <dd className="font-medium">{freqLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">This month</dt>
            <dd className="font-medium">
              {internalUnlimited
                ? "Unlimited"
                : cap
                  ? `${used} of ${cap} creations used`
                  : "No creations included"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Next check</dt>
            <dd className="font-medium">{nextCheckLabel(lastChecked, frequency, enabled)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Waiting for you</dt>
            <dd className="font-medium">
              {waiting} draft{waiting === 1 ? "" : "s"}
            </dd>
          </div>
        </dl>
        {cap != null && cap > 0 && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full bg-coral-solid"
                style={{ width: `${Math.min(100, (used / cap) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {remaining} remaining · Resets {resetLabel()}
            </p>
          </div>
        )}
        {commercial?.trialAvailable && (
          <div className="mt-5 rounded-xl border border-coral/30 bg-white p-4 text-sm">
            <p className="font-medium">Try Scribe free for 3 months</p>
            <p className="mt-1 text-muted-foreground">
              1 campaign creation each month. No credit card required. Nothing sends until you
              schedule it.
            </p>
            <a className="mt-3 inline-block font-medium text-coral underline" href="#usage">
              Start the trial
            </a>
          </div>
        )}
        {exhausted && (
          <div className="mt-4 rounded-xl border p-4 text-sm">
            <p>You’ve used all {cap} Scribe creations this month.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a className="font-medium text-coral underline" href="#usage">
                Buy more creations
              </a>
              <Link className="font-medium text-coral underline" href="/billing">
                Upgrade plan
              </Link>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!enabled ? (
            <Button disabled={saving || !pageUrl} onClick={() => void save({ turnOn: true })}>
              Turn on Scribe
            </Button>
          ) : (
            <Button variant="outline" disabled={saving} onClick={() => void save({ turnOn: false })}>
              Turn off
            </Button>
          )}
          {enabled && (
            <Button variant="outline" onClick={() => void checkNow()}>
              Check now
            </Button>
          )}
        </div>
      </section>

      <section id="source" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">What should Scribe watch?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scribe watches this page for meaningful new content, such as a special, event, product,
          article, or update. A small edit does not become a campaign.
        </p>
        {pageUrl && <p className="mt-3 text-sm font-medium">{pageUrl}</p>}
        <Label htmlFor="pageUrl" className="mt-4 block">
          Page address
        </Label>
        <Input
          id="pageUrl"
          className="mt-1.5"
          placeholder="https://yourbusiness.com/specials"
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
        />
        <Button className="mt-3" disabled={saving || !pageUrl} onClick={() => void save()}>
          Save page
        </Button>
      </section>

      <section id="cadence" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">How often should Scribe look?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Checking the page does not use a creation. A creation is used only when Scribe builds a
          new campaign.
        </p>
        <ul className="mt-4 space-y-2">
          {CADENCES.map((item) => {
            const open = allowed.includes(item.id);
            const selected = frequency === item.id;
            return (
              <li
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                  open ? "bg-white" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  {!open && <p className="text-sm">Available on {item.unlock}</p>}
                </div>
                {open ? (
                  <Button
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    disabled={saving}
                    onClick={() => {
                      setFrequency(item.id);
                      if (pageUrl) void save({ frequency: item.id });
                    }}
                  >
                    {selected ? "Selected" : "Use this"}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/billing">Upgrade</Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reminders}
            onChange={(e) => setReminders(e.target.checked)}
          />
          Send one reminder if I haven’t responded
        </label>
      </section>

      <section id="drafts" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Waiting for you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing sends until you schedule it. If you do nothing, the draft stays here.
        </p>
        {waitingDrafts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No drafts are waiting.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border bg-white">
            {waitingDrafts.map((draft) => (
              <li key={draft.id} className="space-y-3 px-4 py-4 text-sm">
                <div>
                  <p className="font-medium">{draft.subject || "Draft campaign"}</p>
                  <p className="mt-1 text-muted-foreground">Source: {draft.sourceUrl || "—"}</p>
                  <p className="text-muted-foreground">Created: {when(draft.createdAt)}</p>
                  <p className="text-muted-foreground">
                    Audience: {draft.audience || "Everyone subscribed"}
                    {draft.recipientCount != null ? ` · ${draft.recipientCount.toLocaleString()}` : ""}
                  </p>
                  <p className="text-muted-foreground">Status: Waiting</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.campaignId && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/campaigns/${draft.campaignId}`}>Review</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => void decide(draft.id, "edit")}>
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => setSchedulingId(draft.id)}>
                    Approve &amp; Schedule
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingSkip(draft.id)}>
                    Skip
                  </Button>
                </div>
                {schedulingId === draft.id && (
                  <AutopilotScheduleForm
                    audience={draft.audience || "Everyone subscribed"}
                    recipientCount={draft.recipientCount}
                    onSchedule={(value) => void decide(draft.id, "schedule", value)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-8 text-sm font-semibold">Recent</h3>
        {scheduledDrafts.length === 0 && recentDrafts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled, skipped, or sent yet.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-xl border bg-white">
            {scheduledDrafts.map((draft) => (
              <li key={draft.id} className="space-y-2 px-4 py-3 text-sm">
                <p className="font-medium">{draft.subject || "Draft campaign"}</p>
                <p className="text-muted-foreground">Scheduled · {draft.scheduledLabel || "the time you chose"}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void decide(draft.id, "edit")}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSchedulingId(draft.id)}>
                    Reschedule
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(draft.id, "cancel-schedule")}>
                    Cancel schedule
                  </Button>
                </div>
                {schedulingId === draft.id && (
                  <AutopilotScheduleForm
                    audience={draft.audience || "Everyone subscribed"}
                    recipientCount={draft.recipientCount}
                    submitLabel="SCHEDULE CAMPAIGN"
                    onSchedule={(value) => void decide(draft.id, "schedule", value)}
                  />
                )}
              </li>
            ))}
            {recentDrafts.slice(0, 8).map((draft) => (
              <li key={draft.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{draft.subject || "Draft"}</p>
                  <p className="text-xs text-muted-foreground">
                    {draft.status === "REJECTED" ? "Skipped" : draft.status === "SENT" ? "Sent" : draft.status}
                  </p>
                </div>
                {draft.campaignId && (
                  <Link className="text-coral underline" href={`/campaigns/${draft.campaignId}`}>
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="brand" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Make it look like you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scribe uses your logo, colors, images, and style when it builds a campaign.
        </p>
        <AutopilotAccountPanel
          only="brand"
          internalUnlimited={internalUnlimited}
          commercial={commercial}
          onChanged={() => void load()}
        />
      </section>

      <section id="usage" className="mt-12 scroll-mt-16">
        <h2 className="text-xl font-semibold">Plan &amp; usage</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current plan</dt>
            <dd className="font-medium">{internalUnlimited ? "Owner internal" : planName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Scribe creations included</dt>
            <dd className="font-medium">{internalUnlimited ? "Unlimited" : cap ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Used this month</dt>
            <dd className="font-medium">{internalUnlimited ? "—" : used}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="font-medium">{internalUnlimited ? "Unlimited" : remaining}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Resets</dt>
            <dd className="font-medium">{internalUnlimited ? "—" : resetLabel()}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <AutopilotAccountPanel
            only="usage"
            internalUnlimited={internalUnlimited}
            commercial={commercial}
            onChanged={() => void load()}
          />
        </div>
        <p className="mt-4 text-sm">
          <Link className="font-medium text-coral underline" href="/billing">
            Upgrade
          </Link>
        </p>
      </section>

      <AlertDialog open={!!pendingSkip} onOpenChange={(open) => !open && setPendingSkip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Skip this campaign. It will not send. Other waiting drafts stay here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingSkip && void decide(pendingSkip, "skip")}>
              Skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
