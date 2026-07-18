# Debrief fictional claim evaluation

Evaluation date: 2026-07-18  
Data classification: entirely fictional test data  
Mode: deterministic claim workflow and guided narrative; no network or paid-model calls

## Executive result

- Scenarios: 40
- Draft-ready scenarios: 33
- Intentionally paused scenarios: 7
- Passing scenarios: 40/40
- Average workflow score: 99.9/100
- Unsupported medical conclusions reaching a draft: 0
- Drafts with known questionnaire-style transitions: 0/33
- Contradiction probes correctly paused: 2/2
- Cross-claim isolation probe: passed
- Legacy evidence-map conversion: passed

The only score deduction is intentional: one tinnitus scenario has fewer than three relevant facts linked to supporting information, and the readiness review correctly identifies that evidence gap.

## Scenario coverage

The 40 fictional cases cover:

- Original, increased-rating, secondary, and uncertain claim paths
- Migraines, PTSD, tinnitus, orthopedic, digestive, respiratory, hearing, skin, neurological, sleep, and multi-symptom conditions
- Missing service facts, missing onset, missing worsening dates, missing secondary relationships, and sparse intake
- Unsupported causal language and clearly clinician-attributed medical opinions
- Conflicting symptom-onset years and conflicting current frequency estimates
- Approximate dates, uncertain memory, TBI-related memory limitations, and witness observations
- No formal diagnosis, no current treatment, and long gaps in care
- Intermittent symptoms, flare-ups, bilateral symptoms, and overlapping functional effects
- Sensitive mental-health narratives without unnecessary graphic details
- Work effects without invented unemployability or financial conclusions
- Previously denied issues where the veteran has not selected a next claim or review path
- Detailed responses, duplicate-risk timeline facts, structured evidence statuses, pending records, legacy evidence-map conversion, evidence gaps, and cross-claim isolation

## Baseline findings and corrections

The original 18-scenario baseline found that an unsupported secondary-causation statement could reach the free template and that 12 of 13 drafts used repeated questionnaire-style transitions. Those issues led to expanded medical-language checks, blocking factual follow-ups, relevant evidence-map checks, and a rebuilt chronological guided narrative.

The first 40-scenario run passed 38 of 40 cases. Both failures came from the same defect: selecting `Not sure yet` produced the phrase “my not sure yet” in the opening sentence. The neutral-path composer now calls it a claim without selecting a theory on the veteran's behalf.

Manual review of representative drafts also produced grammar improvements for military-role articles, uncertain onset descriptions, diagnosis sentences, symptom duration, and clinician-attributed opinions.

## Production behavior added

1. If the onset field and service description provide different explicit years for when symptoms began, drafting pauses and asks which year is the best estimate.
2. If current-frequency answers differ materially across the symptom and condition-specific fields, drafting pauses and asks for one current estimate.
3. Approximate dates and explicit statements of uncertain memory are preserved.
4. Clearly clinician-attributed causal opinions may be included for review; unsupported causal conclusions remain blocked.
5. `Not sure yet` produces a neutral statement and does not invent a claim path.
6. Timeline facts already represented elsewhere are suppressed, while unique approximate timeline facts remain available to the narrative.
7. The regression command fails if a scenario fails, unsafe wording reaches a draft, a known questionnaire transition returns, a contradiction probe drafts, or cross-claim leakage appears.
8. Evidence readiness distinguishes available records, personal recollection, witness evidence, records identified but not obtained, and no identified support.
9. Pending records remain visible in the readiness review but do not count as available evidence or identified support.

## Remaining limitations

These are deterministic checks, not language understanding. They detect selected high-confidence contradictions but cannot reliably reconcile every inconsistency, judge credibility, determine materiality, or decide which evidence proves a claim element. A human must review every sentence and compare the draft with the source records.

When AI drafting is enabled, the same 40 scenarios should be used as the minimum release gate. AI output should additionally be reviewed for invented facts, changes to uncertainty, omitted material facts, unsupported medical or legal conclusions, inappropriate sensitivity handling, and cross-condition leakage.

These results test software behavior only. They do not determine whether any claim is valid, service connected, compensable, or likely to receive a particular rating.
