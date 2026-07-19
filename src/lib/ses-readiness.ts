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

  const checklist: SesReadinessReport["checklist"] = [
    {
      id: "region",
      label: "AWS region set",
      ok: !!process.env.AWS_REGION?.trim(),
      detail: region,
    },
    {
      id: "credentials",
      label: "AWS credentials configured",
      ok: awsCredentialsConfigured,
      detail: awsCredentialsConfigured
        ? "Access key present (secret not shown)"
        : "Blank keys → local .eml outbox mode",
    },
    {
      id: "platform-domain",
      label: "Platform send domain configured",
      ok: !!platformSendDomain,
      detail: platformSendDomain || "Set PLATFORM_SEND_DOMAIN",
    },
    {
      id: "configuration-set",
      label: "SES configuration set named",
      ok: !!configurationSet,
      detail: configurationSet || "Set SES_CONFIGURATION_SET",
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
