export const EMAIL_CONSENT_VERSION = "email-consent-2026-10-10";

export const FIELD_CATALOG = [
  { key: "email", label: "Email", type: "email" },
  { key: "firstName", label: "First name", type: "text" },
  { key: "lastName", label: "Last name", type: "text" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "company", label: "Company", type: "text" },
  { key: "zip", label: "ZIP/postal code", type: "text" },
] as const;

export type CatalogKey = (typeof FIELD_CATALOG)[number]["key"];

export type FormFieldDef = {
  key: CatalogKey;
  label: string;
  type: "email" | "text" | "phone";
  required: boolean;
};

const CATALOG_BY_KEY = new Map(FIELD_CATALOG.map((field) => [field.key, field]));

export function emailConsentText(brandName: string): string {
  const brand = brandName.trim() || "this business";
  return `By subscribing, you agree to receive emails from ${brand}. You can unsubscribe at any time.`;
}

export function normalizeFormFields(input: unknown): { fields: FormFieldDef[]; error?: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { fields: [], error: "Choose at least an email or a phone number" };
  }
  const fields: FormFieldDef[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { fields: [], error: "Invalid field" };
    const key = String((raw as { key?: string }).key || "");
    const catalog = CATALOG_BY_KEY.get(key as CatalogKey);
    if (!catalog) return { fields: [], error: "That field is not available yet" };
    if (seen.has(key)) return { fields: [], error: "Duplicate field" };
    seen.add(key);
    const label = String((raw as { label?: string }).label || catalog.label).trim().slice(0, 80);
    fields.push({
      key: catalog.key,
      label: label || catalog.label,
      type: catalog.type,
      required: Boolean((raw as { required?: boolean }).required),
    });
  }
  const email = fields.find((field) => field.key === "email");
  const phone = fields.find((field) => field.key === "phone");
  if (!email && !phone) return { fields: [], error: "Choose at least an email or a phone number" };
  if (email && !email.required && !(phone && phone.required)) {
    return { fields: [], error: "Email can be optional only when phone is required" };
  }
  return { fields };
}

export function requirementModeFor(fields: FormFieldDef[]): string {
  const email = fields.find((field) => field.key === "email");
  const phone = fields.find((field) => field.key === "phone");
  if (email?.required && phone?.required) return "both-required";
  if (phone?.required && !email?.required) return "phone-required";
  if (email?.required) return "email-required";
  return "either-required";
}

export function defaultNewsletterFields(): FormFieldDef[] {
  return [
    { key: "email", label: "Email", type: "email", required: true },
    { key: "firstName", label: "First name", type: "text", required: false },
  ];
}
