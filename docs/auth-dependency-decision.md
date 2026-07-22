# Authentication dependency decision

**Decision date:** 2026-07-22

**Current package:** `next-auth@5.0.0-beta.32`

**Decision:** Update the pinned v5 beta from beta.31 to beta.32, then retain v5 during the closed Alpha with enhanced recovery, monitoring, and testing. Do not perform an untested downgrade to v4 solely because v4 is on npm's stable channel.

## July 22 review evidence

- npm’s `beta` tag is `5.0.0-beta.32`; npm’s stable `latest` tag remains the v4 line at `4.24.15`.
- The official beta.32 release says it incorporates `@auth/core@0.41.3` security fixes for malformed Bearer-token handling, provider-bound OAuth check cookies, and Unicode-normalized email validation. It also makes invalid session responses fail closed instead of appearing authenticated.
- `npm audit --omit=dev` reported zero known vulnerabilities after installation.
- The release remains a beta. A framework migration to v4 or another authentication library would still change callbacks, cookies, sessions, adapter behavior, and recovery paths; it requires a dedicated Staging migration, not an emergency version swap.

Official release: https://github.com/nextauthjs/next-auth/releases/tag/next-auth%405.0.0-beta.32

## Rationale

The application already uses the v5 App Router server-action and route-handler model. Moving to v4 would be a migration rather than a routine version change and could introduce different callback, adapter, cookie, and session behavior. The observed PKCE failure was a single production occurrence, so immediate replacement is not proportionate while the Alpha remains fictional-data-only and allowlisted.

## Re-evaluation triggers

Re-open this decision when any of the following occurs:

- npm publishes a stable v5 release.
- A newer beta includes OAuth, PKCE, cookie, Prisma-adapter, or Next.js fixes.
- Two or more PKCE errors occur within seven days, or a controlled test reproduces the failure.
- An Auth.js security advisory affects the installed version.
- Google callback completion falls below 99% during an expanded test cohort.
- The project approaches a real-data or public Beta release.

## Required evaluation before changing versions

1. Review Auth.js release notes and relevant security advisories.
2. Test Prisma adapter compatibility and database-session creation/deletion.
3. Run `npm run build`, `npm audit --omit=dev`, and the deterministic claim suite.
4. Run `npm run test:auth` locally and against a preview deployment.
5. Complete the dedicated fictional Google account callback procedure.
6. Verify sign-in, sign-out, account deletion, canonical redirects, error recovery, and privacy-safe logs.
7. Promote the tested preview rather than rebuilding an untested artifact.

The monthly GitHub workflow runs a production dependency audit and `scripts/check-auth-release.mjs`. It intentionally fails with a review warning when the beta tag changes or npm publishes stable v5; it never upgrades authentication automatically.
