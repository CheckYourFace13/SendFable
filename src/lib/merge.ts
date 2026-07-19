/**
 * Merge-tag rendering with fallback syntax: {{first_name|there}}
 * Unknown tags with no fallback render as empty string.
 */

export type MergeData = Record<string, string | number | null | undefined>;

const TAG_RE = /\{\{\s*([a-zA-Z0-9_.]+)(?:\s*\|\s*([^}]*))?\s*\}\}/g;

export function renderMergeTags(template: string, data: MergeData): string {
  return template.replace(TAG_RE, (_match, key: string, fallback?: string) => {
    const raw = data[key] ?? data[key.toLowerCase()];
    if (raw !== undefined && raw !== null && String(raw).length > 0) {
      return escapeHtml(String(raw));
    }
    return fallback !== undefined ? escapeHtml(fallback.trim()) : "";
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const MERGE_TAG_OPTIONS = [
  { key: "first_name", label: "First name", sample: "Alex" },
  { key: "last_name", label: "Last name", sample: "Rivera" },
  { key: "email", label: "Email", sample: "alex@example.com" },
  { key: "full_name", label: "Full name", sample: "Alex Rivera" },
] as const;

export function contactMergeData(contact: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  customFields?: unknown;
}): MergeData {
  const custom =
    contact.customFields && typeof contact.customFields === "object"
      ? (contact.customFields as Record<string, string>)
      : {};
  const first = contact.firstName ?? "";
  const last = contact.lastName ?? "";
  return {
    email: contact.email,
    first_name: first,
    last_name: last,
    full_name: [first, last].filter(Boolean).join(" ") || contact.email,
    ...custom,
  };
}
