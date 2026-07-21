# Debrief 90-persona usability simulation — July 21, 2026

Scope: fictional-data closed Alpha and Staging workflow

## Decision boundary

This is a reproducible modeled-persona evaluation, not a study involving 90 human participants. It identifies design hypotheses and regression risks; it does not prove how people of any age will behave. Age is not treated as ability. The three cohorts intentionally pair the age ranges and technology-fluency levels requested for this test, while scenario difficulty is balanced across cohorts.

The highest-risk findings must still be validated in moderated sessions with people representing all three fluency levels before TEST-007 is complete.

## Study design

- 90 neutral fictional personas: 30 mid-20s/high fluency, 30 mid-40s/moderate fluency, and 30 mid-60s/low fluency.
- Each cohort contains 10 mobile, 10 tablet, and 10 desktop runs.
- Each cohort receives all four claim-path situations: original, increased-rating, secondary, and not sure.
- Evidence situations are balanced among no records, available records, and mixed/pending records.
- Information states are balanced among complete information, one missing fact, and uncertain information.
- The seeded simulation is deterministic. The same source and test inputs produce the same 90 traces.
- Signals include unaided start, completion, mistake recovery, help requests, backtracking, incorrect selections, save/resume, statement completion, understanding the next action, and confidence.

Run with `npm run eval:usability`. The release gate runs the balance, determinism, and friction-regression tests through `npm run test:usability`.

## Low-barrier thresholds

| Measure | Threshold |
|---|---:|
| Unaided start | At least 90% in each cohort |
| Workflow completion | At least 80% in each cohort |
| Recovery after a modeled mistake | At least 85% in each cohort |
| Save/resume success | At least 90% in each cohort |
| Statement completion | At least 80% in each cohort |
| Understands the next action | At least 80% in each cohort |
| Average confidence after the flow | At least 4.0/5 in each cohort |

These are provisional design targets, not statistically validated human-performance claims.

## Baseline findings

The first run represented the Phase 2 interface before the usability corrections in this cycle.

| Cohort | Unaided start | Completion | Mistake recovery | Save/resume | Statement complete | Knows next action | Confidence | Help | Backtracks | Wrong selections |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Mid-20s / high | 93.3% | 96.7% | 90.9% | 90.0% | 80.0% | 96.7% | 3.93/5 | 21 | 19 | 11 |
| Mid-40s / moderate | 100.0% | 96.7% | 76.5% | 95.0% | 83.3% | 76.7% | 3.73/5 | 27 | 28 | 24 |
| Mid-60s / low | 83.3% | 86.7% | 72.2% | 95.0% | 73.3% | 66.7% | 3.57/5 | 27 | 28 | 23 |

Repeated modeled barriers were hidden section names on smaller screens, an icon-only mobile Save control, optional steps that appeared required, a dense review page, fact-to-source terminology, very small package text, and uncertainty about prepared/exported/submitted statuses.

## Changes implemented

1. Added a short “Before you begin” orientation explaining one-condition workspaces, saving, optional sections, approximate dates, and targeted missing-information follow-ups.
2. Kept questionnaire section names visible on mobile and tablet.
3. Kept the Save label visible on mobile instead of relying on an icon.
4. Changed empty optional-step actions to “Skip for now” and made later actions describe their destination.
5. Marked the timeline as optional and explained the suggestion and skip choices.
6. Replaced fact-to-source terminology with plain-language evidence prompts.
7. Kept safety and conflict checks visible while placing optional improvements and evidence details in a disclosure layer.
8. Added direct “Answer now” recovery controls for missing required facts.
9. Added plain-language explanations for each package tracking status.
10. Increased the smallest claim-package instructions and status text.
11. Added one prioritized next action near the top of the claim package.
12. Stopped marking Documents as complete when no file was uploaded and labeled the step optional instead.

## Post-change result

| Cohort | Unaided start | Completion | Mistake recovery | Save/resume | Statement complete | Knows next action | Confidence | Help | Backtracks | Wrong selections |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Mid-20s / high | 100.0% | 100.0% | 100.0% | 95.0% | 83.3% | 100.0% | 4.43/5 | 15 | 12 | 10 |
| Mid-40s / moderate | 100.0% | 100.0% | 100.0% | 100.0% | 86.7% | 93.3% | 4.33/5 | 18 | 20 | 13 |
| Mid-60s / low | 100.0% | 96.7% | 80.0% | 95.0% | 83.3% | 90.0% | 4.27/5 | 15 | 14 | 14 |

All modeled cohort thresholds pass except mistake recovery in the low-fluency cohort, which improved from 72.2% to 80.0% but remains below the 85% target. It must remain an open validation item.

## Remaining hypotheses for human testing

### P1 — Recovery after a mistake

Test whether lower-fluency participants notice and successfully use the section names and “Answer now” controls. Observe whether they return to the correct section without moderator help. Do not close TEST-007 until this reaches the threshold in human testing or a further corrective design is accepted.

### P1 — Necessary verification friction

The separate confirmation for each statement section remains a repeated modeled hesitation point. This protects against unreviewed text, so it should not be removed solely to improve speed. Test whether a short explanation or a guided confirmation sequence makes the safety requirement easier to understand.

### P1 — Missing-information interruption

Moderate-fluency personas most often hesitated when the statement generator requested missing facts. Human testing should confirm that the interruption feels like useful error prevention rather than a failure or forced restart.

### P2 — Workspace vocabulary

Some traces still required extra interpretation at workspace creation. Ask human participants what they believe “workspace,” “condition,” and “claim package” mean before they proceed.

## Verification evidence

- `npm run eval:usability` — 90 balanced deterministic traces produced.
- `npm run test:usability` — cohort balance, scenario/device balance, determinism, and lower-fluency friction regression passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.
- Local live-browser verification remains pending because this workspace does not permit binding a localhost port. Complete the browser pass after deployment to Staging.
