"use client";

import { useState } from "react";

/** Unobtrusive INTERNAL-workspace dogfood note (OWNER_ADMIN only). */
export function ReportProductIssue() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/product-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          feature: feature || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(json.error || "Failed");
        return;
      }
      setDescription("");
      setFeature("");
      setOpen(false);
      setStatus("Saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {status && !open && (
        <div className="mb-2 rounded bg-ink px-2 py-1 text-xs text-page">{status}</div>
      )}
      {open ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="w-72 space-y-2 rounded-lg border border-ink/15 bg-white p-3 shadow-lg"
        >
          <div className="text-xs font-semibold text-ink">Report product issue</div>
          <input
            className="w-full rounded border px-2 py-1 text-xs"
            placeholder="Feature (optional)"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
          />
          <textarea
            className="h-24 w-full rounded border px-2 py-1 text-xs"
            placeholder="What felt wrong?"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-ink px-2 py-1 text-xs text-page disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-ink/20 bg-white/95 px-3 py-1.5 text-xs text-ink shadow"
        >
          Report product issue
        </button>
      )}
    </div>
  );
}
