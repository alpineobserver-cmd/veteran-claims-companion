# Debrief fictional claim evaluation

Evaluation date: 2026-07-18  
Data classification: entirely fictional test data  
Mode: deterministic claim workflow and guided-template baseline; no paid model calls

## Coverage

The suite contains 18 fictional veteran scenarios spanning:

- Original claims: migraines, PTSD, tinnitus, asthma, hearing loss, IBS, and a shoulder claim missing service facts
- Increased-rating claims: knee, migraines, PTSD, scar, and sinusitis with a missing worsening date
- Secondary claims: sleep apnea, leg radicular symptoms, GERD, hypertension with unsafe causal wording, and a claim missing its primary condition and observed relationship
- An intentionally sparse, uncertain-path claim
- Complete and incomplete fact-to-evidence mapping

## Baseline result before the safety correction

- 17 of 18 scenarios passed
- Average workflow score: 90/100
- All four factually incomplete cases were correctly paused for the expected targeted questions
- One unsupported medical conclusion was repeated into the guided template
- 12 of 14 generated templates used at least five questionnaire-style transitions

The failure occurred when a secondary-claim answer said that one condition "proves" another condition was caused by it. The existing check did not inspect the secondary-relationship field, so the template repeated the conclusion.

## Result after safety and evidence corrections

- 18 of 18 scenarios passed
- Average workflow score: 93/100
- 13 scenarios were correctly considered draft-ready
- Five scenarios were correctly paused, including the unsafe-causal-wording case
- Zero unsupported causal conclusions reached a generated template
- The incomplete tinnitus evidence map produced an evidence-readiness finding
- 12 of 13 guided templates still used at least five questionnaire-style transitions

## Result after rebuilding the free generator

- 18 of 18 scenarios passed
- Average workflow score: 99.7/100; the only deduction was the intentionally incomplete tinnitus evidence map
- Zero unsafe causal conclusions reached a draft
- Zero of 13 generated statements used a known questionnaire-style transition
- Required scenario facts remained present
- Drafts were organized into a short opening, chronological history, current medical and symptom information, functional impact with a concrete example, and treatment
- Timeline details already represented in the answers were suppressed to reduce semantic repetition
- Known awkward deterministic constructions were added to the regression checks

## Changes made from the findings

1. Expanded possible medical-conclusion detection across all narrative claim fields.
2. Added a blocking follow-up when causal wording is unsupported, while allowing clearly clinician-attributed conclusions to proceed for user review.
3. Corrected evidence coverage so only links relevant to the current claim path count toward readiness.
4. Added a repeatable `npm run eval:claims` command that exits unsuccessfully if a scenario fails or unsafe wording reaches a draft.
5. Extracted the production guided-template generator so the application and evaluation suite exercise the same code.
6. Replaced one-paragraph-per-answer assembly with grouped chronological composition.
7. Added deterministic handling for onset wording, frequency, duration, medical information, treatment, and duplicate timeline facts.

## Product feedback

The layered question routing is working as intended in these fixtures: incomplete claims receive one or two focused questions and no draft. The free guided narrative is now substantially more readable while remaining deterministic and transparent. It should still be treated as a draft for sentence-by-sentence human review: fixed rules cannot understand meaning, reconcile contradictions, determine which facts are most important, or safely perform the deeper rewriting a generative model can provide.

When paid generative drafting is eventually enabled, run the same 18 cases through the model and compare it with this baseline. Release criteria should include:

- No invented diagnoses, dates, symptoms, frequency, severity, clinician opinions, or service events
- No unsupported causal or medical conclusions
- Retention of all important supplied facts and expressions of uncertainty
- Clear chronology and natural paragraph flow without questionnaire labels
- Targeted follow-up questions instead of guessing when facts are missing
- Human review and sentence-level confirmation before download or use

These results test software behavior, not whether a claim is valid, service connected, compensable, or likely to receive a particular rating.
