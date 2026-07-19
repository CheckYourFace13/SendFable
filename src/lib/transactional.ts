import { appUrl } from "@/lib/utils";
import { platformFrom, sendEmail } from "@/lib/mailer";

/** Minimal branded shell for transactional (non-campaign) emails. */
function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td style="padding-bottom:24px;text-align:center;">
  <span style="font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.02em;">Send<span style="color:#4F46E5;">fable</span></span>
</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">${title}</h1>
  ${bodyHtml}
</td></tr>
<tr><td style="padding-top:24px;text-align:center;font-size:12px;color:#9ca3af;">
  Sendfable · Email marketing that costs half and lands better
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background-color:#4F46E5;">
  <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
</td></tr></table>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${text}</p>`;

const fine = (text: string) =>
  `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">${text}</p>`;

export async function sendEmailVerification(to: string, token: string) {
  const url = appUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  await sendEmail({
    from: platformFrom(),
    to,
    subject: "Verify your email — Sendfable",
    html: shell(
      "Confirm your email address",
      p("Welcome to Sendfable! Click the button below to verify your email address and unlock sending.") +
        button(url, "Verify my email") +
        fine("This link expires in 24 hours. If you didn't create a Sendfable account, you can safely ignore this email.")
    ),
  });
}

export async function sendMagicLink(to: string, url: string) {
  await sendEmail({
    from: platformFrom(),
    to,
    subject: "Your Sendfable sign-in link",
    html: shell(
      "Sign in to Sendfable",
      p("Click the button below to sign in. No password needed.") +
        button(url, "Sign in to Sendfable") +
        fine("This link expires in 24 hours and can only be used once. If you didn't request it, ignore this email.")
    ),
  });
}

export async function sendSenderVerification(to: string, token: string) {
  const url = appUrl(`/api/identities/verify?token=${encodeURIComponent(token)}`);
  await sendEmail({
    from: platformFrom(),
    to,
    subject: "Verify this sender address — Sendfable",
    html: shell(
      "Verify your sender address",
      p(`Someone (hopefully you) wants to send email from <strong>${to}</strong> via Sendfable. Confirm you own this address:`) +
        button(url, "Yes, verify this address") +
        fine("If you didn't request this, ignore this email — the address will not be used.")
    ),
  });
}

export async function sendDoubleOptInConfirmation(
  to: string,
  workspaceName: string,
  token: string
) {
  const url = appUrl(`/api/forms/confirm?token=${encodeURIComponent(token)}`);
  await sendEmail({
    from: platformFrom(workspaceName),
    to,
    subject: `Confirm your subscription to ${workspaceName}`,
    html: shell(
      `Confirm your subscription`,
      p(`Please confirm you'd like to receive emails from <strong>${workspaceName}</strong>.`) +
        button(url, "Confirm subscription") +
        fine("If you didn't sign up, ignore this email and you won't be subscribed.")
    ),
  });
}

export async function sendCampaignAutoPausedAlert(
  to: string,
  campaignName: string,
  reason: string,
  campaignId: string
) {
  const url = appUrl(`/campaigns/${campaignId}`);
  await sendEmail({
    from: platformFrom(),
    to,
    subject: `⚠️ Campaign paused automatically: ${campaignName}`,
    html: shell(
      "We paused your campaign",
      p(`Your campaign <strong>${campaignName}</strong> was automatically paused: ${reason}.`) +
        p("High bounce or complaint rates hurt your deliverability and the platform's. Please review your list quality before resuming — remove old, purchased, or scraped addresses.") +
        button(url, "Review campaign") +
        fine("Repeated incidents can lead to account review per our acceptable-use policy.")
    ),
  });
}

export async function sendWorkspaceInvite(
  to: string,
  inviterName: string,
  workspaceName: string,
  token: string
) {
  const url = appUrl(`/invite/${encodeURIComponent(token)}`);
  await sendEmail({
    from: platformFrom(),
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Sendfable`,
    html: shell(
      `Join ${workspaceName}`,
      p(`<strong>${inviterName}</strong> invited you to collaborate on <strong>${workspaceName}</strong> in Sendfable.`) +
        button(url, "Accept invitation") +
        fine("This invitation expires in 7 days.")
    ),
  });
}
