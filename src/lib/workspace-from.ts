import { emailDomain } from "@/lib/reserved-email";

export type WorkspaceFromIdentity = {
  type: "ADDRESS" | "DOMAIN";
  value: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
};

/** Shared platform domains stay on the default sender for every workspace. */
export function isSharedPlatformDomain(domain: string): boolean {
  const host = domain.trim().toLowerCase();
  return host === "sendfable.com" || host.endsWith(".sendfable.com");
}

export function safeDisplayName(name: string): string {
  const cleaned = name.replace(/[\r\n<>"]/g, "").trim().slice(0, 80);
  return cleaned || "SendFable";
}

/**
 * A workspace may set From only for its own verified address or domain.
 * Omitting From keeps the shared platform sender.
 */
export function identityAllowsFrom(identities: WorkspaceFromIdentity[], fromEmail: string): boolean {
  const email = fromEmail.trim().toLowerCase();
  const domain = emailDomain(email);
  if (!email.includes("@") || !domain || isSharedPlatformDomain(domain)) return false;
  return identities.some((row) => {
    if (row.status !== "VERIFIED") return false;
    const value = row.value.trim().toLowerCase();
    if (row.type === "ADDRESS") return value === email;
    if (row.type === "DOMAIN") return value === domain;
    return false;
  });
}

export function formatWorkspaceFrom(displayName: string, email: string): string {
  return `${safeDisplayName(displayName)} <${email.trim().toLowerCase()}>`;
}
