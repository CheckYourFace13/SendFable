# Phase N — Controlled then public SMS launch

**Do not flip production flags from this doc alone.** Requires owner approval + compliance self-certification PASS.

## Gates (required vs optional)

| Gate | Role |
|------|------|
| SMS technical certification (pilot + second tenant) | REQUIRED |
| **SMS COMPLIANCE SELF-CERTIFICATION** (`docs/SMS_COMPLIANCE_SELF_CERTIFICATION.md`) | **REQUIRED** |
| Telnyx funding (balance + recommended auto-recharge) | REQUIRED (ops) |
| Owner approval to flip flags | REQUIRED |
| Outside counsel review | **OPTIONAL / RECOMMENDED** — not a blocker |

## Controlled cohort (PUBLIC still false)

1. Enable account signup + billing + activation + registration + number + live + inbound + reply for allowlisted workspaces / pilot meta only
2. Keep `SENDFABLE_SMS_PUBLIC_ENABLED=false`
3. Run second-tenant E2E on non-owner workspace
4. Monitor HELP identity (no owner brand leak), STOP persistence, BOTH send
5. Confirm Stripe SMS webhook + margin alerts

## Public flip (owner approval required)

Owner sign-off: ________________ date: ________________  
Self-certification: PASS / FAIL (attach checklist)

Then set deliberately (see `SMS_PUBLIC_FLAG_LADDER.md` + `SMS_OWNER_ACTIONS.md`):

- `SENDFABLE_SMS_PUBLIC_ENABLED=true`
- Account signup, billing, activation, registration, number, live, inbound, reply as authorized
- `SENDFABLE_SMS_MOCK_PROVIDER_ENABLED=false` only when live sending is intentional
- Keep `SENDFABLE_PROMO_TEXT20_PUBLIC` dark until separate TEXT20 rule is met
- Optionally `SENDFABLE_CHECKOUT_ALLOW_PROMOTION_CODES=true`

## After flip

- [ ] Homepage ChannelTrio visible
- [ ] `/pricing` SMS cards visible
- [ ] Public claims match live product
- [ ] Kill switches tested (LIVE_SENDING / PUBLIC off)

Casey From identity stays. Signup stays simple.
