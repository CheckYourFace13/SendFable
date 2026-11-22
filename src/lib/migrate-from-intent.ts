/**
 * Competitor "from=" intent — carry through signup/login/onboarding into CSV migrate.
 * SendFable imports via CSV only; this never claims a live competitor API sync.
 */

import {
  MIGRATION_PRESETS,
  type MigrationProvider,
} from "@/lib/migration-presets";

const PROVIDER_ALIASES: Record<string, MigrationProvider> = {
  mailchimp: "mailchimp",
  "constant-contact": "constant-contact",
  constantcontact: "constant-contact",
  brevo: "brevo",
  sendinblue: "brevo",
  mailerlite: "mailerlite",
  kit: "kit",
  convertkit: "kit",
  generic: "generic",
};

/** Display names for public CTAs. */
const PROVIDER_DISPLAY: Partial<Record<MigrationProvider, string>> = {
  mailchimp: "Mailchimp",
  "constant-contact": "Constant Contact",
  brevo: "Brevo",
  mailerlite: "MailerLite",
  kit: "Kit",
};

export function parseMigrateFrom(value: unknown): MigrationProvider | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (!key || key === "onboarding") return null;
  const provider = PROVIDER_ALIASES[key];
  if (!provider) return null;
  if (!(provider in MIGRATION_PRESETS)) return null;
  return provider;
}

export function migrateFromDisplayName(provider: MigrationProvider): string {
  return PROVIDER_DISPLAY[provider] ?? MIGRATION_PRESETS[provider]?.label ?? provider;
}

/** Public signup CTA with competitor migrate intent. */
export function signupWithMigrateFrom(provider: MigrationProvider, extra?: URLSearchParams): string {
  const q = new URLSearchParams(extra);
  q.set("from", provider);
  return `/signup?${q.toString()}`;
}

/** After auth, land on CSV migrate with the right provider preset. */
export function contactsMigratePath(provider: MigrationProvider): string {
  return `/contacts/migrate?provider=${encodeURIComponent(provider)}`;
}

/** Prefer migrate hub for known providers; otherwise generic onboarding. */
export function postAuthPathForMigrateFrom(
  from: MigrationProvider | null,
  fallback = "/onboarding"
): string {
  if (!from || from === "generic") return fallback;
  return contactsMigratePath(from);
}

export function moveListCtaLabel(provider: MigrationProvider): string {
  const name = migrateFromDisplayName(provider);
  return `Move my ${name} list free`;
}
