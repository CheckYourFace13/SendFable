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
  campaignId: string | null;
  detectedAt: string | null;
  createdAt: string | null;
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
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "approve" | "skip" } | null>(null);

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
      setDraftsCap(j.internalUnlimited ? null : typeof j.draftsCap === "number" ? j.draftsCap : 2);
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

  async function decide(id: string, action: "approve" | "skip" | "edit") {
    const res = await fetch(`/api/autopilot/drafts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirm: true }),
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
    toast.success(action === "approve" ? "Campaign is sending" : "Campaign skipped. It will not send.");
    setPendingAction(null);
    await load();
  }

  const waitingDrafts = drafts.filter((draft) => WAITING.has(draft.status));
  const decidedDrafts = drafts.filter((draft) => !WAITING.has(draft.status));

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
        description="Marketing Autopilot creates the campaign. You decide what happens next."
      />

      <section id="waiting" className="mt-6 rounded-xl border p-5">
        <h2 className="font-semibold">Waiting for approval</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve &amp; Send, Edit, or Skip. If you do nothing, nothing sends. The draft stays waiting for you.
        </p>
        {waitingDrafts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No drafts are waiting.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border">
            {waitingDrafts.map((draft) => (
              <li key={draft.id} className="space-y-3 px-4 py-4 text-sm">
                <div>
                  <p className="font-medium">{draft.subject || "Draft campaign"}</p>
                  <p className="mt-1 text-muted-foreground">Audience: {draft.audience || "Everyone subscribed"}</p>
                  <p className="truncate text-muted-foreground">Source: {draft.sourceUrl || "—"}</p>
                  <p className="text-muted-foreground">Detected: {when(draft.detectedAt)}</p>
                  <p className="text-muted-foreground">Created: {when(draft.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setPendingAction({ id: draft.id, action: "approve" })}>
                    Approve &amp; Send
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(draft.id, "edit")}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingAction({ id: draft.id, action: "skip" })}>
                    Skip
                  </Button>
                </div>
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
          If you do nothing, nothing sends. The draft stays waiting for you. At most one reminder.
        </p>
      </div>

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

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "approve" ? "Send this campaign now?" : "Skip this campaign?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "approve"
                ? "Approve & Send delivers this campaign to its audience."
                : "Skip this campaign. It will not send. Other waiting drafts stay in the queue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction && void decide(pendingAction.id, pendingAction.action)}
            >
              {pendingAction?.action === "approve" ? "Approve & Send" : "Skip this campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
