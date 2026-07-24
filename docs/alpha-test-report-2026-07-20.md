# Alpha verification report — July 20, 2026

Scope: fictional-data closed Alpha only

Current canonical address: `https://debriefclaims.com`

Original test address retired during the July 24 domain transition.

Repository baseline inspected: `f03b0fb`

## Outcome

No Blocker or Critical defect was found in the tested public or signed-in claim experience. The application builds successfully, the 40-scenario claim regression passes, the complete signed-out claim flow passes, the canonical public routes respond correctly, and the authentication boundaries pass against Production. A signed-in fictional tinnitus claim also saved to the hosted account, resumed at the correct step, generated a guided statement, retained all six confirmations, and appeared correctly in the two-condition claim package.

The remaining lifecycle checks are narrower: Chrome blocked automated file injection, its download event was not observable for the generated PDF, and the available signed-in account contains an existing migraine workspace and therefore is not safe to use for whole-account deletion. A human screen-reader and full keyboard-only pass also remains.

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

Post-deployment follow-up: all eight public routes passed at mobile, tablet, and desktop sizes (24/24), and Document intake, Claim package, and Account correctly redirected signed-out users at all three sizes (9/9).

Signed-in follow-up used a completely fictional tinnitus scenario. It verified:

- A fresh claim started without inheriting the existing migraine claim.
- The new claim saved to hosted storage and received its own claim URL.
- Dashboard counts changed from one to two saved claims.
- **Continue Tinnitus claim** restored the correct condition, answers, and Step 5 position.
- The guided generator created a condition-specific statement without importing content from the migraine claim.
- All six statement sections could be confirmed and the claim package reported one drafted/verified statement, two conditions, and one pre-existing uploaded document.
- The signed-in package reflowed at 390 × 844 with its navigation, summaries, condition cards, and next actions available.
- The fictional tinnitus claim was deleted, dashboard counts returned to one saved claim, and the pre-existing migraine claim remained intact.

The PDF control became enabled after all sections were confirmed, but Chrome did not expose a download event after activation, so the resulting file was not independently observed. Chrome also refused automated file injection into the native chooser; no file was transmitted.

Status: **Partially completed**. Manually upload, download, and delete `test-fixtures/fictional-alpha-record.pdf`, and confirm the downloaded condition review PDF opens. Cloud claim deletion and logout passed; whole-account deletion still requires a disposable fictional Alpha account.

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

Post-deployment follow-up: the mobile menu is absent from the accessible tree while closed; opening it makes the background inert and moves focus to Close menu; Escape closes it and restores focus to Open menu. Descriptive step names, progress semantics, error-recovery content, responsive reflow, a 200%-zoom equivalent, reduced-motion CSS, visible-focus CSS, and minimum-touch-target CSS were also confirmed live.

Status: **Partially completed**. Complete a human VoiceOver and full keyboard-only pass. Automated key injection did not expose a reliable focus trail, so that result is not being treated as human keyboard evidence.

## TEST-005 — authentication

The live, non-credential boundary suite passed 7 of 7 checks:

- Login page and safe retry guidance.
- Google as the sole published provider.
- Correct canonical callback and sign-in URLs.
- Private unauthenticated session response.
- Branded authentication error recovery.
- Canonical-host redirect behavior.

Production follow-up: Google sign-in succeeded at 05:43:53 UTC. Repeated successful session requests continued afterward, and the earlier deployment-transition failure was recovered through the branded retry path. The authenticated browser session remained valid throughout dashboard, intake, claim-builder, and package navigation. Sign out returned the browser to the public splash page and removed signed-in account controls. No account-deletion event has been recorded.

Status: **Partially completed**. Login, session persistence, recovery, and logout passed. The authenticated account displayed as Christopher James and contained a pre-existing migraine workspace and document, so it was not treated as a disposable fictional account. Application account deletion should be run with a dedicated disposable Alpha account.

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

1. In Document intake, manually select `test-fixtures/fictional-alpha-record.pdf`, confirm it appears in the workspace, download it once, and delete it. Chrome prevented automated selection; no real information should be used.
2. Download one condition review PDF and confirm that it opens and contains only the expected fictional claim details.
3. Complete a human VoiceOver and keyboard-only pass on Splash, Login, Dashboard, Document intake, Claim Builder, Claim package, and Account.
4. Use a dedicated disposable Alpha account to confirm Debrief account deletion. Logout has passed. Deleting the Debrief application account does not delete the Google account.
