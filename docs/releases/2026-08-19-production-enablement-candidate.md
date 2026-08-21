# Debrief rework Production-enablement candidate

- Release/version: Account-backed rework workflow and immutable package export
- Date: 2026-08-19
- Environment: Local release candidate plus read-only live Staging preflight; candidate not yet deployed
- Git branch: `codex/production-enablement`
- Source baseline: Tested Staging commit `723c29ca4e1f0d3a77b7c40cadb3aa8ba44642c7`
- Production rollback baseline: Healthy Production commit `1c59a3a5` / deployment `dpl_3NGV5ptaS25Are2eo3AgN4YFPiJH`
- Data boundary: Fictional information only; this sprint does not authorize real medical or military records

## Enablement changes

- Replaced authenticated rework browser-only storage with an owner-scoped PostgreSQL profile and optimistic version checks. The local `fictionalTester` browser profile remains browser-only for automated testing.
- Added an additive migration for account workflow state and immutable approved-package snapshots. New tables use row-level-security enablement plus explicit denial for Supabase Data API roles; authenticated application routes remain the only access path.
- Added server validation, payload limits, durable account rate limits, same-origin mutation checks, conflict responses, private no-store responses, and account export/deletion coverage.
- Final approval now requires server-verified package readiness and section approvals. A package ID can be approved once; the approved snapshot cannot be replaced.
- Added a real owner-scoped PDF download generated from the approved snapshot, including its SHA-256 checksum and an explicit non-submission boundary.
- Signed-in homepage and default login completion now enter `/rework-preview`.
- Added confirmation before clearing unfinished workflow data. Approved history cannot be cleared with the draft reset action.
- Added a first-party favicon and resolved the two high-severity dependency advisory chains with reviewed transitive overrides.
- Added a follow-up hardening migration for `DocumentScan`, which was created after the original schema-wide RLS migration. The live Staging table has no Data API role grants, but RLS must also be enabled for defense in depth.

## Migration and rollback

Migrations: `20260819120000_rework_account_persistence` and `20260821120000_harden_document_scan_rls`.

The migrations are additive: they create two tables, indexes, foreign keys, row-level-security settings, role revocations, and comments, and enable RLS on the existing empty `DocumentScan` table. They do not rewrite or delete existing records. Deploy them to Staging first and verify profile creation, reload, approval, download, account export, and account deletion with disposable fictional accounts.

Application rollback may safely leave these unused tables in place. Do not drop them during an incident rollback. A later reviewed cleanup migration may remove them only after retention, export, backup, and rollback requirements are confirmed.

## Required Staging acceptance before Production approval

1. Apply the migration and confirm it is recorded as complete.
2. With a fresh fictional account, complete Google sign-in with the configured MFA policy, create a package, reload on a second device/browser, and confirm the same state resumes.
3. Create a second fictional account and verify it cannot read, overwrite, approve, reset, or download the first account's workflow or package.
4. Approve a complete package, download and open the PDF, confirm its contents match the approved version, and verify later shared-foundation edits do not change that PDF.
5. Confirm a duplicate approval is rejected and an approved package ID cannot be replaced.
6. Confirm draft reset requires explicit confirmation, preserves approved snapshots, and full account deletion removes both rework tables through the user cascade.
7. Export account data and confirm both the working profile and approved snapshot are present without credentials or private storage locators.
8. Run keyboard-only, VoiceOver, 390 px reflow, browser-console, application-log, and no-horizontal-overflow checks on the authenticated workflow.
9. Confirm the canonical Production hostname is not referenced by Staging auth or links, and identify the exact healthy Staging and Production rollback deployments.

Production remains a no-go until the Staging migration and the live two-account isolation/save/approval/download/deletion checks above are recorded. Real-document intake remains separately blocked on the existing legal, provider, retention, malware-scanning, monitoring, backup, and independent-security-review gates.

## Local verification result

- `npm run test:release`: passed on 2026-08-19, including 44 Chromium E2E/accessibility scenarios, 100 modeled next-action users, 100 modeled package lifecycles, 90 balanced personas, 40/40 deterministic claim evaluations, and 40/40 recorded AI safety fixtures.
- Lint, TypeScript, Prisma schema validation, and optimized Production build: passed.
- Dependency and license gate: passed; `npm audit` reported zero vulnerabilities.
- Manual in-app browser check: desktop and 390 × 844 layouts loaded without horizontal overflow, console warnings, or console errors. The mobile mission briefing remained contained and keyboard-accessible; the mobile account/save labels were reduced to accessible icon controls to remove top-bar crowding.
- Live configured checks skipped locally by design: canonical-host public check, hosted Auth.js provider/session checks, and real two-account database isolation. These remain mandatory Staging acceptance items above.

## Independent live Staging preflight — 2026-08-21

- Stable Staging is healthy at verified Git commit `723c29ca4e1f0d3a77b7c40cadb3aa8ba44642c7` / Vercel deployment `dpl_6jHPRPLMM5bJZ5WhyqcBaRHAvqL7`. Production was not changed.
- Vercel build evidence confirms `APP_ENV=staging`, `DATA_ENVIRONMENT=staging`, authentication environment validation, Prisma migration status, and an isolated Supabase connection without printing secrets.
- `/api/health` returned HTTP 200 with no-store, CSP, HSTS, frame, MIME, permissions, and cross-origin isolation headers. Vercel reported no runtime error clusters during the prior seven days.
- Signed-out access to `/rework-preview` redirected to `/login?redirectTo=/rework-preview` at desktop and 390 px widths. Both widths had no horizontal overflow and the browser console had no warnings or errors.
- Supabase reports the Staging project as healthy on PostgreSQL 17. All ten existing Prisma migrations are complete. The two rework tables are correctly absent until the candidate deploys.
- Database inspection found `DocumentScan` with RLS disabled but no grants to `anon`, `authenticated`, `service_role`, or `PUBLIC`. The candidate now closes this defense-in-depth gap through `20260821120000_harden_document_scan_rls`.
- Supabase authentication logs were clean. PostgreSQL logs contain the documented `pg_pgrst_no_exposed_schemas` noise produced when the Data API is disabled; Supabase states this should not adversely affect the project and documents an optional empty-schema workaround.
- After the hardening change, deployment/data/security tests, lint, TypeScript, optimized build, 44 Chromium E2E/accessibility tests, and `npm audit` all passed. A fresh empty-PostgreSQL migration rehearsal remains delegated to protected CI because Docker is unavailable locally.
- Publication was intentionally stopped: the local GitHub CLI token is invalid and the external remote could not be independently authorized for write access. No branch, pull request, migration, or deployment was created remotely.
