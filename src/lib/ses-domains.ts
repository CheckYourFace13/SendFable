import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
} from "@aws-sdk/client-sesv2";
import { isDevMailMode } from "@/lib/mailer";

let client: SESv2Client | null | undefined;

function getClient(): SESv2Client | null {
  if (client !== undefined) return client;
  if (isDevMailMode()) {
    client = null;
    return null;
  }
  client = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  return client;
}

function fakeDkimTokens(domain: string): string[] {
  // Deterministic pseudo-tokens so the dev wizard UI is fully exercisable.
  const base = Buffer.from(domain).toString("hex").slice(0, 12);
  return [`${base}a1`, `${base}b2`, `${base}c3`];
}

/**
 * Register a customer domain with SES (Easy DKIM) and return the DKIM CNAME
 * tokens. In dev mode returns deterministic fake tokens.
 */
export async function createSesDomainIdentity(domain: string): Promise<string[]> {
  const ses = getClient();
  if (!ses) return fakeDkimTokens(domain);

  try {
    const res = await ses.send(
      new CreateEmailIdentityCommand({ EmailIdentity: domain })
    );
    return res.DkimAttributes?.Tokens ?? [];
  } catch (err) {
    const e = err as { name?: string };
    if (e.name === "AlreadyExistsException") {
      const existing = await ses.send(
        new GetEmailIdentityCommand({ EmailIdentity: domain })
      );
      return existing.DkimAttributes?.Tokens ?? [];
    }
    throw err;
  }
}

export type DomainVerificationStatus = "PENDING" | "VERIFIED" | "FAILED";

/** Poll SES for the DKIM verification status of a domain identity. */
export async function getSesDomainStatus(domain: string): Promise<DomainVerificationStatus> {
  const ses = getClient();
  if (!ses) {
    // Dev mode: "verify" automatically so the whole flow is testable locally.
    return "VERIFIED";
  }
  const res = await ses.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
  const status = res.DkimAttributes?.Status;
  if (status === "SUCCESS") return "VERIFIED";
  if (status === "FAILED" || status === "TEMPORARY_FAILURE") return "FAILED";
  return "PENDING";
}

export async function deleteSesDomainIdentity(domain: string): Promise<void> {
  const ses = getClient();
  if (!ses) return;
  await ses
    .send(new DeleteEmailIdentityCommand({ EmailIdentity: domain }))
    .catch(() => undefined);
}

export interface DkimRecord {
  name: string;
  type: "CNAME";
  value: string;
}

export function dkimRecordsFor(domain: string, tokens: string[]): DkimRecord[] {
  return tokens.map((t) => ({
    name: `${t}._domainkey.${domain}`,
    type: "CNAME",
    value: `${t}.dkim.amazonses.com`,
  }));
}
