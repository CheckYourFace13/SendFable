#!/bin/bash
set -u
systemctl show thedrinkplace-autopilot.service -p FragmentPath -p ExecStart --no-pager
echo "=== UNIT FILE ==="
sed -n '1,25p' /etc/systemd/system/thedrinkplace-autopilot.service
