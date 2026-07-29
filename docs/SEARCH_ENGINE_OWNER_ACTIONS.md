# Search engine owner actions

Minimal steps. Cursor will set `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` and redeploy once you supply the public meta/DNS values. Do not paste secrets into chat if using DNS-only verification — DNS TXT is preferred for the Domain property.

Sitemap: `https://sendfable.com/sitemap.xml`

---

## Google Search Console (Domain property)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add property → **Domain** → enter `sendfable.com`.
3. Copy the DNS TXT verification record Google shows.
4. Add that TXT record at your DNS host for `sendfable.com`.
5. Click **Verify** in Search Console.
6. Open Sitemaps → submit `https://sendfable.com/sitemap.xml`.
7. (Optional) After data appears, export Coverage + Performance for the changelog.

### URL-prefix alternative (HTML meta)

1. Add property → **URL prefix** → `https://sendfable.com`.
2. Choose **HTML tag** verification.
3. Copy only the `content="..."` token value.
4. Tell Cursor the token; Cursor sets `GOOGLE_SITE_VERIFICATION` on the VPS and redeploys.
5. Click **Verify**.
6. Submit `https://sendfable.com/sitemap.xml`.
7. Do not ask the owner to edit application code.

---

## Bing Webmaster Tools

1. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Prefer **Import from Google Search Console** once GSC is verified.
3. If import is unavailable, add `https://sendfable.com` and complete ownership verification.
4. Submit `https://sendfable.com/sitemap.xml`.
5. For HTML meta verification, copy the `msvalidate.01` content value.
6. Tell Cursor the token; Cursor sets `BING_SITE_VERIFICATION` and redeploys.
7. Confirm IndexNow key file is already live at `/indexnow/key.txt` after SF-012 deploy.

Expected time: about 10–20 minutes once DNS propagates (DNS Domain verify may take longer).
