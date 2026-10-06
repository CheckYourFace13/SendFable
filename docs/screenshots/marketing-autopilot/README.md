# Marketing Autopilot product visuals

Canonical flow graphic (controlled product narrative, no stock photos / no fake PII):

- `/public/product/autopilot-flow.svg` — website → draft → approval → customers

Capture live Playwright screenshots after deploy:

```bash
npx playwright test e2e/autopilot-public.spec.ts
```

Suggested captures: homepage `#marketing-autopilot`, `/automated-email-marketing`, settings setup, `/autopilot/review` confirmation page.
