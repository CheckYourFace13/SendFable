# SF-019 — Owner-only SMS pilot (prepared, not enabled)

Pilot workspace: **iScream Studio INC owner workspace only**.

## Env keys (all default off / empty)

| Env | Purpose |
|-----|---------|
| `SENDFABLE_SMS_OWNER_PILOT_ENABLED` | Master enable (default false) |
| `SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID` | Exact workspace id allowlist |
| `SENDFABLE_SMS_OWNER_PILOT_ALLOWLIST` | Comma-separated E.164 recipients (max 2) |
| `SENDFABLE_SMS_OWNER_PILOT_KILL_SWITCH` | Emergency stop (default false) |

Code: `src/lib/sms/pilot.ts` (`assertOwnerPilotSendAllowed`).

## Restrictions

| Rule | Value |
|------|--------|
| Workspaces | 1 |
| Dedicated numbers | 1 |
| Recipient numbers | max 2 (strict allowlist) |
| Outbound segments total | max 25 |
| Incoming segments total | max 25 |
| Public signup | no |
| Customer access | no |
| Automatic recurring sends | no |
| Marketing imports | no |
| Public SMS pricing | no (`SENDFABLE_SMS_PUBLIC_ENABLED=false`) |
| Normal SMS checkout | no (billing flags false) |
| Manual admin approval | required |
| Emergency kill switch | required |
| Every outbound send | logged (SmsMessage + mock outbox / provider id) |
| Every provider cost | reconciled via admin usage tools |

## Do not enable yet

Pilot stays **disabled** until:

1. Telnyx account approved  
2. Credentials installed securely  
3. Owner-only controlled-test registration approved  
4. Explicit owner approval to flip `SENDFABLE_SMS_OWNER_PILOT_ENABLED=true`

## After Telnyx approval (ordered)

1. Add credentials securely  
2. Confirm ISV/partner access  
3. Submit owner-only controlled-test registration  
4. Purchase one controlled-test number after explicit approval  
5. Run controlled real-message testing within these caps  
6. Open SMS gradually after final approval  
