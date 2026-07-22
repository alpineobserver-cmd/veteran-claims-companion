# Debrief product backlog

Last reviewed: July 22, 2026
Current release: closed Alpha  
Current data boundary: fictional information and fictional documents only

This file is the working source of truth for product tasks. Update the checkbox and status when work changes, link the related pull request or decision record, and record user-facing releases in the public changelog.

## How to use this backlog

- **P0 — Release blocker:** fix before inviting more Alpha testers or continuing the affected test.
- **P1 — High priority:** required for the next controlled testing milestone.
- **P2 — Planned:** important, but not required to continue the current fictional-data Alpha.
- **P3 — Future:** deliberately deferred until earlier gates are complete.
- `[Blocked]` means an outside decision, vendor, legal review, or prerequisite is required.
- `[Added]` identifies an item added during backlog consolidation rather than copied directly from the original follow-up list.
- A checked item is complete only when its acceptance criteria and relevant tests are satisfied.

## Non-negotiable release gates

- [ ] **GATE-001 · P0 · Real-data gate** — Do not accept real medical, claimant, government-identifier, or third-party information until secure storage, deletion, incident response, provider review, independent security review, and legal review are approved together.
- [ ] **GATE-002 · P0 · AI gate** — Do not send real records or health information to an AI provider until consent, retention/training settings, evidence-grounding controls, evaluation results, usage limits, and vendor review are approved.
- [ ] **GATE-003 · P0 · Submission gate** — Do not collect VA.gov credentials or represent that Debrief submits, prepares, presents, or prosecutes a claim on a user's behalf. The initial submission bridge must remain a guided package with official VA links.
- [ ] **GATE-004 · P0 · Public Beta gate** — Do not begin a broader Beta until the controlled Alpha retest, accessibility review, legal review, threat model, recovery test, and production operating procedures are complete.

## Completed Alpha foundation

- [x] **FOUND-001** — Google authentication uses database sessions and user-scoped data access.
- [x] **FOUND-002** — Branded authentication recovery, safe retry guidance, privacy-safe authentication logging, and canonical-host checks are implemented.
- [x] **FOUND-003** — The production build validates required authentication configuration without printing secrets.
- [x] **FOUND-004** — Claim, workspace, document, download, deletion, and account operations are scoped to the signed-in user.
- [x] **FOUND-005** — The Alpha warns against real information and restricts document intake to confirmed fictional files.
- [x] **FOUND-006** — The deterministic claim workflow passes 40 fictional scenarios, including contradiction and unsupported-causation checks.
- [x] **FOUND-007** — A non-AI guided statement generator remains available without paid generation.
- [x] **FOUND-008** — Privacy Notice, Terms, Security Policy, Alpha readiness audit, and public changelog exist.
- [x] **FOUND-009** — The canonical public Alpha address is `https://veteran-claims-companion.vercel.app`.

## Phase 1 — Immediate Alpha follow-up

### Feedback and measurement

- [x] **ALPHA-001 · P0** — Create one structured Alpha feedback tracker. See `docs/alpha-feedback-register.md`.
  - Capture tester, date, device/browser, workflow stage, fictional scenario used, expected result, observed result, severity, category, status, owner, and resolution link.
  - Categories: bug, usability issue, missing feature, content error, accessibility issue, security/privacy concern, and future idea.
- [ ] **ALPHA-002 · P0 · [Operating]** — Triage feedback at a regular cadence and fix blocking bugs before beginning major feature work. The process is established in `docs/alpha-feedback-register.md`; ongoing reviews remain active throughout Alpha.
  - Define blocker, critical, high, medium, and low severity.
  - Record duplicate reports against one canonical item.
  - [x] Document severity definitions, Monday/Thursday cadence, urgent screening, duplicate handling, ownership, verification, and closure rules.
  - [x] Triage and resolve the known protected-deployment-link report as `AF-0001`.
  - [ ] Run the checklist whenever feedback arrives and at each scheduled review; keep open Blocker/Critical work ahead of unrelated major features.
- [ ] **ALPHA-003 · P1 · [Partially completed]** — Establish Alpha success measures and a baseline. Definitions, targets, privacy controls, and aggregation tooling are implemented in `docs/alpha-success-measures.md`; the human baseline requires actual tester sessions.
  - Measure claim-workflow completion rate, abandonment stage, time to usable statement, save/resume success, export success, and user confidence.
  - Collect the minimum information needed and avoid health content or sensitive questionnaire responses in analytics.
  - [x] Define each measure, workflow stage, numerator, denominator, collection point, and initial Alpha target.
  - [x] Add a structured session-results schema and privacy-enforcing summary command.
  - [x] Record the 40-scenario deterministic workflow result as the technical baseline.
  - [ ] Record at least five Alpha sessions and publish the first human usability baseline.
- [x] **ALPHA-004 · P1 · [Added]** — Create a short post-test survey and moderated-test script so results are comparable across testers. See `docs/alpha-post-test-survey.md` and `docs/alpha-moderated-test-script.md`.
- [x] **ALPHA-005 · P1 · [Added]** — Publish a tester invitation template containing only the canonical Alpha URL, fictional-data rules, supported browsers, feedback instructions, and private security-reporting instructions. See `docs/alpha-tester-invitation.md`.
- [x] **ALPHA-006 · P1 · [Added]** — Maintain a tester onboarding/offboarding checklist. Completed July 21: `docs/alpha-tester-lifecycle.md` defines a privacy-separated tester register, minimum-access Google test-user changes for separate environments, terms acknowledgement, session revocation, self-service or assisted deletion disposition, monthly review, and quarterly non-identifying evidence.
  - Add and remove Google OAuth Test users intentionally.
  - Record consent to Alpha terms and confirm account/data deletion at the end of testing when requested.

### Regression and experience testing

- [ ] **TEST-001 · P0 · [Partially completed / operating]** — Reproduce and resolve every blocking Alpha defect with a regression test where practical. No open Blocker/Critical defect was found on July 20; `npm run test:release` is the combined regression gate. Repeat whenever qualifying feedback arrives.
- [x] **TEST-002 · P1** — Run a fresh fictional-veteran test set after the first Alpha corrections. On July 20, all 40 scenarios passed with a 99.9/100 average; see `docs/alpha-test-report-2026-07-20.md`.
  - Preserve the existing 40-scenario suite as a minimum regression gate.
  - Add scenarios derived from Alpha defects without including tester information.
- [ ] **TEST-003 · P1 · [Partially completed]** — Test the complete experience on representative mobile, tablet, and desktop sizes. The deployed public route matrix passed 24/24 checks, protected-route redirects passed 9/9 checks, and both the signed-out flow and signed-in cloud claim save/resume/package/delete flow passed. Signed-in package content also reflowed correctly at 390 × 844, and the fictional cloud claim was removed without affecting the existing migraine claim. Chrome blocked automated file injection, and the PDF download event could not be observed, so a manual fictional upload/download/file-deletion pass remains.
  - Cover splash page, login, workspace creation, upload, claim builder, review, save/resume, package workspace, export, deletion, and logout.
- [ ] **TEST-004 · P1 · [Partially completed]** — Complete a manual WCAG 2.2 AA accessibility review. Post-deploy mobile focus/inert behavior, accessible step/progress labels, error recovery, responsive reflow, the 200%-zoom equivalent, reduced-motion CSS, and touch-target CSS passed. A human VoiceOver and full keyboard-only pass remains.
  - Include keyboard-only operation, visible focus, screen-reader labels and announcements, headings, error recovery, contrast, 200% zoom, reflow, touch targets, and reduced motion.
- [ ] **TEST-005 · P1 · [Added] · [Partially completed]** — Run a real end-to-end Google login check with a dedicated fictional Alpha account before each Alpha release. Seven live non-credential boundary checks, Google callback, session creation, post-login session requests, expired-check recovery, and logout passed. The available Chrome session belongs to the existing Christopher James account and contains a pre-existing migraine workspace, so destructive account deletion was intentionally not attempted. Account deletion on a disposable fictional account remains.
  - Confirm login, callback, session creation, logout, expired-check recovery, and account deletion.
  - Never store the account password or MFA secret in source control or application logs.
- [x] **TEST-006 · P1 · [Added]** — Add an automated link check that confirms public invitations, OAuth settings, Privacy, and Terms use the canonical production address rather than protected Vercel deployment aliases. Repository and live canonical checks passed July 20.
- [ ] **TEST-007 · P1 · [Added] · [Partially completed]** — Run a structured 90-persona fictional usability study focused on how easily people can enter, understand, navigate, and complete the website and Claim Builder. The balanced, deterministic modeled-persona run and first correction cycle were completed July 21; see `docs/usability-simulation-2026-07-21.md`. Moderated human validation remains required.
  - [x] Run 90 modeled personas with 30 personas in each requested age/technology-fluency cohort.
  - [x] Balance device, claim path, evidence situation, and information completeness across cohorts.
  - [x] Publish baseline and post-change cohort comparisons with privacy-safe interaction signals.
  - [x] Implement the first high-confidence barrier corrections and add the usability regression harness to the release gate.
  - [ ] Validate mistake recovery, statement verification, missing-information follow-ups, and workspace vocabulary in moderated human sessions representing all three fluency cohorts.
  - Use three equal cohorts: 30 personas in their mid-20s with high technology fluency, 30 in their mid-40s with moderate technology fluency, and 30 in their mid-60s with low technology fluency.
  - Give each cohort a comparable mix of fictional conditions, claim paths, evidence situations, device sizes, and complete/incomplete information so age and technology fluency are not confused with scenario difficulty.
  - Evaluate the complete journey from splash page and login through workspace creation, optional document intake, starting a claim, layered questions, review, statement verification, claim-package handoff, save/resume, and next-step guidance.
  - Record privacy-safe behavioral signals: time and actions needed to begin, hesitation points, incorrect selections, repeated clicks, backtracking, abandoned stages, help requests, missed optional layers, misunderstood terms, answer changes, completion, and confidence about the next action.
  - Specifically identify processes, instructions, controls, and questions that appear confusing; distinguish wording problems from navigation, information architecture, visual hierarchy, accessibility, and system-feedback problems.
  - Compare results by cohort and device without treating age as ability or using stereotypes. Document the assumptions used to model technology fluency.
  - Define low-barrier acceptance thresholds before running the study, including successful unaided start, questionnaire progression, recovery from mistakes, save/resume, statement completion, and knowing what to do after export.
  - Publish a cohort-comparison report with severity-ranked findings, supporting interaction traces, recommended changes, and new backlog items. Do not include medical information or other sensitive data.
  - Treat fictional-persona findings as design hypotheses, not proof of human usability. Validate the highest-risk findings with moderated human sessions representing all three fluency cohorts before closing the item.

## Phase 2 — Complete the claim-package workflow

### Claim Builder

- [x] **CLAIM-001 · P1** — Support multiple conditions within one overall claim package while keeping each condition's evidence and narrative isolated. Completed July 20: each active condition remains an isolated workspace and is assembled in the consolidated package view.
- [x] **CLAIM-002 · P1** — Connect uploaded records to the relevant condition or conditions. Completed July 20: any account-owned upload can be linked to one or more key facts across condition workspaces without duplicating the stored file.
- [x] **CLAIM-003 · P1** — Show which user answer or source document supports each factual statement. Completed July 21: every factual statement now carries deterministic sentence-level links to its answer field or timeline event, related fact/evidence status, and linked upload names in the editor, verification step, consolidated package, saved revision history, and review PDF. Untraceable wording is surfaced for review, and untraceable AI wording blocks readiness rather than receiving a guessed source.
- [x] **CLAIM-004 · P1** — Build a consolidated claim-package workspace for statements, evidence, forms, missing items, and readiness status. Completed July 20 with per-condition metrics, source checklists, blockers, package-wide checks, status tracking, form references, and next actions.
- [x] **CLAIM-005 · P1** — Generate an individualized supporting-evidence checklist without implying that listed evidence guarantees an outcome. Completed July 20 with claim-path-specific facts, source status, linked files, pending-record treatment, and explicit no-guarantee language.
- [x] **CLAIM-006 · P1** — Provide a clear “What to do next” screen after export. Completed July 20 through the three-step submission bridge in the package workspace.
- [x] **CLAIM-007 · P1** — Build the first submission bridge as a guided package with official VA submission links. Completed July 20 with direct official VA filing links and manual lifecycle tracking.
  - Do not collect VA.gov credentials or automate submission.
  - Clearly distinguish prepared, downloaded, and actually submitted states.
- [x] **CLAIM-008 · P1** — Preserve statement versions and revision history with restore and comparison controls. Completed July 21: up to 20 generated or manually saved versions retain timestamp, drafting mode, preview, and source trace; any version can now be compared side by side with the live draft using word and section change summaries, then restored through the existing confirmation safeguard. The comparison stacks for narrow screens and does not alter saved data.
- [x] **CLAIM-009 · P1** — Improve autosave, resume, duplicate, archive, and permanent-delete behavior. Completed July 20: the existing optimistic cloud autosave/resume flow now includes duplicate, recoverable archive, restore, and separately warned permanent deletion.
- [x] **CLAIM-010 · P2** — Add buddy-statement questionnaires and drafting. Completed July 20 with a condition-specific firsthand-observation questionnaire, missing-information gate, guided editable draft, save/resume/delete, copy/download, and witness-review warning.
- [x] **CLAIM-011 · P2 · [Added]** — Add package-level validation for conflicting dates, duplicate evidence, unsupported relationships, incomplete conditions, and stale forms before export. Completed July 20 with blocking, attention, and check-level validation plus package-wide file-fingerprint and form-verification checks.
- [x] **CLAIM-012 · P2 · [Added]** — Let users mark package items as planned, requested, obtained, reviewed, exported, or submitted by the user, with a clear explanation that Debrief cannot verify VA receipt. Completed July 20; marking submitted requires an explicit user confirmation and remains labeled as unverified by Debrief.
- [x] **CLAIM-013 · P1 · [Added]** — Make the multi-condition statement workflow explicit. Completed July 21 after Alpha feedback: removed the redundant package metric strip, added direct Personal Statement, optional Buddy Statement, and Review/Download actions to every condition, added safe deep links to saved questionnaire sections, and added Return to Claim Builder actions to supporting workspaces.

## Phase 3 — Storage, privacy, and operational security

These items must be completed and reviewed together before the real-data gate can close.

- [ ] **SEC-001 · P0 · [Partially completed / Blocked]** — Produce a field-by-field data inventory and data-flow map covering browser storage, PostgreSQL, Blob, Google OAuth, Vercel, logs, backups, support access, and any future AI provider. Completed independently July 22: `docs/data-inventory-and-flow.md` inventories every Prisma field, local and transient browser data, current/future providers, trust boundaries, export/deletion behavior, and the end-to-end data flow; a release regression fails when a new schema field is undocumented. Closure requires provider configuration, region, backup, access, and contractual evidence from the administrator/vendor review.
- [ ] **SEC-002 · P0 · [Partially completed / Blocked]** — Develop authenticated, user-isolated storage approved for the intended information type. Authenticated owner-scoped database and private-object controls are implemented for fictional Alpha files. Completed independently July 22: added a provider-aware Google Cloud Storage adapter using keyless Vercel OIDC/Google Workload Identity Federation, fail-closed environment validation, old/new provider routing, provider-bound deletion reconciliation, tests, and an activation/rollback runbook. Also completed July 22: created the isolated billed Staging project and private `us-east4` bucket, enforced uniform IAM and public-access prevention, granted the keyless runtime identity bucket-only object access, restricted impersonation to the exact Debrief Staging Production OIDC subject, configured Staging-only Vercel values, and deployed successfully. No user-managed service-account key exists. Uploads are paused pending a fictional upload/download/verified-delete test and a second-user isolation test. Approval for real medical information remains blocked on malware quarantine plus the combined vendor, legal, threat-model, retention/backup, and independent-security review.
- [ ] **SEC-003 · P0 · [Blocked]** — Verify encryption in transit and at rest, key ownership, rotation, region, and vendor access controls. Application HTTPS and private-object enforcement exist, but provider configuration evidence, contractual controls, region, key ownership, vendor access, and tested rotation require administrator/vendor review.
- [x] **SEC-004 · P0** — Use short-lived signed links for private objects and prohibit public document URLs. Completed July 21: downloads now require a same-origin, authenticated ticket request; each HMAC-signed ticket is bound to one user and document, expires after 60 seconds, and is rechecked before the server streams the private object. Browser responses omit storage keys and Blob URLs, downloads remain `private, no-store`, and automated tests cover expiry, tampering, cross-user reuse, owner scoping, and private-only storage access.
- [x] **SEC-005 · P0** — Add file extension, MIME type, signature, size, filename, decompression, and parser-limit validation. Completed July 21: pre-storage inspection now requires extension and declared-MIME agreement with detected PDF/JPEG/PNG content; rejects unsafe or misleading filenames, malformed structures, trailing polyglot data, active PDF content, unsupported decoding chains, and excessive file, page, object, stream, chunk, segment, or decoded-image limits; and includes adversarial regression fixtures. This is not malware scanning and does not change the fictional-data boundary.
- [ ] **SEC-006 · P0 · [Blocked]** — Add malware scanning, quarantine, scan-status handling, and safe rejection before document processing. File validation is complete, but scanner/provider selection, credentials, failure policy, and operational monitoring are required before the quarantine pipeline can be completed.
- [ ] **SEC-007 · P0 · [Partially completed / Blocked]** — Define and implement retention, user-requested deletion, automatic deletion, backup expiry, and deletion-verification rules. Individual file/workspace and whole-account deletion exist for active storage; automatic retention periods and provider backup/log expiry require owner, legal, and vendor decisions before destructive automation is safe.
- [ ] **SEC-008 · P0 · [Partially completed / Blocked]** — Provide complete user data export and account deletion controls, including clear treatment of backups and audit records. Completed independently July 21: users can export all account-owned application records and audit events as portable JSON without credential tokens or private storage keys; binary files remain separately available through short-lived owner-bound downloads. Whole-account deletion now covers current and legacy object records, verifies every active-object removal and database removal, clears browser state, and downloads a privacy-safe receipt. Closure remains blocked on approved and verified provider backup and infrastructure-log retention/deletion behavior.
- [ ] **SEC-009 · P0 · [Blocked]** — Test restoration from backup and confirm deleted data expires from backups according to policy. Requires approved retention rules plus administrator access to provider backup and restoration controls.
- [ ] **SEC-010 · P0 · [Partially completed / Blocked]** — Export minimal security events to protected monitoring without recording document contents, medical details, tokens, or identifiers that are not operationally necessary. Completed independently July 22: authentication, rate-limit, storage-reconciliation, cleanup, document, and AI failures now use one fixed-name, fixed-field event formatter; unsafe token values are redacted, unknown fields are dropped, and release regressions prohibit direct logging in those paths. Closure requires selection and configuration of a protected destination, access policy, retention/deletion, alert ownership, severity alerts, and tested delivery.
- [x] **SEC-011 · P0** — Add durable rate limiting, abuse detection, upload quotas, and cost protection. Completed July 21: PostgreSQL-backed fixed-window counters now cover authenticated claim mutations, workspace creation, document upload/access/deletion, account export/deletion, and paid AI drafting across deployments; account principals are HMAC-protected; blocked activity produces privacy-minimized operational events and explicit retry responses; existing upload/workspace/claim quotas remain enforced; and paid AI has bounded per-user burst/daily plus global daily ceilings. Regression coverage, deployment validation, and an operating runbook are included. Platform WAF and protected monitoring remain separately tracked.
- [ ] **SEC-012 · P0 · [Partially completed / Blocked]** — Complete a threat model and independent penetration/security review; remediate findings. Completed independently July 22: `docs/threat-model.md` identifies assets, trust boundaries, 17 abuse cases, existing controls, residual risks, release gates, remediation priorities, and review triggers. Closure still requires a qualified independent penetration/security review and remediation of its findings; the internal model is not represented as that review.
- [ ] **SEC-013 · P0 · [Partially completed / Blocked]** — Create, review, and tabletop-test incident-response and breach-notification procedures. Completed independently July 22: `docs/incident-response-and-tabletop.md` defines roles, severity targets, evidence-safe response lifecycle, six scenario playbooks, four fictional tabletop exercises, and an exercise record. Closure requires named multi-person roles, qualified legal approval of notification decisions/timelines, current provider contacts, and execution of a recorded tabletop by the actual responders.
- [x] **SEC-014 · P1** — Add reconciliation and alerting for failures where database deletion succeeds but external object deletion fails, or vice versa. Completed July 21: deletion now verifies object absence, records durable HMAC-scoped reconciliation tasks for upload rollback and document/workspace/account partial failures, retries orphan upload cleanup, includes orphaned objects in later workspace/account deletion, resolves or removes tasks after successful cleanup, and emits privacy-minimized security events. Safe export metadata, a migration, regressions, and an operator runbook are included; protected event export remains separately blocked under SEC-010.
- [x] **SEC-015 · P1** — Add automated two-user authorization, upload/parser, account-deletion, API-abuse, and cross-origin tests. Completed July 21: the release gate now covers foreign-origin rejection, two fictional security principals, authentication/owner-scope contracts on every private API route, same-origin and durable-limit contracts on authenticated mutation routes, cross-user download-ticket rejection, adversarial upload/parser validation, verified account deletion, durable abuse limits, and a database-backed two-session live harness. The live harness proved user A could not list, read, mutate, export, or delete user B's records through the deployed handlers; deleting user A also left user B intact.
- [x] **SEC-016 · P1 · [Added]** — Add administrative kill switches for uploads, AI generation, and new registrations so risky processing can be stopped without a code release. Completed July 21: validated fail-closed environment controls can pause new uploads, external AI calls, or previously unlinked registrations independently; existing accounts, deletion/recovery paths, and the free guided narrative remain available; and an emergency change, redeployment, verification, and recording procedure is documented and regression-tested.
- [x] **SEC-017 · P1 · [Added]** — Create a documented secret inventory, owner, scope, rotation procedure, and emergency revocation checklist. Completed July 21: `docs/secret-inventory-and-rotation.md` classifies every application credential/configuration, assigns operational owners and environment scopes, defines provider-aware standard rotation and credential-specific cautions, protects pending reconciliation records during `AUTH_SECRET` rotation, and provides a tested emergency containment/revocation checklist without recording values.
- [ ] **SEC-018 · P2 · [Partially completed]** — Move the Content Security Policy toward nonces or hashes where framework compatibility permits. Completed independently July 22: centralized and regression-tested the policy; prohibited inline event-handler attributes, frames, media, foreign manifests, and Production insecure subresources; and kept `unsafe-eval` development-only. `unsafe-inline` remains an explicit framework-compatibility residual because per-request nonces would force dynamic rendering across currently static routes and stable hash/SRI support is not available on the current Next.js line. Re-evaluate nonce-based rendering or stable SRI before real-data authorization or after a major framework upgrade.
- [x] **SEC-019 · P1 · [Added]** — Remove direct Supabase Data API access to Prisma-owned application data. Completed July 21 in Staging: RLS is enabled on every public table, `anon`, `authenticated`, and `service_role` have no application table, sequence, or function grants, PostgreSQL-owned defaults are revoked, Prisma owner access remains operational, and the policy is preserved in a portable migration. No permissive Data API policies are intentionally defined because Debrief uses authenticated server routes and a direct owner connection.

## Phase 4 — Legal and governance

- [ ] **LEGAL-001 · P0 · [Blocked]** — Obtain qualified legal review before accepting real veteran, claimant, or medical information.
- [ ] **LEGAL-002 · P0 · [Blocked]** — Review 38 CFR Part 14 accreditation boundaries and confirm the product remains self-directed educational software.
- [ ] **LEGAL-003 · P0 · [Blocked]** — Determine applicability of the FTC Act, FTC Health Breach Notification Rule, HIPAA/business-associate rules, state consumer-health/privacy laws, and rules based on actual user locations.
- [ ] **LEGAL-004 · P0 · [Blocked]** — Review and approve the Privacy Notice and Terms, including the legal operator, required address, governing terms, vendors, retention, deletion, and contact channels.
- [x] **LEGAL-005 · P0** — Clearly state that Debrief is independent, is not the VA, is not a VA-accredited representative, and does not provide legal or medical advice. Completed July 21: the full boundary is visible on the public entry, sign-in, persistent authenticated navigation, and Terms; official accredited-representative help remains linked; and a release regression prevents the core disclosures from being removed. This product wording does not replace the blocked qualified legal review.
- [ ] **LEGAL-006 · P0 · [Blocked]** — Define informed consent for document processing and AI use, including withdrawal and deletion behavior.
- [ ] **LEGAL-007 · P1 · [Blocked]** — Review VA trademarks, seals, branding, attribution, and the “Debrief” product name/domain.
- [x] **LEGAL-008 · P1** — Review third-party software, content, and data licenses; generate required notices and attribution. Completed independently July 22: the production lockfile has no unknown license fields; an automated release gate rejects unreviewed license expressions; `THIRD_PARTY_NOTICES.md` and `/licenses` attribute material software, Lucide, CC-BY-4.0 browser data, LGPL libvips binaries, and government-source usage. This engineering review does not replace the qualified operator, mark, or distribution advice tracked elsewhere.
- [x] **LEGAL-009 · P1** — Establish WCAG 2.2 AA as the accessibility target and document the review process. Completed July 21: `docs/accessibility-review-process.md` defines the WCAG 2.2 AA target, required keyboard, screen-reader, reflow, contrast, form, touch, motion, and readability reviews, privacy-safe evidence, finding severity, release-blocking rules, retest, and exception controls. Automated and manual evidence remain required; this is a target, not a certification.
- [x] **LEGAL-010 · P1** — Create an operating process for privacy, deletion, security, accessibility, and content-correction requests. Completed July 21: the public `/support` route and `docs/support-and-correction-operations.md` establish privacy-minimized intake through the monitored Alpha contact, category-specific handling, neutral tracking fields, immediate security/privacy escalation, identity-safe deletion handling, retest/source-review closure, and legal escalation boundaries.
- [ ] **LEGAL-011 · P1 · [Added]** — Define who is authorized to approve real-data, AI, content, and production releases; preserve dated approval records.

## Phase 5 — Evidence-grounded generative AI

- [ ] **AI-001 · P1** — Integrate generative AI for editable personal-statement drafting after the AI gate is satisfied.
- [ ] **AI-002 · P1** — Ask targeted follow-up questions when essential information is missing rather than filling gaps.
- [ ] **AI-003 · P0** — Prevent generated drafts from inventing dates, diagnoses, events, symptoms, treatment, relationships, supporting records, or claim outcomes.
- [ ] **AI-004 · P1** — Let users accept, reject, regenerate, or edit every generated section before it enters a package.
- [ ] **AI-005 · P1** — Require source citations or page references whenever a draft relies on an uploaded record.
- [ ] **AI-006 · P1** — Visually distinguish record-derived facts, user-provided facts, witness observations, and model-authored connective language.
- [x] **AI-007 · P1** — Create a formal AI evaluation suite from the fictional scenarios. Completed independently July 22: a zero-cost, provider-free release gate scores all 40 fictional claims for the eight required dimensions and fails below the release floor.
  - Score factual fidelity, completeness, uncertainty preservation, tone, readability, unsupported claims, sensitivity handling, and cross-condition leakage.
- [ ] **AI-008 · P1** — Preserve a privacy-conscious generation audit trail containing model, prompt version, source references, timestamp, result status, and user disposition.
- [x] **AI-009 · P1** — Version prompts and generation policies so changes can be compared and reversed. Completed independently July 22: current and rollback personal-statement policies have stable identifiers, deployment validation, runtime reporting, and fail-closed selection.
- [ ] **AI-010 · P1** — Establish per-user quotas, token limits, rate limits, budget alerts, and a hard spending cap.
- [ ] **AI-011 · P0 · [Blocked]** — Confirm provider retention, training, region, subprocessors, deletion, abuse-monitoring, and contract settings before processing real information.
- [x] **AI-012** — Maintain a usable non-AI fallback for guided statement generation.
- [ ] **AI-013 · P2** — Add evidence-grounded buddy-statement drafting after personal-statement quality gates pass.
- [x] **AI-014 · P1 · [Added]** — Add a rapid disable/rollback path for a model or prompt version that fails evaluation or produces unsafe output. Completed independently July 22: the existing external-AI kill switch now works with a retained rollback policy, an invalid policy cannot reach the provider, and `docs/ai-release-and-rollback.md` defines privacy-safe containment and re-enable gates.

## Phase 6 — Conditions and VA Forms libraries

- [ ] **CONTENT-001 · P1** — Expand and validate condition coverage against the current 38 CFR rating schedule.
- [ ] **CONTENT-002 · P1** — Preserve diagnostic codes, body systems, analogous-rating context, and rating criteria.
- [ ] **CONTENT-003 · P1** — Link every rating explanation to an authoritative source.
- [x] **CONTENT-004 · P1** — Display last-verified dates and content versions. Completed independently July 22: every condition and form detail shows its library version, last verification context, and linked record fingerprint.
- [ ] **CONTENT-005 · P1** — Clearly separate quoted or closely tracked regulatory criteria from plain-language educational explanations.
- [ ] **CONTENT-006 · P1** — Flag criteria requiring specialist, legal, or medical interpretation.
- [x] **CONTENT-007 · P2** — Build recurring checks for 38 CFR amendments. Completed July 22: a read-only weekly workflow compares the official eCFR Title 38 Part 4 issue date with the reviewed baseline, opens one review issue on change or unavailability, and is prohibited from editing or publishing content. The first live check found no issue date newer than February 27, 2026.
- [ ] **CONTENT-008 · P2 · [Partially completed]** — Build recurring checks for revised, replaced, or withdrawn VA forms and official URLs. Completed independently July 22: the same weekly workflow checks every official information/download destination, approved government redirects, PDF identity, and modification dates; all 20 first-run checks passed. Closure requires approved VA Forms API access so nightly VA revision hashes, validity, and deletion metadata can be compared rather than relying on URL and header signals.
- [x] **CONTENT-009 · P1** — Require human review and approval before automated content changes are published. Completed July 22: protected condition, diagnostic-code, rating-scheme, and form files now fail the pull-request gate until a human applies `content-reviewed`; automation may only open a review issue and may never apply the label, edit content, or merge it.
- [x] **CONTENT-010 · P1** — Record every published content change in the public changelog. Completed July 22: the protected release gate rejects a condition/form content change unless `lib/changelog.ts` changes in the same pull request.
- [x] **CONTENT-011 · P1** — Let users report outdated, broken, or incorrect content without including claim or health details. Completed July 21: Conditions and VA Forms now link directly to the public Support correction section, which asks only for the affected content, suspected problem, and optional official source while explicitly rejecting health, claim, credential, and private account details. No sensitive web form or new support database was added.
- [x] **CONTENT-012 · P1 · [Added]** — Preserve source snapshots or hashes and an internal provenance record so reviewers can reproduce what authority supported each release. Completed independently July 22: `/sources` publishes authority metadata and reproducible SHA-256 fingerprints over each local condition/form record, with explicit hash scope and a release-review procedure that avoids mislabeling live government markup as a stored snapshot.
- [x] **CONTENT-013 · P1 · [Added]** — Remove empty body-system navigation and connect condition guides directly to potentially relevant diagnostic-code paths. Completed July 21: the directory now shows only systems with indexed content, groups code links under each condition, keeps official-source links visible, and labels code-only material that lacks a full Debrief guide.

## Phase 7 — Production operations

- [ ] **OPS-001 · P1** — Secure an approved domain name after product-name and trademark review.
- [ ] **OPS-002 · P1** — Create monitored domain-based privacy, security, and support email addresses.
- [ ] **OPS-003 · P2 · [Blocked]** — Move Google OAuth from Testing to Production only when the broader-release gates and Google requirements are met.
- [ ] **OPS-004 · P3** — Evaluate a non-Google login option using the same security and recovery requirements.
- [ ] **OPS-005 · P1 · [Partially completed / operating]** — Establish separate development, staging, and production environments. The isolated Staging environment, release controls, and first live smoke test were completed July 20. The remaining task is to use and record the first Staging-to-Production promotion.
  - [x] Create the **Debrief Staging** Vercel project connected to the same GitHub repository; retain the existing project as **Debrief Production**. The Staging project's Production Branch is `staging`, and its stable Vercel address is `debrief-staging-khaki.vercel.app`.
  - [x] Create and publish the long-lived `staging` branch from the current Production release. Completed July 20; `main`, `staging`, and both remote branches point to commit `e0a9fc6`.
  - [x] Protect `main` and `staging`, require the **Debrief release gate**, block deletion and force pushes, and use feature branches for disposable previews. Completed July 20 with the active **Debrief protected release branches** ruleset. Pull requests require the `verify` check and an up-to-date branch; approval count remains zero so the solo owner is not locked out.
  - [x] Add Staging environment labels, canonical Staging authentication URL/host, privacy contact, and a separate permanent `AUTH_SECRET` to the Staging project's Production scope. Add non-secret Staging labels to Preview without persistence credentials.
  - [x] Provision separate Staging PostgreSQL and private Blob resources, then add only their Staging credentials to the Staging project's Production scope. Completed July 20 with a dedicated Supabase project and private Vercel Blob store. The initial database password was rotated before use, Prisma migrations completed, and no Staging persistence credential is available to Preview.
  - [x] Create a separate Staging Google OAuth client for host `debrief-staging-khaki.vercel.app` and callback path `/api/auth/callback/google`, then add its ID and secret only to Staging Production. Completed July 20; superseded setup secrets were disabled and deleted.
  - [x] Remove Preview access from the existing Production project's database, Blob, Google OAuth, and authentication secrets. Completed July 20; Production credentials are scoped only to Vercel's Production environment. Historical immutable Preview deployments remain Vercel-protected and should be removed under a separate retention decision if needed.
  - [x] Disable Vercel's **Require Log In** protection on the stable Staging address so external testers reach Debrief's Google sign-in instead of a Vercel access prompt. Completed July 20; access remains controlled by Debrief authentication and Google's Testing-user allowlist.
  - [x] Add a persistent **Development build — fictional data only** banner containing the environment and release/commit identifier to every non-Production build.
  - [x] Add build-time environment and data-label checks that block Staging from using the Production OAuth origin and block an explicitly mislabeled Production data boundary.
  - [x] Preserve the current canonical Production Alpha origin and add a repository test rejecting protected Vercel aliases in tester-facing content.
  - [x] Add an automated GitHub release gate for `staging`, `main`, and their pull requests.
  - [x] Document the feature → Staging → Production promotion flow, smoke test, emergency fix, rollback, and database-migration caution in `docs/deployment-environments.md`.
  - [x] Add `docs/release-record-template.md` for commit/version, migrations, approver, notes, rollback target, and smoke results.
  - [x] Complete the first isolated Staging smoke test. On July 20, the Vercel build and Prisma migration completed, the stable Staging landing page loaded without Vercel protection, Google OAuth completed, and the authenticated dashboard loaded with the Staging banner.
  - [ ] Complete the first Staging-to-Production promotion record when an approved Staging release is promoted.
- [x] **OPS-006 · P1** — Add automated build, lint, type, unit, integration, migration, dependency, security, and release-gate checks. Completed July 21: the protected `verify` gate now aggregates repository-owned ESLint rules, parallel TypeScript, production-build, deterministic unit/evaluation, storage/data-lifecycle integration, clean-PostgreSQL migration, dependency-tree/audit, and authentication/authorization/security jobs. High or critical dependency advisories block the release, and the existing local `test:release` command preserves the same complete regression coverage.
- [ ] **OPS-007 · P1 · [Partially completed]** — Add privacy-conscious error, authentication-health, uptime, and performance monitoring. Completed independently July 22: added a data-free liveness endpoint, fixed-field application failure events, a public/auth/session synthetic checker with a latency threshold, and a GitHub monitoring workflow. Closure still requires a protected event destination, access/retention policy, named alert recipients/escalation, delivery testing, and authenticated save/export and Google-callback measurement.
- [ ] **OPS-008 · P1 · [Partially completed]** — Add service-health alerts and a public status page before a broader release. Completed independently July 22: `/status` runs a credential-free current snapshot, public navigation exposes it, and failed scheduled checks create or update one privacy-safe GitHub issue that automatically closes after recovery. Closure requires default-branch activation through an approved promotion, named recipients/escalation, tested issue delivery, and a decision on public incident history.
- [ ] **OPS-009 · P1 · [Partially completed]** — Document deployment, promotion, rollback, backup, restoration, and disaster-recovery procedures. Completed independently July 22: `docs/backup-restore-and-disaster-recovery.md` now separates Git/Vercel release recovery, Supabase PostgreSQL recovery, private Blob recovery, and configuration; defaults to restoration into an isolated project; and defines fictional-fixture validation and a privacy-safe acceptance record. Closure requires verified provider backup/retention evidence, approved database and Blob recovery objectives, a secondary private-object copy process, named approvers, and a completed isolated restore drill.
- [ ] **OPS-010 · P1 · [Partially completed]** — Establish a release checklist, named approver, version number, release notes, and rollback decision for every release. The template and required fields exist; the owner must name the Production approver and use the record for each release.
- [x] **OPS-011 · P1 · [Operating]** — Monitor Auth.js releases and security advisories; re-evaluate the pinned beta according to `docs/auth-dependency-decision.md`. Current review completed July 22: updated beta.31 to pinned beta.32 for the upstream OAuth-cookie, Bearer-token, Unicode-email, and fail-closed-session fixes; production audit is clean; the monthly workflow now checks advisories as well as release channels. Repeat this operating review on workflow alert or the documented trigger.
- [x] **OPS-012 · P1 · [Added]** — Add a canonical-domain check to release verification and ensure protected preview/deployment URLs never appear in tester communications. Completed July 21: the release suite scans repository text for non-canonical Vercel addresses, validates the tester invitation's canonical address and protected-alias warning, confirms required public routes, and live-checks the canonical pages when the release URL is supplied. Support is now included in both static and live route coverage.
- [x] **OPS-013 · P1 · [Added]** — Define service-level objectives for sign-in success, availability, save success, export success, and incident response. Completed July 21: `docs/service-level-objectives.md` defines rolling 30-day indicators and targets, raw-count reporting for small Alpha samples, privacy-minimized measurement, error budgets, feature-pause rules, and Critical/High support-response targets. Monitoring implementation remains explicitly tracked by OPS-007.
- [x] **OPS-014 · P2** — Review the 13 foreign-key index recommendations reported by the Supabase performance advisor, add only query-supported indexes, and record before/after query plans. Completed July 22: mapped every recommendation to a real query/join/referential-cleanup path, deployed 13 ordered indexes to Staging through Prisma, cleared all 13 `unindexed_foreign_keys` findings, and recorded privacy-safe before/after eligibility plans. The immediate `unused_index` informational findings are expected for new indexes on tiny Alpha tables and will be revisited after representative usage.

## Phase 8 — Controlled retest and Beta decision

- [ ] **BETA-001 · P1** — Run a second controlled fictional-data test with new and returning testers after Phases 1–7 meet their applicable Alpha requirements.
- [ ] **BETA-002 · P1** — Compare results against the Alpha baseline and document regressions, unresolved risks, and confidence by workflow stage.
- [ ] **BETA-003 · P0 · [Blocked]** — Hold a documented go/no-go review covering product quality, accessibility, privacy, security, legal, content, AI, operations, and support readiness.
- [ ] **BETA-004 · P1** — Publish the approved Beta scope, data boundary, known limitations, support process, and rollback criteria before invitations.

## Deferred ideas

- [ ] **FUTURE-001 · P3** — Direct submission integration, only if an official, authorized mechanism becomes available and legal/security review approves it.
- [ ] **FUTURE-002 · P3** — Additional identity providers or passwordless authentication.
- [ ] **FUTURE-003 · P3** — Automated record extraction and claim recommendations after real-data and AI gates close.
- [ ] **FUTURE-004 · P3** — Broader public access and real-record processing.

## Recommended execution order

1. Complete **Phase 1** feedback collection, defect triage, canonical-link control, and end-to-end testing.
2. Complete **Phase 2** so a user can move from workspace creation through one coherent claim package and a guided next step.
3. Complete **Phases 3 and 4** as the combined security, privacy, and legal foundation for any real-data decision.
4. Complete **Phase 5** AI integration using fictional data, evidence grounding, evaluations, and cost/safety controls.
5. Complete **Phase 6** authoritative content validation and provenance.
6. Complete **Phase 7** production operations and release discipline.
7. Run **Phase 8** and make a documented Beta decision.

## Backlog maintenance checklist

- [ ] Review this backlog after every Alpha feedback cycle.
- [ ] Assign an owner and target milestone when an item enters active work.
- [ ] Link implementation, test evidence, legal/security decisions, and release notes before checking an item complete.
- [ ] Move newly discovered release blockers into the applicable gate immediately.
- [ ] Keep fictional-data restrictions active until `GATE-001` is formally approved.
