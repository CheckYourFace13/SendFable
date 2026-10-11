# Coordination: TheDrinkPlace newsletter automation

## Competing session
- Cursor SendFable agent: [Scribe/newsletter conflict](3b5cfd71-6f0b-4173-b526-9c3f99ef4cc9)
- Wipe paths: `/tmp/sf-auth-deploy.sh`, inverted `deploy-production.sh` (REFUSING when newsletter present), force-reset to schedule-only tips (e041a49, 1b8b547, cdfc6ff, 5a7db0d).

## Rules
1. Production deploy: only `/opt/sendfable/scripts/deploy-production.sh` with flock + `require-tdp-newsletter-sources.sh`. Newsletter **must** be present.
2. Do not `pkill` other SendFable docker builds / deploy holders that are shipping newsletter.
3. Do not pin wipe SHAs or reset to a tree without `src/lib/newsletter`.
4. Scribe schedule / Brief / Signup Tool fixes must land **with** newsletter kept.
5. Do not wire `clearWelcomeLedgerOnUnsubscribe` into unsubscribe merely to re-welcome.

## Running proof (2026-10-11)
- Canonical newsletter tip previously verified in containers: `c379ae0` images.
- App image: `sha256:16ed9e62104017661808b4a27d69e508884956429cd86eb57e1c98b5296fc283`
- Worker image: `sha256:77edace81f07fa4667769c5d41ef83c7a35cc8dd30a9e886fdef688ba23f0e46`
