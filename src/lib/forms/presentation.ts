export const POPUP_DELAYS = [5, 10, 20, 30] as const;
export const POPUP_SCROLLS = [25, 50, 75] as const;
export const POPUP_FREQUENCIES = ["once", "7d", "30d"] as const;

export type PopupDelay = (typeof POPUP_DELAYS)[number];
export type PopupScroll = (typeof POPUP_SCROLLS)[number];
export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number];

export type FormPresentation = {
  display: "inline" | "popup";
  trigger: "delay" | "scroll";
  delaySeconds: PopupDelay;
  scrollPercent: PopupScroll;
  frequency: PopupFrequency;
};

export const DEFAULT_PRESENTATION: FormPresentation = {
  display: "inline",
  trigger: "delay",
  delaySeconds: 10,
  scrollPercent: 50,
  frequency: "7d",
};

function oneOf<T extends number | string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parsePresentation(raw: unknown): FormPresentation {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const display = source.display === "popup" ? "popup" : "inline";
  const trigger = source.trigger === "scroll" ? "scroll" : "delay";
  return {
    display,
    trigger,
    delaySeconds: oneOf(Number(source.delaySeconds), POPUP_DELAYS, DEFAULT_PRESENTATION.delaySeconds),
    scrollPercent: oneOf(Number(source.scrollPercent), POPUP_SCROLLS, DEFAULT_PRESENTATION.scrollPercent),
    frequency: oneOf(source.frequency, POPUP_FREQUENCIES, DEFAULT_PRESENTATION.frequency),
  };
}

/** True when a stored "shown at" timestamp still blocks another popup. */
export function popupFrequencyAllows(
  storedAt: number | null,
  frequency: PopupFrequency,
  now: number
): boolean {
  if (!storedAt || !Number.isFinite(storedAt)) return true;
  if (frequency === "once") return false;
  const days = frequency === "30d" ? 30 : 7;
  return now - storedAt >= days * 24 * 60 * 60 * 1000;
}

export function frequencyLabel(frequency: PopupFrequency): string {
  if (frequency === "once") return "Once per visitor";
  if (frequency === "30d") return "Once every 30 days";
  return "Once every 7 days";
}
