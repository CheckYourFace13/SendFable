#!/bin/bash
echo "BLOCKED: pins wipe SHA 5a908c8 and deletes TDP newsletter. Use scripts/deploy-production.sh (flock + require-tdp-newsletter-sources)."
echo "Coordinate: SendFable chat 3b5cfd71-6f0b-4173-b526-9c3f99ef4cc9 must not redeploy without newsletter sources."
exit 1
