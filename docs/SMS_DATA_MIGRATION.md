# SMS data migration

Migration: `prisma/migrations/20260726160000_sms_product/migration.sql`

## Safety properties

- **Non-destructive.** No rows are deleted or rewritten.
- Existing contacts keep their email (still unique per workspace).
- `Contact.email` becomes **nullable**.
- New nullable `phoneE164` + unique `(workspaceId, phoneE164)`.
- DB check constraint: `email IS NOT NULL OR phoneE164 IS NOT NULL`.
- New SMS enums/tables are additive.
- `Campaign.channel` defaults to `EMAIL` — existing campaigns unchanged.
- `SignupForm` gains `requirementMode` (default `email-required`) and `collectPhone` (default `false`).

## Rollback risks

- Dropping the migration after phone-only contacts exist would fail the check constraint / NOT NULL restore. Rollback plan if needed before any phone-only data exists:
  1. Ensure every contact still has an email (true at cutover).
  2. Drop new SMS tables and enums.
  3. Drop new Contact/Campaign/SignupForm columns.
  4. Restore `Contact.email` NOT NULL.
- After phone-only contacts exist, rollback requires exporting or deleting those rows first.

## Application fallout handled in this branch

- Email audience resolver filters `email IS NOT NULL` so phone-only contacts never enter the SES pipeline.
- Contact create / import / form submit accept email-or-phone with split-identity conflict detection.
- Seed + QA scripts updated for nullable email.

## Deploy note

**This branch must not be deployed yet.** When an authorized deploy happens later, run `prisma migrate deploy` during the normal SendFable release window. Other VPS applications are untouched.
