# Amazon SES setup checklist (no live changes from this doc)

Use this when you are ready to send real email. Do not paste secret keys into chat, screenshots, or public docs.

1. Create or use an AWS account; enable MFA on the root user.
2. Create an IAM user or role for Sendfable with least-privilege SES permissions (send + identity read/create as needed).
3. Pick **one** SES region (example: `us-east-1`) and set `AWS_REGION` to match.
4. Verify the platform domain `PLATFORM_SEND_DOMAIN` (e.g. `send.sendfable.com`) in SES.
5. Publish the three DKIM CNAME records SES provides; wait until Verified.
6. Add SPF / custom MAIL FROM records as recommended in `SES_DNS_RECORDS.md`.
7. Add a DMARC record on the appropriate organizational domain.
8. Create SES configuration set named like `SES_CONFIGURATION_SET`.
9. Attach an event destination for Delivery, Bounce, and Complaint → SNS topic.
10. Subscribe the SNS topic to `https://YOUR_DOMAIN/api/webhooks/ses` (HTTPS).
11. Confirm the SNS subscription (Sendfable auto-confirms when the endpoint is live).
12. Leave AWS keys blank in local `.env` to stay in `.eml` outbox mode while developing.
13. Test in SES sandbox (verified recipients only).
14. Request production access (see `SES_PRODUCTION_ACCESS_REQUEST.md`).
15. Warm gradually — Sendfable’s `accountRampLevel` starts low on purpose.
16. Monitor bounce (<5%) and complaint (<0.1%) rates; campaigns auto-pause above thresholds.
17. Rotate IAM keys if exposed; never commit them.

In-app readiness: **Settings → SES readiness** (owner-only) when that page is available.
