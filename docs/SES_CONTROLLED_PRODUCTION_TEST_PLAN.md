# Controlled SES production-send test plan (DO NOT RUN YET)

Internal plan only. Execute **only** after owner authorization **and** SES account gates below are all true.

## Hard prerequisites (all required)

| Gate | Required value |
|---|---|
| `ProductionAccessEnabled` | `true` |
| `SendingEnabled` | `true` |
| `EnforcementStatus` | `HEALTHY` |
| Launch flags before test | Keep public send **off** until the controlled window; use `SES_CONTROLLED_TEST_ENABLED` / temporary owner-only send enablement as designed in product gates |
| Recipients | **Owner-controlled addresses only** (SES-verified if still constrained) |

Do **not** open public signup, public billing, or general campaign sending for this test.

## Exact later authorization phrase

```text
Authorize the controlled owner-only SES production-send test on SendFable. Enable only the minimum temporary send gates required for the checklist, use owner-controlled addresses only, then restore all test-only settings and keep public campaign sending disabled. Do not flip public signup or public billing. Do not submit or modify the AWS SES case.
```

## Test checklist (must all be evidenced)

1. Create **one** controlled campaign (owner workspace).
2. Sender identity accepted for the From address used.
3. Worker queues the job and sends **once** (no duplicate send).
4. SES **delivery** event received and processed.
5. Recipient stored as delivered (or equivalent success state).
6. **Open** tracking records an open (owner-controlled open).
7. **Click** tracking records a click.
8. Click uses **safe redirect** (no open redirect).
9. **Unsubscribe** works (link + preference).
10. Unsubscribed recipient is **excluded** from a later send attempt.
11. AWS-supported **bounce** simulation processed; suppression enforced.
12. AWS-supported **complaint** simulation processed; suppression enforced.
13. Webhooks are **signature-verified** and **idempotent** (replay safe).
14. **Scheduled** send runs at the intended time (small delay).
15. **Pause/cancel** stops remaining queued work.
16. **Quotas** and **ramp** limits enforced (deterministic assertion and/or tiny fixture).
17. **Auto-pause** thresholds covered via safe simulation or unit/integration tests (no public blast).
18. Logs contain **no** message body, credentials, or full recipient list.
19. SES reputation / quota remain **HEALTHY** after the run.
20. After test: restore all test-only settings; keep `CAMPAIGN_SEND_ENABLED=false` (and related public gates); inventory every email and test record created.

## Explicit non-claims

- Do **not** claim inbox placement, open-rate, or deliverability from this single test.
- Do **not** treat sandbox bounce/complaint simulators as production reputation proof beyond pipeline correctness.

## Cleanup

- Delete or clearly mark test campaigns/recipients as test data.
- Confirm no active public send capability remains.
- Record commit hash / flag values after restore.
