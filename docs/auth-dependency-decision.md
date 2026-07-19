# Authentication dependency decision

**Decision date:** 2026-07-19  
**Current package:** `next-auth@5.0.0-beta.31`  
**Decision:** Retain Auth.js v5 beta during closed Alpha with enhanced recovery, monitoring, and testing. Do not perform an untested downgrade to v4 solely because v4 is on npm's stable channel.

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

The monthly GitHub workflow runs `scripts/check-auth-release.mjs`. It intentionally fails with a review warning when the beta tag changes or npm publishes stable v5; it never upgrades authentication automatically.
