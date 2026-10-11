#!/bin/bash
set -u
echo "LLMS"
curl -sf https://sendfable.com/llms.txt | grep -n "text messaging\|Scribe\|Signup Tools"
echo "REDIRECT"
curl -sI https://sendfable.com/marketing-autopilot | tr -d '\r' | grep -iE 'HTTP/|location'
echo "EMBED404"
curl -sI https://sendfable.com/embed.js | tr -d '\r' | head -n 1
echo "SCRIPT"
curl -sf https://sendfable.com/embed/form.js | grep -c "Powered by SendFable"
curl -sf https://sendfable.com/embed/form.js | grep -c "We turn your content into emails ready to send."
curl -sf https://sendfable.com/embed/form.js | grep -c "utm_medium=embed_badge"
echo "FORM"
curl -sf https://sendfable.com/api/forms/public/drinkknird-newsletter | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const f=JSON.parse(s).form; console.log('badge', f.showSendfableBadge); console.log('ref', Boolean(f.referralCode)); console.log('slug', f.hostedSlug); console.log('sms', f.smsConsentEnabled);})"
echo "LEGAL"
curl -sf https://sendfable.com/privacy | grep -o 'rel="canonical" href="[^"]*"' | head -n 1
curl -sf https://sendfable.com/terms | grep -o 'property="og:title" content="[^"]*"' | head -n 1
echo "INTEGRATIONS"
curl -sf https://sendfable.com/integrations | grep -c "Inline embed"
echo "PRICING"
curl -sf https://sendfable.com/pricing | grep -c "Pricing questions"
echo "GITHUB"
git -C /c/Users/chris/Projects/SendFable ls-remote origin refs/heads/main
