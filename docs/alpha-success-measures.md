# Debrief Alpha success measures

Last reviewed: July 19, 2026  
Scope: controlled Alpha using fictional information only

## Purpose

These measures answer whether a tester can move from the Debrief introduction to a usable fictional personal-statement draft and understand the next step. They are product-quality measures, not evidence that a VA claim is valid or likely to succeed.

Use neutral session codes and structured values only. Do not collect questionnaire answers, medical details, Google account information, document names, callback URLs, or free-text tester comments in the measurement file. Qualitative feedback belongs in the sanitized `docs/alpha-feedback-register.md`.

## Measures and definitions

| Measure | Numerator | Denominator | Collection point | Initial Alpha target |
|---|---|---|---|---|
| Claim-workflow completion | Sessions reaching the completed package/review outcome | Sessions that started Claim Builder | Session scorecard | At least 80% |
| Usable statement rate | Sessions where the tester says the draft is usable after editing | Sessions that started Claim Builder | Post-test survey | At least 80% |
| Abandonment stage | Incomplete sessions ending at each defined stage | Incomplete sessions that started Claim Builder | Observer/session scorecard | No stage causes repeated abandonment in two or more sessions without a triaged feedback item |
| Time to usable statement | Minutes from first Claim Builder question to first tester-approved usable draft | Sessions producing a usable draft | Moderator timer or tester estimate | Median 30 minutes or less |
| Save/resume success | Successful save-and-resume attempts | Sessions that attempted save/resume | Test task and scorecard | At least 90% |
| Export success | Successful export attempts | Sessions that attempted export | Test task and scorecard | At least 95% |
| User confidence | Answer to “I understand what I should do next with this fictional claim package” | Sessions answering the post-test question | Post-test survey, 1–5 scale | Average at least 4.0/5 after the test |
| Safety blockers | Open Blocker/Critical privacy, security, cross-user, or materially misleading-output reports | All sessions | Feedback register | Zero open before inviting the next cohort |

Targets are provisional product goals for a small Alpha, not statistical guarantees. Always report the numerator and denominator beside a percentage. Revisit targets after the first five completed sessions rather than weakening a target solely to make results appear successful.

## Workflow stages

Use one terminal stage per session: `splash`, `login`, `dashboard`, `workspace`, `upload`, `claim-builder`, `review`, `package`, `export`, `account-deletion`, or `completed`.

A session **starts Claim Builder** when the tester opens a fresh claim and reaches the first questionnaire section. A session **completes the claim workflow** when the tester reaches the final package/review outcome and can identify the next action. Merely saving a draft is not completion.

A statement is **usable** only when the tester says it accurately represents the fictional scenario after any edits and would be suitable for their intended fictional review. The moderator does not decide usability for the tester.

## Privacy-safe session scorecard

Store structured results in `evals/alpha-session-results.json`. The summarizer rejects unknown fields so free text and sensitive narrative are not accidentally added.

Use the next sequential session ID and a neutral tester code. Example values below are illustrative only and should not be copied as a result:

```json
{
  "sessionId": "AS-0001",
  "testerCode": "T-001",
  "date": "2026-07-20",
  "moderated": true,
  "device": "desktop",
  "browser": "Chrome",
  "startedClaimBuilder": true,
  "terminalStage": "completed",
  "completedClaimWorkflow": true,
  "producedUsableStatement": true,
  "minutesToUsableStatement": 24,
  "attemptedSaveResume": true,
  "saveResumeSucceeded": true,
  "attemptedExport": true,
  "exportSucceeded": true,
  "confidenceBefore": 2,
  "confidenceAfter": 4,
  "feedbackIds": ["AF-0002"]
}
```

Run `npm run eval:alpha` to validate the schema and report completion, usable-statement rate, abandonment stages, median time, save/resume success, export success, and confidence. With no sessions recorded, it correctly reports that the human baseline is pending.

## Baselines

### Technical workflow baseline

The existing deterministic evaluation provides a pre-user technical baseline:

- 40 fictional scenarios evaluated
- 40/40 passing
- 33 draft-ready scenarios
- 7 intentionally paused for missing or conflicting information
- 0 unsupported medical conclusions reaching a draft
- 99.9/100 average workflow score

This does not substitute for human usability results.

### Human Alpha baseline

Status: **Pending tester sessions**.

Create the first human baseline after at least five completed or legitimately abandoned sessions. Do not exclude a session because the tester struggled or stopped. Label outages, moderator errors, and sessions that never started Claim Builder, and explain exclusions without identifying the tester.

## Review cadence

- Update the scorecard after each session.
- Run the summary during the Monday/Thursday feedback triage.
- Create an `AF-####` item for every repeated abandonment stage, failed save/resume, failed export, confidence score of 1–2, or safety concern.
- Compare results by cohort only when the group is large enough to avoid identifying an individual.
- Record milestone results in release notes; do not publish raw session rows.
