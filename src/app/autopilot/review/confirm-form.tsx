"use client";

import { useState } from "react";
import { AutopilotScheduleForm } from "@/components/app/autopilot-schedule-form";

export function AutopilotConfirmForm({
  token,
  action,
  audience = "Everyone subscribed",
  recipientCount = 0,
  defaultTimezone = "UTC",
  subject = "",
}: {
  token: string;
  action: "approve" | "reject" | "edit" | "send";
  audience?: string;
  recipientCount?: number;
  defaultTimezone?: string;
  subject?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const labels = {
    reject: "Skip this campaign",
    edit: "Open in editor",
    send: "SEND NOW",
  } as const;

  const colors = {
    reject: "bg-slate-600 hover:bg-slate-700",
    edit: "bg-indigo-600 hover:bg-indigo-700",
    send: "bg-emerald-600 hover:bg-emerald-700",
  } as const;

  async function onConfirm(opts?: {
    date?: string;
    time?: string;
    timezone?: string;
    mode?: "send_now" | "schedule";
  }) {
    if (busy || done) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/autopilot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirm: true, ...opts }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong");
        setBusy(false);
        return;
      }
      if (json.result === "edit" && json.redirectTo) {
        window.location.href = json.redirectTo;
        return;
      }
      if (json.result === "sent") {
        setDone(
          json.scheduledLabel === "already sent"
            ? "Campaign sent. Reopening this link does not send again."
            : "Campaign sent."
        );
      } else if (json.result === "scheduled") {
        const label = json.scheduledLabel || "the time you chose";
        setDone(
          label === "already sent"
            ? "Campaign sent. Reopening this link does not send again."
            : `Campaign scheduled for: ${label}`
        );
      } else if (json.result === "rejected") {
        setDone("Got it — this campaign will not send.");
      } else {
        setDone("Done.");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="mt-6 text-sm font-medium text-ink">{done}</p>;
  }

  if (action === "send") {
    return (
      <div className="mt-6 space-y-4">
        <dl className="space-y-2 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm">
          {subject ? (
            <div>
              <dt className="text-ink/50">Subject</dt>
              <dd className="font-medium text-ink">{subject}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink/50">Audience</dt>
            <dd className="text-ink">{audience}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Estimated recipients</dt>
            <dd className="text-ink">{recipientCount.toLocaleString()}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink/70">
          Opening this page did not send anything. Confirm below only if you want to send now.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onConfirm({ mode: "send_now" })}
          className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto ${colors.send}`}
        >
          {busy ? "Sending…" : labels.send}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (action === "approve") {
    return (
      <div className="mt-6">
        <AutopilotScheduleForm
          audience={audience}
          recipientCount={recipientCount}
          busy={busy}
          defaultTimezone={defaultTimezone}
          onSendNow={() => void onConfirm({ mode: "send_now" })}
          onSchedule={(value) => void onConfirm({ ...value, mode: "schedule" })}
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onConfirm()}
        className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto ${colors[action]}`}
      >
        {busy ? "Working…" : labels[action]}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
