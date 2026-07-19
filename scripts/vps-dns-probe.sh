#!/usr/bin/env bash
set +e

echo "=== AUTH ns05 A ==="
dig @ns05.domaincontrol.com sendfable.com A +noall +answer
echo
echo "=== AUTH ns06 A ==="
dig @ns06.domaincontrol.com sendfable.com A +noall +answer
echo
echo "=== AUTH www ==="
dig @ns05.domaincontrol.com www.sendfable.com CNAME +noall +answer
dig @ns05.domaincontrol.com www.sendfable.com A +noall +answer
echo
echo "=== Public resolvers ==="
echo -n "1.1.1.1: "; dig @1.1.1.1 sendfable.com A +short | tr '\n' ' '; echo
echo -n "8.8.8.8: "; dig @8.8.8.8 sendfable.com A +short | tr '\n' ' '; echo
echo
echo "=== TXT / MX (read-only, no changes) ==="
dig @ns05.domaincontrol.com sendfable.com TXT +short
dig @ns05.domaincontrol.com sendfable.com MX +short
echo
echo "=== SOA ==="
dig @ns05.domaincontrol.com sendfable.com SOA +short
echo
echo "=== HTTP Host sendfable.com via each A ==="
for ip in 3.33.130.190 15.197.148.33 177.7.38.145; do
  echo "--- $ip ---"
  curl -sI --max-time 8 -H 'Host: sendfable.com' "http://${ip}/" | head -20
done
echo
echo "=== Parking body snippet (3.33) ==="
curl -sL --max-time 8 -H 'Host: sendfable.com' http://3.33.130.190/ | tr '\n' ' ' | head -c 800
echo
echo
echo "=== Parking body snippet (15.197) ==="
curl -sL --max-time 8 -H 'Host: sendfable.com' http://15.197.148.33/ | tr '\n' ' ' | head -c 800
echo
