#!/bin/bash
set -u
echo "=== MONITOR ==="
grep -n 'restore-sf\|newsletter\|enqueueAutopilot\|deploy-production\|tdp-sf-impl\|autoSend' /root/sendfable-monitor.sh /root/sendfable-backups/backup.sh || echo MONITOR_CLEAN
echo "=== TIMERS ==="
systemctl list-timers --all --no-pager | grep -E 'newsletter|sendfable|drink|autopilot' || echo NO_MATCHING_TIMER
echo "=== BRANCH HOOK ==="
grep -R -n 'tdp-newsletter-durable' /etc/cron.d /etc/systemd/system /opt/sendfable/.git/hooks 2>/dev/null | head -10 || echo NO_BRANCH_HOOK
