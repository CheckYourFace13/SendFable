#!/bin/bash
set -eu
for slug in drinkknird-newsletter thedrinkplace-newsletter boatingchicago-newsletter newsletter-1; do
  code=$(curl -sS -o /tmp/sf-one.json -w '%{http_code}' "http://127.0.0.1:3010/api/forms/public/$slug")
  echo "$code $slug $(head -c 180 /tmp/sf-one.json)"
  echo
done
