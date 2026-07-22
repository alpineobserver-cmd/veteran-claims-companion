# Debrief closed-Alpha audit report

Date: July 21, 2026  
Scope: Staging infrastructure and the `staging` application baseline  
Data boundary: fictional information and fictional documents only

## Decision

**Go for continued closed-Alpha testing with fictional data after this branch passes GitHub checks and is reviewed and merged into `staging`.**

**No-go for real medical information, public Beta, automated VA submission, or paid AI processing of real records.** The non-negotiable legal, privacy, vendor, threat-model, malware-scanning, monitoring, retention, recovery, accessibility, and independent-security gates in the product backlog remain open.

Production was not changed during this audit.

## Completed remediation

- Locked down the Staging Supabase public schema. Every application table has RLS enabled and the `anon`, `authenticated`, and `service_role` roles have no application table, sequence, or function grants.
- Preserved Prisma access through the database owner role and added a portable, idempotent migration so new environments receive the same default-deny Data API posture.
- Removed both existing Staging database sessions, rotated the permanent Staging `AUTH_SECRET`, revoked the old value, redeployed without cache, and completed a fresh Google sign-in.
- Added and executed a database-backed, two-session live route harness with disposable fictional users.
- Proved that user A could not list, read, update, delete, or export user B's records. Deleting user A left user B intact.
- Removed every disposable test user, session, and claim after the live test.
- Added the live isolation harness to the security and release commands. It skips only when no live fixture configuration is supplied and fails on partial configuration.
- Added repository-owned ESLint configuration and a protected CI lint job, then fixed the internal-navigation, React effect/ref, unused-code, and ARIA findings it exposed.
- Ported the visual prototype language into the real Claim Builder without copying hard-coded fictional claim data or changing persistence, authentication, routing, or questionnaire rules.
- Verified the visual change at desktop and 390-pixel mobile widths. The page had content, no Next.js error overlay, no horizontal overflow, named step controls, and a working first-step transition.
- Repaired and documented the isolated graphics prototype. Its tests, lint, and dependency audit pass, and it remains separate from the live application.

## Verification evidence

- `npm run lint`: passed with no findings.
- `npm run typecheck`: passed.
- `npm run build`: passed; 45 static/dynamic routes generated successfully.
- `npm run test:release`: passed. Environment-dependent live checks skipped locally as designed; the two-session isolation check was run separately against Staging and passed.
- `npm audit --audit-level=high`: zero vulnerabilities.
- Deterministic claim evaluation: 40 of 40 scenarios passed with a 99.9/100 average and zero unsafe wording repeated into a guided draft.
- Modeled usability evaluation: all 90 requested personas remained balanced and deterministic.
- Staging authentication: prior sessions invalidated, fresh Google login succeeded, and no new Vercel runtime error was observed during the remediation window.
- Staging test cleanup: zero disposable users, sessions, or claims remained.

## Residual risks and follow-up

- Supabase reports informational `rls_enabled_no_policy` notices. This is expected: Debrief intentionally exposes no application rows through the Supabase Data API and uses owner-scoped server routes instead.
- The 13 Supabase foreign-key index suggestions were resolved July 22 under `OPS-014`: each index was tied to an application path, deployed through Prisma, verified against privacy-safe eligibility plans, and cleared from the performance advisor. New-index usage will be reviewed again after representative Alpha traffic.
- Managed provider-owned default privileges could not be altered by the application owner. Current objects and PostgreSQL-owned future Prisma objects are denied to Data API roles. Recheck grants after provider-driven schema changes.
- Auth.js remains on a monitored v5 beta release. Continue the monthly release-channel and security-advisory review under `OPS-011`.
- The live two-user test requires disposable database fixtures and is therefore not automatically run in uncredentialed pull-request jobs. The static authorization suite remains mandatory in CI, and the live harness is required before an Alpha release involving owner-scope changes.
- Human Alpha measurement has no recorded sessions yet. `ALPHA-003`, `TEST-003`, `TEST-004`, `TEST-005`, and `TEST-007` retain the listed human or manual checks.
- Qualified legal review, independent security review, a threat model, malware scanning, provider retention and recovery evidence, and production monitoring remain blocking for real information.

## Release procedure

1. Review the draft pull request against `staging`.
2. Wait for the protected GitHub `verify` check to pass, including the clean PostgreSQL migration job.
3. Merge into `staging`; do not merge directly into `main`.
4. Confirm the Debrief Staging deployment applies the new migration and reaches `READY`.
5. Run the Staging smoke checklist and record the result. Keep Production unchanged until a separate promotion decision is approved.
