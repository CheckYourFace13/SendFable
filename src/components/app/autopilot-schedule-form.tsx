"use client";

import { useState } from "react";
import { AUTOPILOT_TIMEZONES } from "@/lib/autopilot/schedule";
import { Button } from "@/components/ui/button";

export function AutopilotScheduleForm({
  audience,
  recipientCount,
  busy,
  submitLabel = "SCHEDULE CAMPAIGN",
  onSchedule,
}: {
  audience: string;
  recipientCount: number | null;
  busy?: boolean;
  submitLabel?: string;
  onSchedule: (value: { date: string; time: string; timezone: string }) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const ready = Boolean(date && time && timezone);

  return (
    <form
      className="space-y-3 rounded-lg border bg-muted/30 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || busy) return;
        onSchedule({ date, time, timezone });
      }}
    >
      <p className="text-sm">
        Audience: {audience}
        {recipientCount != null ? ` · ${recipientCount.toLocaleString()} recipients` : ""}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Date</span>
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 w-full rounded-md border bg-background px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Time</span>
          <input
            required
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="min-h-11 w-full rounded-md border bg-background px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Timezone</span>
          <select
            required
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="min-h-11 w-full rounded-md border bg-background px-3"
          >
            <option value="">Choose timezone</option>
            {AUTOPILOT_TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ready && (
        <p className="text-sm text-muted-foreground">
          Selected: {date} at {time} ({timezone.replace(/_/g, " ")})
        </p>
      )}
      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!ready || busy}>
        {busy ? "Scheduling…" : submitLabel}
      </Button>
    </form>
  );
}
