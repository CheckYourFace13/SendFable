import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export interface OutgoingEmail {
  from: string; // RFC 5322, e.g. `Jane Doe <jane@send.sendfable.com>`
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  /** SES message tags, surfaced in event notifications */
  tags?: Record<string, string>;
  /** Skip the configuration set (used for transactional mail if desired) */
  noConfigurationSet?: boolean;
}

export interface SendResult {
  messageId: string;
  dev: boolean;
}

let sesClient: SESv2Client | null | undefined;

export function isDevMailMode(): boolean {
  return !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY;
}

function getSes(): SESv2Client | null {
  if (sesClient !== undefined) return sesClient;
  if (isDevMailMode()) {
    sesClient = null;
    return null;
  }
  sesClient = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  return sesClient;
}

function outboxDir(): string {
  if (process.env.OUTBOX_DIR) return process.env.OUTBOX_DIR;
  // Spec'd location is /tmp/outbox; fall back to the OS temp dir on Windows.
  return process.platform === "win32"
    ? path.join(os.tmpdir(), "outbox")
    : "/tmp/outbox";
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(?=.)/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function writeEmlFile(msg: OutgoingEmail): Promise<string> {
  const dir = outboxDir();
  await fs.mkdir(dir, { recursive: true });
  const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const extraHeaders = Object.entries(msg.headers ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");
  const eml = [
    `From: ${msg.from}`,
    `To: ${msg.to}`,
    msg.replyTo ? `Reply-To: ${msg.replyTo}` : null,
    `Subject: ${msg.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}@sendfable.dev>`,
    extraHeaders || null,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    msg.html,
  ]
    .filter((l): l is string => l !== null)
    .join("\r\n");
  const file = path.join(dir, `${id}.eml`);
  await fs.writeFile(file, eml, "utf8");
  return id;
}

/**
 * Send an email through SES v2. In dev mode (no AWS credentials) the message
 * is logged to the console and written as a .eml file to the local outbox so
 * the entire app is testable without AWS.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const ses = getSes();

  if (!ses) {
    const id = await writeEmlFile(msg);
    console.log(
      `\n📧 [dev outbox] ${outboxDir()}${path.sep}${id}.eml\n` +
        `   From: ${msg.from}\n   To: ${msg.to}\n` +
        (msg.replyTo ? `   Reply-To: ${msg.replyTo}\n` : "") +
        `   Subject: ${msg.subject}\n`
    );
    return { messageId: id, dev: true };
  }

  const headers = Object.entries(msg.headers ?? {}).map(([Name, Value]) => ({
    Name,
    Value,
  }));

  const command = new SendEmailCommand({
    FromEmailAddress: msg.from,
    Destination: { ToAddresses: [msg.to] },
    ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
    ConfigurationSetName: msg.noConfigurationSet
      ? undefined
      : process.env.SES_CONFIGURATION_SET || undefined,
    EmailTags: msg.tags
      ? Object.entries(msg.tags).map(([Name, Value]) => ({ Name, Value }))
      : undefined,
    Content: {
      Simple: {
        Subject: { Data: msg.subject, Charset: "UTF-8" },
        Headers: headers.length ? headers : undefined,
        Body: {
          Html: { Data: msg.html, Charset: "UTF-8" },
          Text: { Data: msg.text ?? htmlToText(msg.html), Charset: "UTF-8" },
        },
      },
    },
  });

  const res = await ses.send(command);
  return { messageId: res.MessageId ?? "", dev: false };
}

/** Transient SES errors that merit a retry with backoff. */
export function isTransientSesError(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  if (!e) return false;
  const transientNames = new Set([
    "TooManyRequestsException",
    "ThrottlingException",
    "LimitExceededException",
    "SendingPausedException",
    "InternalServiceErrorException",
    "ServiceUnavailableException",
    "TimeoutError",
  ]);
  if (e.name && transientNames.has(e.name)) return true;
  const code = e.$metadata?.httpStatusCode;
  return code !== undefined && (code === 429 || code >= 500);
}

/** Default platform From used for transactional mail. */
export function platformFrom(displayName = "Sendfable"): string {
  const domain = process.env.PLATFORM_SEND_DOMAIN || "send.sendfable.com";
  return `${displayName} <no-reply@${domain}>`;
}
