#!/usr/bin/env sh
set -eu
test -f src/lib/newsletter/welcome-html.ts
test -f src/lib/newsletter/tdp-weekly.ts
test -f src/lib/newsletter/auto-welcome.ts
test -f src/lib/newsletter/auto-weekly.ts
grep -q 'Explore drinks' src/lib/newsletter/welcome-html.ts
! grep -q 'Chicago drink guide' src/lib/newsletter/welcome-html.ts
grep -q 'buildTheDrinkPlaceWeeklyEdition' src/lib/autopilot/tick.ts
grep -q 'autoSendEnabled' prisma/schema.prisma
grep -q 'autoWelcomeEnabled' prisma/schema.prisma
echo "assert-tdp-newsletter: OK"
