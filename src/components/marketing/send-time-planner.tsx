"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { planSendTimes, type AudienceKind, type Industry, type WeekPreference } from "@/lib/tools/send-time";

const ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Pacific/Honolulu",
  "Europe/London",
  "UTC",
];

export function SendTimePlanner() {
  const [audience, setAudience] = useState<AudienceKind>("consumer");
  const [week, setWeek] = useState<WeekPreference>("weekday");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [industry, setIndustry] = useState<Industry>("general");

  const plan = useMemo(
    () => planSendTimes({ audience, week, timezone, industry }),
    [audience, week, timezone, industry]
  );

  return (
    <div>
      <form className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5" onSubmit={(e) => e.preventDefault()}>
        <Field label="Who is the email for?" id="send-audience">
          <select
            id="send-audience"
            className={selectClass}
            value={audience}
            onChange={(e) => setAudience(e.target.value as AudienceKind)}
          >
            <option value="consumer">Customers and subscribers</option>
            <option value="b2b">Business buyers</option>
          </select>
        </Field>
        <Field label="When should it land?" id="send-week">
          <select id="send-week" className={selectClass} value={week} onChange={(e) => setWeek(e.target.value as WeekPreference)}>
            <option value="weekday">Weekdays</option>
            <option value="weekend">Weekends</option>
            <option value="either">Either — show the usual default</option>
          </select>
        </Field>
        <Field label="Primary timezone" id="send-zone">
          <select id="send-zone" className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Business type (optional)" id="send-industry">
          <select
            id="send-industry"
            className={selectClass}
            value={industry}
            onChange={(e) => setIndustry(e.target.value as Industry)}
          >
            <option value="general">General</option>
            <option value="restaurant">Restaurant or food</option>
            <option value="retail">Shop or retail</option>
            <option value="professional">Professional services</option>
            <option value="nonprofit">Nonprofit</option>
            <option value="local-events">Local events</option>
          </select>
        </Field>
      </form>

      <div className="mt-6 space-y-4" aria-live="polite">
        <p className="text-sm text-ink/70">{plan.disclaimer}</p>
        <ul className="space-y-3">
          {plan.windows.map((window) => (
            <li key={window.when} className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="font-semibold text-ink">{window.when}</p>
              <p className="mt-1 text-sm text-ink/70">{window.why}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink/80">
          <span className="font-medium text-ink">Test this first.</span> {plan.firstTest}
        </p>
        <p className="text-sm text-ink/60">{plan.timezoneNote}</p>
        <p>
          <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-coral hover:underline">
            Start free with SendFable
          </Link>
        </p>
      </div>
    </div>
  );
}

const selectClass =
  "mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
