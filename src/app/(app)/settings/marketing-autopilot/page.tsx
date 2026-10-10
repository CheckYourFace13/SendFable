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

type Freq = "DAILY" | "TWICE_DAILY" | "WEEKLY";

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
  const [drafts, setDrafts] = useState<
    { id: string; status: string; subject: string | null; campaignId: string | null }[]
  >([]);

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

  if (loading) {
    return (
      <div>
        <PageHeader title="Marketing Autopilot" description="Loading…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Marketing Autopilot"
        description="Your website changes. SendFable turns it into a campaign. You approve it."
      />

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
          Nothing sends until you approve. No response always means no send.
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

      {drafts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Recent drafts</h2>
          <ul className="mt-2 divide-y rounded-xl border">
            {drafts.slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{d.subject || "Draft"}</p>
                  <p className="text-xs text-muted-foreground">{d.status}</p>
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
    </div>
  );
}
