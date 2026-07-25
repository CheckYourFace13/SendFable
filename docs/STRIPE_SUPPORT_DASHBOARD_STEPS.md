# Stripe support fields — Dashboard steps (API cannot update own account)

Stripe rejects `Accounts.update` on the platform’s own account
(`You cannot use this method on your own account`). Set these in Dashboard.

## Exact steps

1. Open https://dashboard.stripe.com/settings/public (live mode — toggle **Test mode OFF**).
2. Confirm you are on account **SendFable** (`acct_1Two8SGnw9fPSfu4`).
3. Under **Business details / Public info**:
   - **Business name:** SendFable
   - **Business website:** `https://sendfable.com`
   - **Support email:** `support@sendfable.com`
   - **Support URL / Customer support URL:** `https://sendfable.com/contact`
4. Under **Customer emails / Branding** (names vary slightly by Dashboard version), confirm:
   - Statement descriptor remains **SENDFABLE**
   - Terms of service URL: `https://sendfable.com/terms`
   - Privacy policy URL: `https://sendfable.com/privacy`
5. Save.

## Verify (no charge)

After saving, run on the VPS (uses SendFable live secret; prints no secrets):

```bash
docker exec -w /app sendfable-app node -e '
const Stripe=require("stripe");
const s=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:"2024-06-20"});
s.accounts.retrieve().then(a=>{
  const b=a.business_profile||{};
  console.log(JSON.stringify({
    id:a.id,
    name:b.name,
    url:b.url,
    support_email:b.support_email,
    support_url:b.support_url,
    statement_descriptor:a.settings&&a.settings.payments&&a.settings.payments.statement_descriptor
  },null,2));
});
'
```

Expected:

```json
{
  "id": "acct_1Two8SGnw9fPSfu4",
  "name": "SendFable",
  "support_email": "support@sendfable.com",
  "support_url": "https://sendfable.com/contact",
  "statement_descriptor": "SENDFABLE"
}
```

Do not create products, prices, customers, or charges while doing this.
