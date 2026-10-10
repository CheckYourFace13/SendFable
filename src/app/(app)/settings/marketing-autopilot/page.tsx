"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutopilotUpgradeBanner } from "@/components/app/autopilot-upgrade-banner";
import { AutopilotScheduleForm } from "@/components/app/autopilot-schedule-form";
import { AutopilotAccountPanel } from "@/components/app/autopilot-account-panel";
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

type Freq = "DAILY" | "TWICE_DAILY" | "WEEKLY";
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

const WAITING = new Set(["AWAITING_APPROVAL", "DRAFTED", "EDITING"]);

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function MarketingAutopilotSettingsPage() {
  const [pageUrl, setPageUrl] = useState("");
  const [frequency, setFrequency] = useState<Freq>("DAILY");
  const [allowed, setAllowed] = useState<Freq[]>(["DAILY", "WEEKLY"]);
  const [enabled, setEnabled] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [draftsUsed, setDraftsUsed] = useState(0);
  const [draftsCap, setDraftsCap] = useState<number | null>(2);
  const [internalUnlimited, setInternalUnlimited] = useState(false);
  const [drafts, setDrafts] = useState<WaitingDraft[]>([]);
  const [pendingSkip, setPendingSkip] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [commercial, setCommercial] = useState<null | {
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
  }>(null);

  async function load() {
    const [cRes, dRes] = await Promise.all([
      fetch("/api/autopilot/config"),
      fetch("/api/autopilot/drafts"),
    ]);
    if (cRes.ok) {
      const j = await cRes.json();
      setAllowed(j.allowedFrequencies || ["DAILY", "WEEKLY"]);
      if (j.config) {
        setPageUrl(j.config.pageUrl || "");
        setFrequency(j.config.checkFrequency || "DAILY");
        setEnabled(Boolean(j.config.enabled));
        setReminders(j.config.remindersEnabled !== false);
        setLastChecked(j.config.lastFetchedAt || null);
      }
      setWaiting(j.waitingDrafts || 0);
      setPlan(j.plan || "FREE");
      setDraftsUsed(typeof j.draftsUsedThisMonth === "number" ? j.draftsUsedThisMonth : 0);
      setInternalUnlimited(Boolean(j.internalUnlimited));
      setDraftsCap(j.internalUnlimited ? null : typeof j.draftsCap === "number" ? j.draftsCap : 0);
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

  async function save(turnOn?: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/autopilot/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrl,
          audienceType: "all",
          checkFrequency: frequency,
          enabled: turnOn ?? enabled,
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
      toast.success(j.config?.enabled ? "Marketing Autopilot is on" : "Saved");
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
    toast.success("Check complete");
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
    if (action === "schedule") {
      toast.success(`Scheduled for ${data.scheduledLabel || "the time you chose"}`);
    } else if (action === "cancel-schedule") {
      toast.success("Schedule canceled. Nothing will send.");
    } else {
      toast.success("Campaign skipped. It will not send.");
    }
    setPendingSkip(null);
    setSchedulingId(null);
    await load();
  }

  const scheduledDrafts = drafts.filter((draft) => draft.campaignStatus === "SCHEDULED");
  const waitingDrafts = drafts.filter(
    (draft) => WAITING.has(draft.status) && draft.campaignStatus !== "SCHEDULED"
  );
  const decidedDrafts = drafts.filter(
    (draft) => !WAITING.has(draft.status) && draft.campaignStatus !== "SCHEDULED"
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Marketing Autopilot" description="Loading…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Marketing Autopilot"
        description="Your website changes. SendFable builds the campaign. You choose when it sends."
      />

      <AutopilotAccountPanel
        internalUnlimited={internalUnlimited}
        commercial={commercial}
        onChanged={() => void load()}
      />

      <section id="waiting" className="mt-6 rounded-xl border p-5">
        <h2 className="font-semibold">Waiting for approval</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve &amp; Schedule, Edit, or Skip this campaign. If you do nothing, nothing sends. The draft stays waiting for you.
        </p>
        {waitingDrafts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No drafts are waiting.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border">
            {waitingDrafts.map((draft) => (
              <li key={draft.id} className="space-y-3 px-4 py-4 text-sm">
                <div>
                  <p className="font-medium">{draft.subject || "Draft campaign"}</p>
                  <p className="mt-1 text-muted-foreground">
                    Audience: {draft.audience || "Everyone subscribed"}
                    {draft.recipientCount != null ? ` · ${draft.recipientCount.toLocaleString()} recipients` : ""}
                  </p>
                  <p className="truncate text-muted-foreground">Source: {draft.sourceUrl || "—"}</p>
                  <p className="text-muted-foreground">Detected: {when(draft.detectedAt)}</p>
                  <p className="text-muted-foreground">Created: {when(draft.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setSchedulingId(draft.id)}>
                    Approve &amp; Schedule
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(draft.id, "edit")}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingSkip(draft.id)}>
                    Skip this campaign
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
      </section>

      <div className="mt-6">
        {internalUnlimited ? (
          <p className="text-sm text-muted-foreground">Internal workspace — unlimited</p>
        ) : (
          <AutopilotUpgradeBanner
            plan={plan}
            draftsUsed={draftsUsed}
            draftsCap={draftsCap ?? 0}
            surface="autopilot_settings"
          />
        )}
      </div>

      <div className="mt-2 space-y-6 rounded-xl border p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 1
          </p>
          <Label htmlFor="pageUrl" className="mt-1">
            What page should SendFable watch?
          </Label>
          <Input
            id="pageUrl"
            className="mt-1.5"
            placeholder="https://yourbusiness.com/specials"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Specials, events, promotions, new products, or news.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 2
          </p>
          <Label className="mt-1">Who should receive these campaigns?</Label>
          <p className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            Everyone subscribed (default)
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step 3
          </p>
          <Label className="mt-1">How often should we check?</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Freq)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowed.includes("DAILY") && <SelectItem value="DAILY">Daily</SelectItem>}
              {allowed.includes("TWICE_DAILY") && (
                <SelectItem value="TWICE_DAILY">Twice daily</SelectItem>
              )}
              {allowed.includes("WEEKLY") && <SelectItem value="WEEKLY">Weekly</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground">Advanced</summary>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminders}
              onChange={(e) => setReminders(e.target.checked)}
            />
            Send one reminder if I haven&apos;t responded
          </label>
        </details>

        <div className="flex flex-wrap gap-2">
          {!enabled ? (
            <Button disabled={saving || !pageUrl} onClick={() => void save(true)}>
              Turn on Marketing Autopilot
            </Button>
          ) : (
            <>
              <Button disabled={saving} onClick={() => void save()}>
                Save
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEnabled(false);
                  void save(false);
                }}
              >
                Pause
              </Button>
              <Button variant="outline" onClick={() => void checkNow()}>
                Check now
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Nothing sends until you schedule it. If you do nothing, the draft stays waiting. At most one reminder.
        </p>
      </div>

      {scheduledDrafts.length > 0 && (
        <section className="mt-6 rounded-xl border p-5">
          <h2 className="font-semibold">Scheduled</h2>
          <ul className="mt-4 space-y-4">
            {scheduledDrafts.map((draft) => (
              <li key={draft.id} className="space-y-3 text-sm">
                <p className="font-medium">{draft.subject || "Draft campaign"}</p>
                <p>Scheduled for {draft.scheduledLabel || "the time you chose"}</p>
                <p className="text-muted-foreground">
                  Audience: {draft.audience || "Everyone subscribed"}
                  {draft.recipientCount != null ? ` · ${draft.recipientCount.toLocaleString()} recipients` : ""}
                </p>
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
          </ul>
        </section>
      )}

      {enabled && (
        <div className="mt-6 rounded-xl border p-5 text-sm">
          <p className="font-medium">Status</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              Watching:{" "}
              <a className="text-coral underline" href={pageUrl} target="_blank" rel="noreferrer">
                {pageUrl.replace(/^https?:\/\//, "")}
              </a>
            </li>
            <li>
              Last checked:{" "}
              {lastChecked ? new Date(lastChecked).toLocaleString() : "Not yet"}
            </li>
            <li>Drafts waiting: {waiting}</li>
          </ul>
        </div>
      )}

      {decidedDrafts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Earlier drafts</h2>
          <ul className="mt-2 divide-y rounded-xl border">
            {decidedDrafts.slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{d.subject || "Draft"}</p>
                  <p className="text-xs text-muted-foreground">{d.status === "REJECTED" ? "Skipped" : d.status}</p>
                </div>
                {d.campaignId && (
                  <Link className="text-coral underline" href={`/campaigns/${d.campaignId}`}>
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={!!pendingSkip} onOpenChange={(open) => !open && setPendingSkip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Skip this campaign. It will not send. Other waiting drafts stay in the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingSkip && void decide(pendingSkip, "skip")}>
              Skip this campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
