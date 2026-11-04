"use client";

import { useMemo, useState } from "react";
import { AUTOPILOT_TIMEZONES, resolveDefaultTimezone } from "@/lib/autopilot/schedule";
import { Button } from "@/components/ui/button";

export function AutopilotScheduleForm({
  audience,
  recipientCount,
  busy,
  submitLabel = "SCHEDULE FOR LATER",
  defaultTimezone,
  browserTimezone,
  onSchedule,
  onSendNow,
}: {
  audience: string;
  recipientCount: number | null;
  busy?: boolean;
  submitLabel?: string;
  defaultTimezone?: string | null;
  browserTimezone?: string | null;
  onSchedule: (value: { date: string; time: string; timezone: string }) => void;
  onSendNow?: () => void;
}) {
  const resolvedZone = useMemo(
    () =>
      resolveDefaultTimezone({
        workspaceTimezone: defaultTimezone,
        browserTimezone:
          browserTimezone ||
          (typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : null),
      }),
    [defaultTimezone, browserTimezone]
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState(resolvedZone);
  const [mode, setMode] = useState<"choose" | "schedule">(onSendNow ? "choose" : "schedule");
  const ready = Boolean(date && time && timezone);

  if (mode === "choose" && onSendNow) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm">
          Audience: {audience}
          {recipientCount != null ? ` · ${recipientCount.toLocaleString()} recipients` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          Timezone default: {resolvedZone.replace(/_/g, " ")} (editable when you schedule)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => onSendNow()}
          >
            {busy ? "Working…" : "SEND NOW"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => setMode("schedule")}
          >
            SCHEDULE FOR LATER
          </Button>
        </div>
      </div>
    );
  }

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
            {AUTOPILOT_TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-muted-foreground">
        Prefills from your workspace timezone ({resolvedZone.replace(/_/g, " ")}). You can change
        it.
      </p>
      {ready && (
        <p className="text-sm text-muted-foreground">
          Selected: {date} at {time} ({timezone.replace(/_/g, " ")})
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!ready || busy}>
          {busy ? "Scheduling…" : submitLabel}
        </Button>
        {onSendNow && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => setMode("choose")}
          >
            Back
          </Button>
        )}
      </div>
    </form>
  );
}
