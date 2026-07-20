# Debrief product backlog

Last reviewed: July 20, 2026
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
- [ ] **ALPHA-006 · P1 · [Added]** — Maintain a tester onboarding/offboarding checklist.
  - Add and remove Google OAuth Test users intentionally.
  - Record consent to Alpha terms and confirm account/data deletion at the end of testing when requested.

### Regression and experience testing

- [ ] **TEST-001 · P0 · [Partially completed / operating]** — Reproduce and resolve every blocking Alpha defect with a regression test where practical. No open Blocker/Critical defect was found on July 20; `npm run test:release` is the combined regression gate. Repeat whenever qualifying feedback arrives.
- [x] **TEST-002 · P1** — Run a fresh fictional-veteran test set after the first Alpha corrections. On July 20, all 40 scenarios passed with a 99.9/100 average; see `docs/alpha-test-report-2026-07-20.md`.
  - Preserve the existing 40-scenario suite as a minimum regression gate.
  - Add scenarios derived from Alpha defects without including tester information.
- [ ] **TEST-003 · P1 · [Partially completed]** — Test the complete experience on representative mobile, tablet, and desktop sizes. Public routes and the full signed-out claim flow passed; signed-in storage/package/account paths need the dedicated test account.
  - Cover splash page, login, workspace creation, upload, claim builder, review, save/resume, package workspace, export, deletion, and logout.
- [ ] **TEST-004 · P1 · [Partially completed]** — Complete a manual WCAG 2.2 AA accessibility review. Initial rendered review and source remediation are complete; a post-deploy human screen-reader and 200% zoom pass remains.
  - Include keyboard-only operation, visible focus, screen-reader labels and announcements, headings, error recovery, contrast, 200% zoom, reflow, touch targets, and reduced motion.
- [ ] **TEST-005 · P1 · [Added] · [Partially completed]** — Run a real end-to-end Google login check with a dedicated fictional Alpha account before each Alpha release. All seven live non-credential boundary checks passed; the human Google callback and account lifecycle remain.
  - Confirm login, callback, session creation, logout, expired-check recovery, and account deletion.
  - Never store the account password or MFA secret in source control or application logs.
- [x] **TEST-006 · P1 · [Added]** — Add an automated link check that confirms public invitations, OAuth settings, Privacy, and Terms use the canonical production address rather than protected Vercel deployment aliases. Repository and live canonical checks passed July 20.

## Phase 2 — Complete the claim-package workflow

### Claim Builder

- [ ] **CLAIM-001 · P1** — Support multiple conditions within one overall claim package while keeping each condition's evidence and narrative isolated.
- [ ] **CLAIM-002 · P1** — Connect uploaded records to the relevant condition or conditions.
- [ ] **CLAIM-003 · P1** — Show which user answer or source document supports each factual statement.
- [ ] **CLAIM-004 · P1** — Build a consolidated claim-package workspace for statements, evidence, forms, missing items, and readiness status.
- [ ] **CLAIM-005 · P1** — Generate an individualized supporting-evidence checklist without implying that listed evidence guarantees an outcome.
- [ ] **CLAIM-006 · P1** — Provide a clear “What to do next” screen after export.
- [ ] **CLAIM-007 · P1** — Build the first submission bridge as a guided package with official VA submission links.
  - Do not collect VA.gov credentials or automate submission.
  - Clearly distinguish prepared, downloaded, and actually submitted states.
- [ ] **CLAIM-008 · P1** — Preserve statement versions and revision history with restore and comparison controls.
- [ ] **CLAIM-009 · P1** — Improve autosave, resume, duplicate, archive, and permanent-delete behavior.
- [ ] **CLAIM-010 · P2** — Add buddy-statement questionnaires and drafting.
- [ ] **CLAIM-011 · P2 · [Added]** — Add package-level validation for conflicting dates, duplicate evidence, unsupported relationships, incomplete conditions, and stale forms before export.
- [ ] **CLAIM-012 · P2 · [Added]** — Let users mark package items as planned, requested, obtained, reviewed, exported, or submitted by the user, with a clear explanation that Debrief cannot verify VA receipt.

## Phase 3 — Storage, privacy, and operational security

These items must be completed and reviewed together before the real-data gate can close.

- [ ] **SEC-001 · P0 · [Blocked]** — Produce a field-by-field data inventory and data-flow map covering browser storage, PostgreSQL, Blob, Google OAuth, Vercel, logs, backups, support access, and any future AI provider.
- [ ] **SEC-002 · P0** — Develop authenticated, user-isolated storage approved for the intended information type.
- [ ] **SEC-003 · P0** — Verify encryption in transit and at rest, key ownership, rotation, region, and vendor access controls.
- [ ] **SEC-004 · P0** — Use short-lived signed links for private objects and prohibit public document URLs.
- [ ] **SEC-005 · P0** — Add file extension, MIME type, signature, size, filename, decompression, and parser-limit validation.
- [ ] **SEC-006 · P0** — Add malware scanning, quarantine, scan-status handling, and safe rejection before document processing.
- [ ] **SEC-007 · P0** — Define and implement retention, user-requested deletion, automatic deletion, backup expiry, and deletion-verification rules.
- [ ] **SEC-008 · P0** — Provide complete user data export and account deletion controls, including clear treatment of backups and audit records.
- [ ] **SEC-009 · P0** — Test restoration from backup and confirm deleted data expires from backups according to policy.
- [ ] **SEC-010 · P0** — Export minimal security events to protected monitoring without recording document contents, medical details, tokens, or identifiers that are not operationally necessary.
- [ ] **SEC-011 · P0** — Add durable rate limiting, abuse detection, upload quotas, and cost protection.
- [ ] **SEC-012 · P0 · [Blocked]** — Complete a threat model and independent penetration/security review; remediate findings.
- [ ] **SEC-013 · P0 · [Blocked]** — Create, review, and tabletop-test incident-response and breach-notification procedures.
- [ ] **SEC-014 · P1** — Add reconciliation and alerting for failures where database deletion succeeds but external object deletion fails, or vice versa.
- [ ] **SEC-015 · P1** — Add automated two-user authorization, upload/parser, account-deletion, API-abuse, and cross-origin tests.
- [ ] **SEC-016 · P1 · [Added]** — Add administrative kill switches for uploads, AI generation, and new registrations so risky processing can be stopped without a code release.
- [ ] **SEC-017 · P1 · [Added]** — Create a documented secret inventory, owner, scope, rotation procedure, and emergency revocation checklist.
- [ ] **SEC-018 · P2** — Move the Content Security Policy toward nonces or hashes where framework compatibility permits.

## Phase 4 — Legal and governance

- [ ] **LEGAL-001 · P0 · [Blocked]** — Obtain qualified legal review before accepting real veteran, claimant, or medical information.
- [ ] **LEGAL-002 · P0 · [Blocked]** — Review 38 CFR Part 14 accreditation boundaries and confirm the product remains self-directed educational software.
- [ ] **LEGAL-003 · P0 · [Blocked]** — Determine applicability of the FTC Act, FTC Health Breach Notification Rule, HIPAA/business-associate rules, state consumer-health/privacy laws, and rules based on actual user locations.
- [ ] **LEGAL-004 · P0 · [Blocked]** — Review and approve the Privacy Notice and Terms, including the legal operator, required address, governing terms, vendors, retention, deletion, and contact channels.
- [ ] **LEGAL-005 · P0** — Clearly state that Debrief is independent, is not the VA, is not a VA-accredited representative, and does not provide legal or medical advice.
- [ ] **LEGAL-006 · P0 · [Blocked]** — Define informed consent for document processing and AI use, including withdrawal and deletion behavior.
- [ ] **LEGAL-007 · P1 · [Blocked]** — Review VA trademarks, seals, branding, attribution, and the “Debrief” product name/domain.
- [ ] **LEGAL-008 · P1** — Review third-party software, content, and data licenses; generate required notices and attribution.
- [ ] **LEGAL-009 · P1** — Establish WCAG 2.2 AA as the accessibility target and document the review process.
- [ ] **LEGAL-010 · P1** — Create an operating process for privacy, deletion, security, accessibility, and content-correction requests.
- [ ] **LEGAL-011 · P1 · [Added]** — Define who is authorized to approve real-data, AI, content, and production releases; preserve dated approval records.

## Phase 5 — Evidence-grounded generative AI

- [ ] **AI-001 · P1** — Integrate generative AI for editable personal-statement drafting after the AI gate is satisfied.
- [ ] **AI-002 · P1** — Ask targeted follow-up questions when essential information is missing rather than filling gaps.
- [ ] **AI-003 · P0** — Prevent generated drafts from inventing dates, diagnoses, events, symptoms, treatment, relationships, supporting records, or claim outcomes.
- [ ] **AI-004 · P1** — Let users accept, reject, regenerate, or edit every generated section before it enters a package.
- [ ] **AI-005 · P1** — Require source citations or page references whenever a draft relies on an uploaded record.
- [ ] **AI-006 · P1** — Visually distinguish record-derived facts, user-provided facts, witness observations, and model-authored connective language.
- [ ] **AI-007 · P1** — Create a formal AI evaluation suite from the fictional scenarios.
  - Score factual fidelity, completeness, uncertainty preservation, tone, readability, unsupported claims, sensitivity handling, and cross-condition leakage.
- [ ] **AI-008 · P1** — Preserve a privacy-conscious generation audit trail containing model, prompt version, source references, timestamp, result status, and user disposition.
- [ ] **AI-009 · P1** — Version prompts and generation policies so changes can be compared and reversed.
- [ ] **AI-010 · P1** — Establish per-user quotas, token limits, rate limits, budget alerts, and a hard spending cap.
- [ ] **AI-011 · P0 · [Blocked]** — Confirm provider retention, training, region, subprocessors, deletion, abuse-monitoring, and contract settings before processing real information.
- [x] **AI-012** — Maintain a usable non-AI fallback for guided statement generation.
- [ ] **AI-013 · P2** — Add evidence-grounded buddy-statement drafting after personal-statement quality gates pass.
- [ ] **AI-014 · P1 · [Added]** — Add a rapid disable/rollback path for a model or prompt version that fails evaluation or produces unsafe output.

## Phase 6 — Conditions and VA Forms libraries

- [ ] **CONTENT-001 · P1** — Expand and validate condition coverage against the current 38 CFR rating schedule.
- [ ] **CONTENT-002 · P1** — Preserve diagnostic codes, body systems, analogous-rating context, and rating criteria.
- [ ] **CONTENT-003 · P1** — Link every rating explanation to an authoritative source.
- [ ] **CONTENT-004 · P1** — Display last-verified dates and content versions.
- [ ] **CONTENT-005 · P1** — Clearly separate quoted or closely tracked regulatory criteria from plain-language educational explanations.
- [ ] **CONTENT-006 · P1** — Flag criteria requiring specialist, legal, or medical interpretation.
- [ ] **CONTENT-007 · P2** — Build recurring checks for 38 CFR amendments.
- [ ] **CONTENT-008 · P2** — Build recurring checks for revised, replaced, or withdrawn VA forms and official URLs.
- [ ] **CONTENT-009 · P1** — Require human review and approval before automated content changes are published.
- [ ] **CONTENT-010 · P1** — Record every published content change in the public changelog.
- [ ] **CONTENT-011 · P1** — Let users report outdated, broken, or incorrect content without including claim or health details.
- [ ] **CONTENT-012 · P1 · [Added]** — Preserve source snapshots or hashes and an internal provenance record so reviewers can reproduce what authority supported each release.

## Phase 7 — Production operations

- [ ] **OPS-001 · P1** — Secure an approved domain name after product-name and trademark review.
- [ ] **OPS-002 · P1** — Create monitored domain-based privacy, security, and support email addresses.
- [ ] **OPS-003 · P2 · [Blocked]** — Move Google OAuth from Testing to Production only when the broader-release gates and Google requirements are met.
- [ ] **OPS-004 · P3** — Evaluate a non-Google login option using the same security and recovery requirements.
- [ ] **OPS-005 · P1** — Separate development, staging, and production data, credentials, storage, OAuth clients, and deployment controls.
- [ ] **OPS-006 · P1** — Add automated build, type, unit, integration, migration, dependency, security, and release-gate checks.
- [ ] **OPS-007 · P1** — Add privacy-conscious error, authentication-health, uptime, and performance monitoring.
- [ ] **OPS-008 · P1** — Add service-health alerts and a public status page before a broader release.
- [ ] **OPS-009 · P1** — Document deployment, promotion, rollback, backup, restoration, and disaster-recovery procedures.
- [ ] **OPS-010 · P1** — Establish a release checklist, named approver, version number, release notes, and rollback decision for every release.
- [ ] **OPS-011 · P1** — Monitor Auth.js releases and security advisories; re-evaluate the pinned beta according to `docs/auth-dependency-decision.md`.
- [ ] **OPS-012 · P1 · [Added]** — Add a canonical-domain check to release verification and ensure protected preview/deployment URLs never appear in tester communications.
- [ ] **OPS-013 · P1 · [Added]** — Define service-level objectives for sign-in success, availability, save success, export success, and incident response.

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
