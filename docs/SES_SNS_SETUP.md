# SES configuration set → SNS → Sendfable webhook

1. In SES, create a **configuration set** (name must match `SES_CONFIGURATION_SET`).
2. Add an **event destination** of type Amazon SNS.
3. Select events: **Delivery**, **Bounce**, **Complaint** (add others later if needed).
4. Create or choose an SNS topic.
5. In SNS → topic → Create subscription:
   - Protocol: **HTTPS**
   - Endpoint: `https://YOUR_PUBLIC_DOMAIN/api/webhooks/ses`
6. Deploy the app so the endpoint responds publicly.
7. SNS sends `SubscriptionConfirmation`; Sendfable fetches `SubscribeURL` automatically.
8. Confirm status is **Confirmed** in the SNS console.
9. Send a test campaign (or SES mailbox simulator) and verify `WebhookEvent` rows / recipient timestamps.

**Security note:** Prefer restricting SNS to your topic and keeping the endpoint on HTTPS only. Signature verification hardening is tracked in `KNOWN_LIMITATIONS.md` if not yet enabled in your build.
