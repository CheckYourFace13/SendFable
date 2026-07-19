# SES activation readiness

**Status:** Not activated. Production AWS keys are blank. Local/outbox mode only.

## Before enabling real sends

1. Create IAM user with SES send permissions (least privilege).
2. Verify sending domain (`PLATFORM_SEND_DOMAIN`, default `send.sendfable.com`) — DKIM/SPF/DMARC.
3. Create configuration set + SNS topics for bounce/complaint/delivery → `https://sendfable.com/api/webhooks/ses`.
4. Request production access if still in sandbox.
5. Set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_CONFIGURATION_SET` in `/opt/sendfable/.env`.
6. Recreate **only** `sendfable-app` and `sendfable-worker`.
7. Confirm `/settings/ses` checklist is green.
8. Send a test to the owner mailbox.
9. Keep `EARLY_LAUNCH` / signup gates until you intentionally open public signup.

## Do not

- Send to purchased lists
- Enable unrestricted signup the same day as SES without monitoring
- Skip bounce/complaint webhooks

See also: `docs/SES_SETUP_CHECKLIST.md`, `docs/SES_SNS_SETUP.md`.
