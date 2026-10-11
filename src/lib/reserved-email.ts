/**
 * Reserved IETF example domains — never production-mail these addresses.
 * @see https://www.rfc-editor.org/rfc/rfc2606
 */

const RESERVED_EXAMPLE_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
]);

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

/** True for example.com / example.net / example.org (any subdomain). */
export function isReservedExampleEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (RESERVED_EXAMPLE_DOMAINS.has(domain)) return true;
  for (const reserved of RESERVED_EXAMPLE_DOMAINS) {
    if (domain.endsWith(`.${reserved}`)) return true;
  }
  return false;
}

export { RESERVED_EXAMPLE_DOMAINS };
