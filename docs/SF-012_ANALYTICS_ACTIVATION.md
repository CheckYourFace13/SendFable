# SF-012 — Analytics and IndexNow activation

| Field | Value |
|-------|-------|
| Reference | SF-012 |
| Date | 2026-07-29 |
| Starting commit | `24eaf5e` |
| Branch | `sf/012-015-activation` |
| Final commit | TBD |
| Production commit | TBD |
| Rollback | `f8c3aa5` / prior app `81dea78` |
| Messages sent | 0 |
| External charges | $0 |

## Privacy / security / performance review

| Check | Result |
|-------|--------|
| PII scrubber (email/phone/subject/body/address/token/IP keys) | Pass |
| Fail-open on analytics errors | Pass |
| Bot User-Agent filtering | Pass |
| Rate limit without storing IP | Pass |
| Session/event/path dedupe (45s) | Pass |
| QA traffic via `?sf_qa=1` / `utm_campaign=sf_qa` | Pass |
| Admin-only `/admin/funnel` | Pass |
| Retention default 90 days (`ANALYTICS_RETENTION_DAYS`) | Pass |
| No third-party scripts | Pass |

## Activation

Set in production `.env` (not git):

```
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
```

## IndexNow

- Generate cryptographically random key (≥32 hex chars)
- Store only in production env as `INDEXNOW_KEY`
- Public file: `https://sendfable.com/indexnow/key.txt` must return **200** with exact key
- Submissions rate-limited, deduped 24h, retry backoff, audited in `IndexNowSubmission`
- Submit only public marketing URLs (blocked: admin/auth/billing/SMS-dark/api)

### Planned submission set (after SF-013 publish)

- `/`
- `/pricing`
- `/compare`
- `/compare/mailchimp`
- `/mailchimp-alternative`
- `/partners`
- `/guides/best-mailchimp-alternative-for-small-businesses`
- `/guides/how-to-switch-from-mailchimp`

## Owner QA funnel (label with `?sf_qa=1`)

1. Homepage  
2. Pricing  
3. Comparison  
4. Signup CTA / start (optional)  
5. Remaining activation events fire from product APIs when used  

Funnel totals **exclude** `props.qa=true`.

## Search engine verification

No prior GSC/Bing verification tokens found in repo or production env.  
See `docs/SEARCH_ENGINE_OWNER_ACTIONS.md`.
