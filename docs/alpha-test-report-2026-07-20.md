# Alpha verification report — July 20, 2026

Scope: fictional-data closed Alpha only

Canonical address: `https://veteran-claims-companion.vercel.app`

Repository baseline inspected: `f03b0fb`

## Outcome

No Blocker or Critical defect was found in the public, signed-out experience. The application builds successfully, the 40-scenario claim regression passes, the complete signed-out claim flow passes, the canonical public routes respond correctly, and the signed-out authentication boundaries pass against Production.

Signed-in storage and account lifecycle verification remains pending because it requires the dedicated fictional Google Alpha account. The accessibility corrections in this change also require a short post-deployment visual check and a human screen-reader/200% zoom pass.

## TEST-001 — blocker regression

- The feedback register has no open Blocker or Critical report at this review.
- `npm run test:release` now groups canonical links, accessibility contracts, authentication contracts, 40 fictional claims, and privacy-safe Alpha measurement validation.
- Live checks run only when their target environment variable is explicit, so a missing local server is reported as a skip rather than a false product failure.
- Status: **Partially completed / operating**. Repeat for each new Blocker or Critical Alpha report.

## TEST-002 — fictional-veteran regression

Fresh result:

- 40 of 40 scenarios passed.
- 33 produced a draft and 7 intentionally paused for missing information.
- 2 of 2 contradiction probes paused correctly.
- No unsafe wording was repeated into a template.
- Cross-claim isolation and legacy evidence conversion passed.
- Average deterministic workflow score: 99.9/100.

Status: **Completed** for this Alpha correction cycle.

## TEST-003 — responsive and complete experience

The following live routes were checked at 390 × 844, 768 × 1024, and 1440 × 900. No error overlay or horizontal overflow was found.

| Experience | Mobile | Tablet | Desktop | Notes |
|---|---:|---:|---:|---|
| Splash, login, dashboard | Pass | Pass | Pass | Public Alpha pages rendered normally. |
| Claim Builder | Pass | Pass | Pass | Layered layout reflowed without horizontal overflow. |
| Conditions and VA Forms | Pass | Pass | Pass | Search/library pages rendered normally. |
| Privacy and Terms | Pass | Pass | Pass | Public legal pages returned normally. |
| Document intake | Pass | Pass | Pass | Signed-out users were redirected to login as designed. |
| Claim package | Pass | Pass | Pass | Signed-out users were redirected to login as designed. |

A fictional migraine scenario was also completed through all 11 steps on the live Alpha. The test verified section navigation, readiness review, guided narrative generation, six-section confirmation, local save, and a fresh blank state after **Add another condition**.

Status: **Partially completed**. Signed-in workspace creation, fictional upload, cloud save/resume, package export, deletion, and logout await the dedicated test account.

## TEST-004 — accessibility

Issues found and corrected in source:

- Closed mobile navigation remained exposed to assistive technology and keyboard focus.
- Opening the mobile navigation did not move focus or make the background inert.
- Questionnaire step buttons announced only numbers rather than section names.
- Questionnaire completion had no programmatic progress-bar value.
- Several small navigation/helper colors did not meet the intended AA contrast target.
- Privacy and Terms links had undersized touch areas.
- Reduced-motion preferences were not honored by smooth scrolling and transitions.
- A consistent visible keyboard-focus treatment was missing.

Automated accessibility contracts now protect document language, mobile focus/inert behavior, descriptive questionnaire steps, progress semantics, visible focus, minimum touch area, and reduced motion. The production build and TypeScript checks pass with these corrections.

Status: **Partially completed**. After deployment, repeat the rendered checks and complete a human screen-reader, keyboard-only, error-recovery, 200% zoom, and reduced-motion pass.

## TEST-005 — authentication

The live, non-credential boundary suite passed 7 of 7 checks:

- Login page and safe retry guidance.
- Google as the sole published provider.
- Correct canonical callback and sign-in URLs.
- Private unauthenticated session response.
- Branded authentication error recovery.
- Canonical-host redirect behavior.

Status: **Partially completed**. The Google callback, persistent session, logout, expired-check recovery, and account deletion require one human run with the dedicated fictional account.

## TEST-006 — canonical links

The new automated test rejects noncanonical `*.vercel.app` addresses in repository text, verifies the tester invitation and fictional-data warning, checks required public/legal/authentication routes, and validates the environment example. Its live mode confirmed Splash, Login, Privacy, and Terms each return HTTP 200 without a Vercel protection redirect.

Status: **Completed**.

## Verification commands

- `npm run build` — passed.
- `npm run test:release` — passed; live-only checks skipped unless a target URL is supplied.
- Live canonical-link test — 5 of 5 passed.
- Live authentication-boundary test — 7 of 7 passed.
- `npm audit --omit=dev` — 0 vulnerabilities.
- `git diff --check` — passed.

## Required owner actions

1. Commit and deploy these changes before treating the accessibility corrections as live.
2. Use the dedicated fictional Google Alpha account to complete the human callback and signed-in lifecycle in `docs/auth-e2e-test.md`.
3. After deployment, ask Codex to repeat the responsive/accessibility smoke check on the canonical address.
