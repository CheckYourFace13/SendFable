/**
 * Public mailbox providers that publish strict DMARC policies (p=reject or
 * p=quarantine). Mail sent "From" these domains through third-party
 * infrastructure fails DMARC alignment and lands in spam — so Sendfable
 * rewrites the From to localpart@PLATFORM_SEND_DOMAIN and sets Reply-To to
 * the user's real, verified address.
 */
export const STRICT_DMARC_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "aol.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
]);

export function domainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function localPartOf(email: string): string {
  return email.split("@")[0] ?? "";
}

export function requiresRewrite(email: string): boolean {
  return STRICT_DMARC_PROVIDERS.has(domainOf(email));
}

export function platformSendDomain(): string {
  return process.env.PLATFORM_SEND_DOMAIN || "send.sendfable.com";
}

/** The address actually used in the From header for a rewritten identity. */
export function rewrittenAddress(email: string): string {
  return `${localPartOf(email)}@${platformSendDomain()}`;
}
