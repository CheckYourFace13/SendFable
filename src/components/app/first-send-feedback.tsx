"use client";

import { useState } from "react";
import { track } from "@/lib/track";

/**
 * Inline first-send feedback — never a blocking modal.
 * Free-text stays first-party only (never GA4).
 */
export function FirstSendFeedback({ show }: { show: boolean }) {
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  if (!show || done) return null;

  function submit(rating: "easy" | "okay" | "difficult") {
    track(
      "feedback_submitted",
      { context: "first_send", rating },
      { ga4: true }
    );
    if (note.trim()) {
      track(
        "feedback_note",
        { context: "first_send", length: Math.min(note.trim().length, 500) },
        { ga4: false }
      );
      // First-party only — do not mirror free text to GA4
      track(
        "feedback_note_text",
        { context: "first_send", note: note.trim().slice(0, 500) },
        { ga4: false }
      );
    }
    setDone(true);
  }

  return (
    <div className="mb-6 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm" role="group">
      <p className="font-medium">How did your first SendFable send feel?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["easy", "Easy"],
            ["okay", "Okay"],
            ["difficult", "Difficult"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="min-h-11 rounded-md border px-3 py-1.5 hover:bg-parchment"
            onClick={() => submit(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {!showNote ? (
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground underline"
          onClick={() => setShowNote(true)}
        >
          Tell us more (optional)
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
            maxLength={500}
            placeholder="What would have made this easier?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional notes stay private to product feedback — not sent to ad platforms.
          </p>
        </div>
      )}
    </div>
  );
}
