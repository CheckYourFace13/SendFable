export const FORM_UNAVAILABLE = "This form is not accepting submissions right now.";
export const AUDIENCE_REQUIRED = "Choose an audience before this form can accept signups.";

export function audienceIds(tagIds: unknown): string[] {
  if (!Array.isArray(tagIds)) return [];
  return tagIds.filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** Public hosted, embed, and API submits require an active form with an audience. */
export function canAcceptPublicSignups(status: string, tagIds: unknown): boolean {
  return status === "ACTIVE" && audienceIds(tagIds).length > 0;
}

export function fieldSummary(fields: unknown): string {
  if (!Array.isArray(fields)) return "";
  return fields
    .map((field) => {
      if (!field || typeof field !== "object" || !("label" in field)) return "";
      return String((field as { label: unknown }).label || "").trim();
    })
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");
}
