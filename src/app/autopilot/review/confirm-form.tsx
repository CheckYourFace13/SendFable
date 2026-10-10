"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AutopilotConfirmForm({
  token,
  action,
}: {
  token: string;
  action: "approve" | "reject" | "edit";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const labels = {
    approve: "Approve & send now",
    reject: "Skip this campaign",
    edit: "Open in editor",
  } as const;

  const colors = {
    approve: "bg-emerald-600 hover:bg-emerald-700",
    reject: "bg-slate-600 hover:bg-slate-700",
    edit: "bg-indigo-600 hover:bg-indigo-700",
  } as const;

  async function onConfirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/autopilot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirm: true }),
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
      if (json.result === "approved_sent") {
        setDone("Campaign is sending. You can close this page.");
      } else if (json.result === "rejected") {
        setDone("Got it — this campaign will not send.");
      } else {
        setDone("Done.");
      }
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="mt-6 text-sm font-medium text-ink">{done}</p>;
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
