import {
  SESv2Client,
  GetAccountCommand,
  GetEmailIdentityCommand,
  GetConfigurationSetCommand,
  GetConfigurationSetEventDestinationsCommand,
} from "@aws-sdk/client-sesv2";
import { isDevMailMode } from "@/lib/mailer";
import { getCampaignQueue } from "@/lib/queue";
import { getRedis } from "@/lib/redis";

export interface SesReadinessReport {
  region: string;
  platformSendDomain: string | null;
  configurationSet: string | null;
  /** True when AWS access + secret key env vars are both set (values never returned). */
  awsCredentialsConfigured: boolean;
  /** True when blank keys force local .eml outbox mode. */
  devMailMode: boolean;
  /** Null when credentials absent or GetAccount failed. */
  sandbox: boolean | null;
  domainVerified: boolean | null;
  dkimStatus: string | null;
  mailFromDomain: string | null;
  mailFromStatus: string | null;
  configurationSetPresent: boolean | null;
  snsEventDestinationPresent: boolean | null;
  redisConfigured: boolean;
  redisReachable: boolean | null;
  queueConfigured: boolean;
  checklist: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail?: string;
  }>;
}

/**
 * Safe SES/ops readiness report — boolean flags and public names only.
 * Never returns secret key values.
 */
export async function getSesReadinessReport(): Promise<SesReadinessReport> {
  const region = process.env.AWS_REGION || "us-east-1";
  const platformSendDomain = process.env.PLATFORM_SEND_DOMAIN?.trim() || null;
  const configurationSet = process.env.SES_CONFIGURATION_SET?.trim() || null;
  const awsCredentialsConfigured = !!(
    process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
  const devMailMode = isDevMailMode();
  const redisConfigured = !!process.env.REDIS_URL?.trim();
  const queueConfigured = !!getCampaignQueue();

  let redisReachable: boolean | null = null;
  if (redisConfigured) {
    try {
      const redis = getRedis();
      if (!redis) {
        redisReachable = false;
      } else {
        const pong = await Promise.race([
          redis.ping(),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 2000)
          ),
        ]);
        redisReachable = pong === "PONG";
      }
    } catch {
      redisReachable = false;
    }
  }

  let sandbox: boolean | null = null;
  let domainVerified: boolean | null = null;
  let dkimStatus: string | null = null;
  let mailFromDomain: string | null = null;
  let mailFromStatus: string | null = null;
  let configurationSetPresent: boolean | null = null;
  let snsEventDestinationPresent: boolean | null = null;
  let liveProbeError: string | null = null;

  if (awsCredentialsConfigured && !devMailMode) {
    try {
      const client = new SESv2Client({ region });
      const account = await client.send(new GetAccountCommand({}));
      sandbox = account.ProductionAccessEnabled === false;

      if (platformSendDomain) {
        const identity = await client.send(
          new GetEmailIdentityCommand({ EmailIdentity: platformSendDomain })
        );
        domainVerified = identity.VerifiedForSendingStatus === true;
        dkimStatus = identity.DkimAttributes?.Status ?? null;
        mailFromDomain = identity.MailFromAttributes?.MailFromDomain ?? null;
        mailFromStatus = identity.MailFromAttributes?.MailFromDomainStatus ?? null;
      }

      if (configurationSet) {
        await client.send(
          new GetConfigurationSetCommand({ ConfigurationSetName: configurationSet })
        );
        configurationSetPresent = true;
        const eds = await client.send(
          new GetConfigurationSetEventDestinationsCommand({
            ConfigurationSetName: configurationSet,
          })
        );
        snsEventDestinationPresent = (eds.EventDestinations ?? []).some(
          (d) =>
            d.Enabled &&
            d.SnsDestination?.TopicArn &&
            (d.MatchingEventTypes ?? []).includes("BOUNCE") &&
            (d.MatchingEventTypes ?? []).includes("COMPLAINT") &&
            (d.MatchingEventTypes ?? []).includes("DELIVERY")
        );
      }
    } catch (err) {
      liveProbeError = err instanceof Error ? err.message : "SES probe failed";
      // Do not include secret-looking substrings in UI detail.
      liveProbeError = liveProbeError.replace(/AKIA[A-Z0-9]{16}/g, "[redacted]");
    }
  }

  const checklist: SesReadinessReport["checklist"] = [
    {
      id: "credentials",
      label: "Credentials detected",
      ok: awsCredentialsConfigured && !devMailMode,
      detail: awsCredentialsConfigured
        ? devMailMode
          ? "Keys present but still in outbox mode"
          : "Access key present (secret not shown)"
        : "Blank keys → local .eml outbox mode",
    },
    {
      id: "region",
      label: "Region us-east-1",
      ok: region === "us-east-1",
      detail: region,
    },
    {
      id: "sandbox",
      label: "Sandbox true",
      ok: sandbox === true,
      detail:
        sandbox === null
          ? liveProbeError || "Not probed"
          : sandbox
            ? "ProductionAccessEnabled=false"
            : "Production access already enabled",
    },
    {
      id: "domain-verified",
      label: "Domain verified",
      ok: domainVerified === true,
      detail:
        platformSendDomain == null
          ? "PLATFORM_SEND_DOMAIN unset"
          : domainVerified == null
            ? liveProbeError || "Not probed"
            : `${platformSendDomain}: ${domainVerified ? "verified" : "not verified"}`,
    },
    {
      id: "dkim",
      label: "DKIM success",
      ok: dkimStatus === "SUCCESS",
      detail: dkimStatus || liveProbeError || "Not probed",
    },
    {
      id: "mail-from",
      label: "MAIL FROM success",
      ok: mailFromStatus === "SUCCESS",
      detail:
        mailFromStatus == null
          ? liveProbeError || "Not probed"
          : `${mailFromDomain || "—"}: ${mailFromStatus}`,
    },
    {
      id: "configuration-set",
      label: "Configuration set present",
      ok: configurationSetPresent === true,
      detail:
        configurationSetPresent === true
          ? configurationSet || "present"
          : configurationSetPresent === false
            ? "Missing in SES"
            : configurationSet
              ? liveProbeError || `Named ${configurationSet} — not probed`
              : "SES_CONFIGURATION_SET unset",
    },
    {
      id: "sns-destination",
      label: "SNS event destination present",
      ok: snsEventDestinationPresent === true,
      detail:
        snsEventDestinationPresent === true
          ? "DELIVERY + BOUNCE + COMPLAINT enabled"
          : snsEventDestinationPresent === false
            ? "Missing or incomplete"
            : liveProbeError || "Not probed",
    },
    {
      id: "redis",
      label: "Redis configured",
      ok: redisConfigured,
      detail: redisConfigured
        ? redisReachable === false
          ? "URL set but ping failed"
          : redisReachable
            ? "Reachable"
            : "URL set"
        : "REDIS_URL unset — sends run inline",
    },
    {
      id: "queue",
      label: "Campaign queue available",
      ok: queueConfigured,
      detail: queueConfigured ? "BullMQ connected" : "Inline fallback",
    },
  ];

  return {
    region,
    platformSendDomain,
    configurationSet,
    awsCredentialsConfigured,
    devMailMode,
    sandbox,
    domainVerified,
    dkimStatus,
    mailFromDomain,
    mailFromStatus,
    configurationSetPresent,
    snsEventDestinationPresent,
    redisConfigured,
    redisReachable,
    queueConfigured,
    checklist,
  };
}

/** Plain-text setup instructions for clipboard (no credentials). */
export function getSesSetupInstructionsText(): string {
  return [
    "Sendfable — Amazon SES setup (summary)",
    "",
    "1. Create or use an AWS account; enable MFA on the root user.",
    "2. Create an IAM user/role with least-privilege SES permissions.",
    "3. Pick one SES region and set AWS_REGION to match.",
    "4. Verify PLATFORM_SEND_DOMAIN in SES; publish DKIM CNAMEs.",
    "5. Add SPF / MAIL FROM / DMARC as in docs/SES_DNS_RECORDS.md.",
    "6. Create SES configuration set matching SES_CONFIGURATION_SET.",
    "7. Event destination → SNS for Delivery, Bounce, Complaint.",
    "8. Subscribe SNS to https://YOUR_DOMAIN/api/webhooks/ses (HTTPS).",
    "9. Confirm the SNS subscription (app auto-confirms when live).",
    "10. Leave AWS keys blank locally to stay in .eml outbox mode.",
    "11. Test in SES sandbox; then request production access.",
    "12. Warm gradually; monitor bounce (<5%) and complaint (<0.1%).",
    "",
    "See docs/SES_SETUP_CHECKLIST.md and docs/SES_SNS_SETUP.md for detail.",
    "Never paste secret keys into chat, tickets, or public docs.",
  ].join("\n");
}
