# Debrief Alpha feedback register

Last triaged: July 20, 2026
Next routine triage: when new feedback arrives, and no later than the next Monday/Thursday review  
Data boundary: fictional Alpha activity only

This is the single canonical tracker for Alpha feedback. Conversations, emails, screenshots, and test notes are intake sources, not parallel trackers. Add each report here, merge duplicates into one canonical record, and link implementation or verification evidence before closing it.

## Safety rules

- Do not record names, email addresses, Google account details, passwords, authentication codes, cookies, tokens, real claim facts, medical information, government identifiers, or uploaded document contents.
- Assign testers a neutral code such as `T-001`. Keep any invitation/contact list outside this repository in an appropriately protected system.
- Use entirely fictional scenarios. Summarize only the minimum facts needed to reproduce a problem.
- Do not paste authentication callback URLs or screenshots showing private account information. For authentication reports, record only approximate UTC time, browser, route, and the sanitized Debrief reference code.
- Security or privacy concerns must be handled privately under `SECURITY.md`; this register should contain only a sanitized tracking summary.

## Status and category values

Use exactly one status and one primary category per canonical record.

| Field | Allowed values |
|---|---|
| Status | `New`, `Needs reproduction`, `Triaged`, `In progress`, `Ready to verify`, `Blocked`, `Resolved`, `Deferred`, `Not reproducible` |
| Category | `Bug`, `Usability`, `Missing feature`, `Content error`, `Accessibility`, `Security/privacy`, `Future idea` |
| Severity | `Blocker`, `Critical`, `High`, `Medium`, `Low` |

## Severity rules

Choose severity from user impact, exposure, and available workaround—not how difficult the fix appears.

| Severity | Definition | Required response |
|---|---|---|
| **Blocker** | The controlled Alpha cannot safely continue, real/sensitive information may be exposed, ownership boundaries fail, data is corrupted/lost, or most testers cannot complete the core workflow with no safe workaround. | Stop the affected test or feature immediately. Record the item before doing planned feature work. Resume only after correction and verification. |
| **Critical** | A core workflow or security/privacy control fails for multiple users, but the Alpha can be safely contained or a limited workaround exists. | Triage the same day. Pause conflicting feature work. Assign an owner and target before the next test session. |
| **High** | A user cannot complete an important step, receives materially misleading guidance, or repeatedly encounters a failure; a safe workaround exists. | Triage within one business day and prioritize before unrelated major features. |
| **Medium** | The workflow remains usable, but the issue causes confusion, rework, accessibility friction, or an isolated incorrect result. | Triage at the next Monday/Thursday review and schedule against current priorities. |
| **Low** | Cosmetic, wording, polish, or future optimization with little effect on completion or confidence. | Triage during routine backlog grooming. |

When uncertain between two levels, use the higher level until reproduction clarifies the impact. Any suspected unauthorized access, cross-user access, real-data exposure, credential exposure, or unsafe legal/medical representation is at least **Critical** and must also follow `SECURITY.md`.

## Triage cadence and operating rules

1. **On receipt:** sanitize the report, assign the next `AF-####` identifier, check for duplicates, and set status to `New`.
2. **Urgent screen:** assess Blocker/Critical indicators immediately. Stop the affected test when the Blocker definition is met.
3. **Routine review:** review the register every Monday and Thursday while the Alpha is active, plus before inviting a new tester or beginning a major feature.
4. **Reproduce:** record the smallest fictional-data reproduction, environment, expected behavior, and observed behavior. Change status to `Needs reproduction` when evidence is insufficient.
5. **Classify:** select one primary category, severity, owner, and next action. Product symptoms are not automatically bugs; use `Usability` when the system behaves as designed but users cannot understand the next step.
6. **Deduplicate:** keep the earliest or clearest report as canonical. Mark later reports `Resolved` with `Duplicate of AF-####`; add the additional affected context to the canonical record without identifying the tester.
7. **Prioritize:** resolve open Blocker and Critical items before unrelated major feature development. High issues come before unrelated P2/P3 work.
8. **Verify:** a person or test other than the implementation itself must confirm the acceptance check when practical. Add a regression test for repeatable defects.
9. **Close:** use `Resolved` only when evidence is linked or described, the production disposition is known, and follow-up documentation/backlog work is recorded.
10. **Review trends:** at the end of each feedback cycle, count reports by workflow stage, category, severity, and status. Do not create analytics from sensitive narrative content.

## Canonical register

| ID | Received | Tester | Category | Severity | Workflow stage | Environment | Fictional scenario | Summary | Status | Owner | Duplicate of | Resolution/evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AF-0001 | 2026-07-19 | T-UNASSIGNED | Usability | High | Public access | Production; browser unknown | Not applicable | A protected Vercel deployment alias was shared, so a visitor reached Vercel access rather than the Debrief splash page. | Resolved | Product/Engineering | — | Canonical URL independently returned `200`; protected aliases returned Vercel SSO redirects. README and tester-link guidance identify `https://debriefclaims.com` as the only public Alpha address. Follow-up automation: `TEST-006`. |
| AF-0002 | 2026-07-20 | T-UNASSIGNED | Missing feature | High | Claim Builder — Claim details | Production; multiple users; device/browser not reported | Not applicable | The claim process did not ask whether the user had submitted an intent to file, risking omission of an important filing-timeline checkpoint. | Ready to verify | Product/Engineering | — | Added required status selection, optional date, official VA guidance, readiness/PDF retention, and three regression checks. Production verification remains after deployment. |

## Detailed records

### AF-0001 — Protected deployment link shared with a tester

- **Received:** July 19, 2026
- **Tester code:** `T-UNASSIGNED`
- **Category:** Usability
- **Severity:** High
- **Status:** Resolved
- **Owner:** Product/Engineering
- **Workflow stage:** Public access
- **Device/browser:** Unknown
- **Fictional scenario:** Not applicable
- **Expected:** The shared Alpha address opens the Debrief splash page without requiring a Vercel account.
- **Observed:** The visitor reached Vercel's protected-deployment access flow and believed Vercel had to be downloaded.
- **Reproduction:** Open a generated deployment or branch alias while signed out of Vercel.
- **Cause:** Protected Vercel aliases were available alongside the canonical public production domain. The access gate runs before Debrief middleware, so the application cannot redirect those protected requests.
- **Resolution:** Share only `https://debriefclaims.com`. The canonical address was independently verified as public; generated deployment and branch aliases remain non-public infrastructure addresses.
- **Verification:** Anonymous request to the canonical origin returned the Debrief application with HTTP `200`. Anonymous requests to generated aliases redirected to Vercel SSO.
- **Regression/follow-up:** Complete `TEST-006` and `OPS-012` in `docs/product-backlog.md` so release checks and tester communications reject protected aliases.
- **Sensitive information recorded:** No.

### AF-0002 — Intent-to-file checkpoint missing from claim preparation

- **Received:** July 20, 2026
- **Tester code:** T-UNASSIGNED; reported as feedback from multiple users
- **Category:** Missing feature
- **Severity:** High
- **Status:** Ready to verify
- **Owner:** Product/Engineering
- **Workflow stage:** Claim Builder — Claim details
- **Device/browser:** Not reported
- **Fictional scenario:** Not applicable
- **Expected:** The claim-preparation process asks whether an intent to file for disability compensation was submitted or an eligible online claim was started, and records a known date.
- **Observed:** No intent-to-file checkpoint appeared in the process.
- **Reproduction:** Start a fictional claim, choose a condition and claim path, and continue to Claim details; the prior release moved directly to condition-specific facts.
- **Frequency/scope:** Every claim flow; multiple users reported the omission.
- **Workaround:** Leave Debrief and independently review the VA intent-to-file process.
- **Decision/next action:** Add one required status choice with Yes, eligible online-started, No, and Not sure paths; keep the date optional; link official VA guidance.
- **Resolution:** Implemented in source. The answer is saved with the condition workspace, shown during readiness review, and retained in the condition-review PDF. Wording describes only a potential effective date and does not guarantee retroactive payment.
- **Verification:** Type checking, the full production build, the 40-scenario evaluation, and three new intent-to-file regression checks passed. Production UI verification remains after deployment.
- **Regression/follow-up:** `tests/claim-process.test.mjs` and the July 20 public changelog entry.
- **Duplicate of:** Not a duplicate.
- **Sensitive information recorded:** No.

## New feedback intake template

Copy this section below **Detailed records**, complete it with fictional/minimal information, and add a one-line entry to the canonical register. Do not replace the instructions in this file with report content.

```markdown
### AF-#### — Short, user-centered summary

- **Received:** YYYY-MM-DD
- **Tester code:** T-### or T-UNASSIGNED
- **Category:** Bug | Usability | Missing feature | Content error | Accessibility | Security/privacy | Future idea
- **Severity:** Blocker | Critical | High | Medium | Low
- **Status:** New | Needs reproduction | Triaged | In progress | Ready to verify | Blocked | Resolved | Deferred | Not reproducible
- **Owner:** Unassigned or role/name
- **Workflow stage:** Splash | Login | Dashboard | Workspace | Upload | Claim Builder section | Review | Package | Export | Account/deletion | Conditions | Forms | Other
- **Device/browser:** Minimum non-identifying detail needed to reproduce
- **Fictional scenario:** Scenario ID/name, or Not applicable
- **Expected:** What the tester reasonably expected
- **Observed:** What happened, without sensitive narrative content
- **Reproduction:** Numbered minimal steps using fictional data
- **Frequency/scope:** Once | Intermittent | Every time; one tester or multiple tester codes
- **Workaround:** Safe workaround or None
- **Decision/next action:** What will happen next and why
- **Resolution:** Implementation or content change, or Not resolved
- **Verification:** Test result, reviewer, deployment/release, or Not verified
- **Regression/follow-up:** Test/backlog/changelog link, or None
- **Duplicate of:** AF-#### or Not a duplicate
- **Sensitive information recorded:** Must be No; sanitize before saving
```

## Routine triage checklist

- [ ] All new reports have an ID and canonical register row.
- [ ] Report text is sanitized and contains fictional/minimal information only.
- [ ] Blocker and Critical indicators were assessed immediately.
- [ ] Category, severity, workflow stage, owner, and next action are present.
- [ ] Potential duplicates were searched and linked to one canonical record.
- [ ] Open Blocker/Critical items are scheduled before unrelated feature work.
- [ ] Items marked Ready to verify have explicit acceptance checks.
- [ ] Resolved items contain verification and regression/follow-up evidence.
- [ ] User-facing fixes are recorded in the changelog when released.
- [ ] The `Last triaged` and `Next routine triage` dates at the top are current.

## Current triage summary

| Measure | Count |
|---|---:|
| Total canonical reports | 2 |
| Open Blocker | 0 |
| Open Critical | 0 |
| Open High | 1 |
| Open Medium | 0 |
| Open Low | 0 |
| Resolved | 1 |

The summary is a convenience view. The canonical register and detailed records control if a count becomes stale.
