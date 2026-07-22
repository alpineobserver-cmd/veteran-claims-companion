# AI evaluation, versioning, and rollback

Debrief does not need an API key to run its AI release gate. `npm run eval:ai` evaluates the free guided-draft baseline against 40 fictional claim scenarios and scores factual fidelity, completeness, uncertainty preservation, tone, readability, unsupported claims, sensitivity handling, and cross-condition isolation. No questionnaire data leaves the machine and the evaluator makes no paid provider calls.

## Release rule

Every fixture and every scored dimension must pass at 95 or higher. A future model or prompt candidate must be captured as a test adapter and run against the same fixtures before it can replace the baseline. Zero invented medical conclusions, prohibited outcome promises, or cross-claim leakage are tolerated. Evaluation output contains scenario identifiers and scores only—not claimant text.

## Version controls

- `personal-statement-v1` is the current evaluated policy.
- `personal-statement-v0` is the retained rollback policy.
- `DEBRIEF_AI_POLICY_VERSION` chooses one of those exact values. An unknown value fails deployment validation and fails closed to the local template if encountered at runtime.
- `DEBRIEF_AI_GENERATION_ENABLED=false` immediately stops external model calls while preserving saved work and the free guided draft.

The API response reports the policy version used. Change the version only in Staging, run the release suite, perform fictional drafting review, and record the decision before Production promotion.

## Rapid containment

If a generated draft invents a fact, removes uncertainty, exposes information from another claim, or otherwise fails review:

1. Set `DEBRIEF_AI_GENERATION_ENABLED=false` in the affected Vercel environment and redeploy.
2. Confirm `/api/ai/personal-statement` reports template mode and no provider call occurs.
3. Preserve only the model/policy version, timestamp, result status, and fictional evaluation identifier in the incident record. Do not copy claimant text into general logs or tickets.
4. Correct and evaluate a policy in Staging, or select `personal-statement-v0` as a temporary rollback.
5. Re-enable only after the full release gate and a documented approval.

This engineering gate does not close the provider, legal, privacy, or real-data approvals in the backlog.
