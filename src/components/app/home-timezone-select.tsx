"use client";

import { HOME_TIMEZONES, labelHomeTimezone } from "@/lib/home-timezone";

export function HomeTimezoneSelect({
  id,
  value,
  onChange,
  className,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={
        className ||
        "min-h-11 w-full rounded-md border border-ink/15 bg-background px-3 text-sm"
      }
    >
      {HOME_TIMEZONES.map((zone) => (
        <option key={zone} value={zone}>
          {labelHomeTimezone(zone)}
        </option>
      ))}
    </select>
  );
}
