#!/bin/bash
set -u
printf '%s\n' '#!/bin/bash' 'echo BLOCKED: newsletter restore is disabled' 'exit 1' > /tmp/_tmp-sf-deploy-verify.sh
chmod 644 /tmp/_tmp-sf-deploy-verify.sh
if [ -f /opt/sendfable/scripts/deploy-production.sh ]; then
  printf '%s\n' '#!/bin/bash' 'echo BLOCKED: newsletter restore is disabled' 'exit 1' > /opt/sendfable/scripts/deploy-production.sh
fi
if [ -f /opt/sendfable/scripts/_tmp-sf-deploy-verify.sh ]; then
  printf '%s\n' '#!/bin/bash' 'echo BLOCKED: newsletter restore is disabled' 'exit 1' > /opt/sendfable/scripts/_tmp-sf-deploy-verify.sh
fi
echo STUBBED
echo "=== START LINE ==="
head -n 5 /tmp/sf-deploy-verify.log 2>/dev/null || true
echo "=== AUTH ==="
grep -E 'Accepted |session opened' /var/log/auth.log 2>/dev/null | tail -n 30 || journalctl -u ssh --since '30 min ago' --no-pager | tail -n 40
echo "=== STILL RUNNING ==="
pgrep -af 'sf-deploy-verify|deploy-production.sh' || echo NONE
