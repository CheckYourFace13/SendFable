# Owner workspace address correction — 2026-07-29

## Change

Primary SendFable owner workspace (`chris@iscreamstudio.com` OWNER) updated in production:

| Field | Before | After |
|---|---|---|
| Workspace name | `Sendfable` | **iScream Studio INC** |
| Mailing address | Temporary controlled-test wording | **1364 Patriot Blvd / Glenview, IL 60026** |
| Sender display name | `SendFable Controlled Test` | **iScream Studio INC** |

QA Workspace B (`SendFable QA Workspace B`) was **not** modified.

## Product guarantee

Campaign footers compile from **that campaign’s workspace** `name` + `mailingAddress` only (`compileEmailHtml` / `campaign-send`). There is no global injection of the owner’s address into other customers’ emails.

Automated isolation tests: `src/lib/__tests__/workspace-isolation.test.ts`.

## Platform vs workspace

- Workspace mailing address → campaign footers (CAN-SPAM for that customer).
- SendFable platform / legal operator address → legal pages & company identity — separate.
