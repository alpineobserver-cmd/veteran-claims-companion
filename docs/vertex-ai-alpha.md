# Vertex AI fictional-data Alpha

Owner: Product owner / Alpha administrator  
Technical custodian: Engineering  
Approved scope: Personal-statement drafting in Debrief Staging with entirely fictional information

## Decision

Debrief uses Gemini through Google Vertex AI. The application calls Vertex from a server-only Next.js route through Vercel workload identity federation. It does not use an API key or a persistent Google service-account key.

The Alpha integration is intentionally narrow:

- Personal-statement drafting only.
- Questionnaire and timeline fields only; the optional display name is removed before the provider call.
- No uploaded document bytes, OCR text, buddy information, web grounding, search, tools, agents, embeddings, fine-tuning, or model training.
- Fictional Staging information only. Real personal, military, medical, claim, or witness information is prohibited.
- Every result remains an editable draft and requires section-by-section user confirmation.

## Staging Google Cloud boundary

- Project: `debrief-staging-storage` (`928631666085`).
- Runtime identity: `debrief-storage-runtime@debrief-staging-storage.iam.gserviceaccount.com`.
- API: `aiplatform.googleapis.com`.
- Custom role: `projects/debrief-staging-storage/roles/debriefVertexPredictor`.
- Custom-role permission: `aiplatform.endpoints.predict` only.
- Authentication: the existing Vercel Staging workload-identity pool and provider. No private key is permitted.

The custom role is deliberately narrower than `roles/aiplatform.user`. If the provider later requires another operation, add only its documented permission after review; do not replace this role with Owner, Editor, or a broad Vertex administrator role.

## Runtime configuration

The following non-secret values belong only to the Production environment of the **Debrief Staging** Vercel project. That Vercel project deploys the protected `staging` branch while the application identifies itself as Staging.

```text
DEBRIEF_AI_PROVIDER=vertex
DEBRIEF_AI_MODEL=gemini-3.7-flash
GOOGLE_VERTEX_LOCATION=global
DEBRIEF_AI_FICTIONAL_DATA_ONLY=true
DEBRIEF_AI_GENERATION_ENABLED=true
DEBRIEF_AI_POLICY_VERSION=personal-statement-v1
DEBRIEF_AI_DAILY_USER_LIMIT=5
DEBRIEF_AI_DAILY_GLOBAL_LIMIT=50
DEBRIEF_AI_DAILY_USER_TOKEN_LIMIT=100000
DEBRIEF_AI_DAILY_GLOBAL_TOKEN_LIMIT=500000
DEBRIEF_AI_MAX_OUTPUT_TOKENS=1600
DEBRIEF_AI_MAX_REQUEST_COST_CENTS=3
DEBRIEF_AI_DAILY_SPEND_CAP_CENTS=100
```

The existing `GCP_*` and `GCS_AUTH_MODE=vercel-oidc` values provide the keyless identity configuration. A Vercel environment-variable change does not affect a running deployment until it is redeployed.

## Request path

1. The signed-in user completes the fictional questionnaire.
2. Debrief detects essential gaps before any provider call.
3. The user explicitly confirms the fictional-data disclosure.
4. The route removes `statementName`, reserves request, token, and spend capacity, and calls Vertex.
5. Vertex returns schema-validated JSON containing a draft or up to three focused factual questions.
6. Debrief blocks unsupported medical-causation wording before returning a ready draft.
7. The user reviews, edits, versions, rejects, and confirms the draft.
8. The drafting history stores source field references, provider/model/policy metadata, status, and token counts—not source answers, generated text, names, or provider bodies.

## Fail-closed controls

- `DEBRIEF_AI_GENERATION_ENABLED=false` stops provider calls and preserves the guided template.
- An unknown provider, malformed Gemini model ID, missing Google project, incomplete workload identity, invalid policy, or absent fictional-data flag disables external generation.
- Deployment validation rejects Vertex in Production during Alpha and rejects simultaneous real-document and Vertex enablement.
- Provider errors return a generic message and privacy-safe security event.
- The route times out after 30 seconds.
- The Staging default reserves no more than three cents per request and one dollar per day. The spend reservation is deliberately conservative and is not a provider invoice parser.

## Verification

Run:

```text
npm run typecheck
npm run test:controls
npm run test:deployment
npm run eval:ai
npm run test:release
```

Before enabling a new model or policy, run fictional samples in Staging and record factual fidelity, unsupported assertions, uncertainty preservation, latency, input/output tokens, and reviewer disposition. CI must never call Vertex.

An authorized Google Cloud operator can run `npm run eval:ai:vertex-samples` to generate three live fictional drafts. This opt-in check incurs Vertex usage and is never part of the default release suite. It requires `DEBRIEF_AI_FICTIONAL_DATA_ONLY=true` and `GCP_PROJECT_ID`. The default `VERTEX_SAMPLE_AUTH_MODE=service-account` also requires `GCP_SERVICE_ACCOUNT_EMAIL` and impersonation authority. `VERTEX_SAMPLE_AUTH_MODE=operator` uses the active operator credential for model-quality review only; it does not validate the Vercel runtime identity.

## Rollback

1. Set `DEBRIEF_AI_GENERATION_ENABLED=false` in Debrief Staging.
2. Redeploy and verify `/api/ai/personal-statement` reports template mode.
3. If provider access itself must be revoked, remove the custom-role binding from the runtime service account.
4. Preserve only privacy-safe model, policy, timing, usage, status, and fictional fixture identifiers.
5. Re-enable only after focused tests, the full release gate, and product-owner review.

Real-data processing remains out of scope. Document intelligence, OCR, buddy-statement generation, and any Production enablement require separate product, privacy, legal, security, retention, and provider reviews.
