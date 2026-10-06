# Marketing Autopilot product screenshots

Controlled demo data — no stock photos, no fake testimonials, no customer PII.

Generated via Playwright against live SendFable UI fixtures (`/cert/autopilot-ui`) plus homepage/feature captures.

| File | Subject |
|------|---------|
| `setup.webp` | Marketing Autopilot setup |
| `detected.webp` | Website change detected |
| `draft.webp` | Generated campaign draft |
| `approval-email.webp` | Owner approval email |
| `approval-confirm.webp` | Approval confirmation page |
| `campaign-result.webp` | Campaign result |
| `homepage-section.webp` | Homepage Autopilot section |
| `feature-page.webp` | Feature page |

Public copies also live under `/public/product/autopilot-*.webp`.

Regenerate:

```bash
npx playwright test e2e/autopilot-cert.spec.ts -g "capture product screenshots"
```
