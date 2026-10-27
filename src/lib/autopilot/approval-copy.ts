function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding-bottom:20px;text-align:center;">
  <span style="font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.02em;">SendFable</span>
</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;">
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">${title}</h1>
  ${bodyHtml}
</td></tr>
<tr><td style="padding-top:20px;text-align:center;font-size:12px;line-height:1.5;color:#9ca3af;">
  SendFable
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function actionBtn(href: string, label: string, bg: string): string {
  return `<tr><td style="padding:0 0 10px 0;">
  <a href="${href}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${bg};">${label}</a>
</td></tr>`;
}

/** Owner-facing change line — never expose filter keys like substantial_new_content. */
export function humanizeScribeChange(
  explanation: string | null | undefined,
  subject: string | null | undefined
): string {
  const raw = (explanation || "").trim();
  const fallback = (subject || "").trim();
  const internal = raw.match(/Detected a page change\s*\([^)]*\):\s*[“"']?(.+?)[”"']?\s*$/i);
  const titled = raw.match(/^New content found:\s*(.+)$/i);
  const title = (internal?.[1] || titled?.[1] || fallback || raw).replace(/[“”]/g, "").trim();
  if (!title) return "New content found on your watched page.";
  return `New content found: ${title}`;
}

export function renderAutopilotApprovalEmail(opts: {
  brandName: string;
  changeLine: string;
  subject: string;
  audienceLabel: string;
  recipients: number;
  previewSnippet: string;
  approveUrl: string;
  editUrl: string;
  rejectUrl: string;
}): { html: string; text: string } {
  const found = opts.changeLine.replace(/^New content found:\s*/i, "").trim();
  const body =
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">Scribe drafted a campaign for <strong>${escapeHtml(
      opts.brandName
    )}</strong>.</p>` +
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>New content found:</strong><br>${escapeHtml(
      found
    )}</p>` +
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>Subject:</strong> ${escapeHtml(
      opts.subject
    )}</p>` +
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>Audience:</strong> ${escapeHtml(
      opts.audienceLabel
    )} · <strong>Estimated recipients:</strong> ${opts.recipients}</p>` +
    `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;background:#f9fafb;border-radius:8px;padding:12px;">${escapeHtml(
      opts.previewSnippet
    )}…</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0">` +
    actionBtn(opts.approveUrl, "Approve &amp; Schedule", "#059669") +
    actionBtn(opts.editUrl, "Edit", "#4F46E5") +
    actionBtn(opts.rejectUrl, "Skip this campaign", "#6b7280") +
    `</table>` +
    `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">Nothing sends until you choose the date and time. Opening a link does not send the campaign.</p>`;

  const html = shell("Your next campaign is ready to review", body);
  const text = [
    "SendFable",
    "",
    "Your next campaign is ready to review",
    "",
    `Scribe drafted a campaign for ${opts.brandName}.`,
    `New content found: ${found}`,
    `Subject: ${opts.subject}`,
    `Audience: ${opts.audienceLabel}`,
    `Estimated recipients: ${opts.recipients}`,
    "",
    opts.previewSnippet,
    "",
    `Approve & Schedule: ${opts.approveUrl}`,
    `Edit: ${opts.editUrl}`,
    `Skip this campaign: ${opts.rejectUrl}`,
    "",
    "Nothing sends until you choose the date and time. Opening a link does not send the campaign.",
  ].join("\n");
  return { html, text };
}
