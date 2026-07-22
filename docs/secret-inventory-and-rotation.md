# Secret inventory, rotation, and emergency revocation

Owner: Product owner / Alpha administrator  
Technical custodian: Engineering  
Applies to: Local development, Debrief Staging, Debrief Production, GitHub, Google Cloud, Supabase, Vercel, Vercel Blob, and any future AI provider

Never record a secret value in this file, Git, issues, chat, screenshots, build output, test fixtures, or release records. Inventory names, owners, scopes, and verification evidence only.

## Application inventory

| Variable or credential | Classification | System of record | Allowed scope | Consumer | Rotation/revocation owner |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Secret | Supabase/Vercel | Separate values for the Staging project's Production environment and the live project's Production environment; never general Preview | Prisma server/build migrations | Alpha administrator |
| `AUTH_SECRET` | Critical secret | Vercel sensitive variable | One permanent value per Staging/Production project; never shared | Auth.js, download tickets, HMAC principals | Alpha administrator + Engineering |
| `AUTH_GOOGLE_SECRET` | Secret | Google Cloud/Vercel | Separate OAuth client per environment; Production scope only | Auth.js Google provider | Alpha administrator |
| `AUTH_GOOGLE_ID` | Identifier, not secret | Google Cloud/Vercel | Matching environment only | Auth.js Google provider | Alpha administrator |
| `BLOB_READ_WRITE_TOKEN` or integration-managed Blob credential | Secret | Vercel Blob/Vercel integration | Matching environment only; Production scope | Private document storage | Alpha administrator |
| `BLOB_STORE_ID` | Identifier, not secret | Vercel Blob | Matching environment only | Vercel integration | Alpha administrator |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Public verification material | Vercel Blob | Matching environment only | Vercel integration | Vercel/integration owner |
| Vercel OIDC token | Ephemeral workload credential; never configured manually | Vercel request/build context | Matching team, project, and environment; maximum provider-controlled lifetime | Google Workload Identity Federation | Vercel/Google |
| `OPENAI_API_KEY` | Secret; currently expected unset | OpenAI/Vercel | Server-side only; add separately only after AI approval | Personal-statement AI route | Alpha administrator |
| GitHub, Vercel, Google, Supabase, and OpenAI administrator sessions/MFA | Privileged account secret | Each provider | Named administrators only; never application environment variables | Administrative access | Product owner |

Configuration values such as `APP_ENV`, `DATA_ENVIRONMENT`, `RELEASE_ID`, `AUTH_URL`, `AUTH_CANONICAL_HOST`, `PRIVACY_CONTACT_EMAIL`, `OPENAI_MODEL`, `DOCUMENT_STORAGE_PROVIDER`, `GCS_AUTH_MODE`, `GCS_BUCKET`, `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `GCP_SERVICE_ACCOUNT_EMAIL`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`, `DEBRIEF_UPLOADS_ENABLED`, `DEBRIEF_AI_GENERATION_ENABLED`, `DEBRIEF_AI_POLICY_VERSION`, `DEBRIEF_AI_DAILY_USER_LIMIT`, `DEBRIEF_AI_DAILY_GLOBAL_LIMIT`, and `DEBRIEF_REGISTRATIONS_ENABLED` are not secrets. They still require environment review because incorrect values can weaken isolation or availability.

## Required inventory review

- [ ] Review quarterly, after any administrator change, and before a Production promotion.
- [ ] Confirm every secret is marked Sensitive in Vercel where supported and scoped only to the intended project/environment.
- [ ] Confirm Staging and Production fingerprints/resources differ without exposing their values.
- [ ] Confirm no persistent database, Blob, Google, Auth, or AI secret is available to disposable Preview deployments.
- [ ] Search Git history, build/runtime logs, issues, and documentation for accidental values; record only the result.
- [ ] Confirm provider administrators use MFA and remove accounts that no longer require access.
- [ ] Confirm `OPENAI_API_KEY` remains absent while paid AI is not approved.

Vercel documents that sensitive variables become unreadable after creation and that variable changes affect only new deployments: https://vercel.com/docs/environment-variables/sensitive-environment-variables

## Standard rotation sequence

1. Open a maintenance/incident record containing credential name, environment, reason, operator, start time, verification plan, and rollback target—never the value.
2. Pause the affected capability with the existing registration, upload, or AI kill switch when appropriate.
3. Create the replacement credential at its provider while retaining the old credential temporarily when the provider permits overlap.
4. Update only the matching Vercel project and environment; keep it Sensitive.
5. Redeploy. Environment changes do not update an existing deployment.
6. Run the focused smoke check plus `npm run test:release` against the intended release.
7. Verify database access, login/session behavior, private upload/download/deletion, and AI disabled/enabled state as applicable.
8. Revoke the old provider credential only after the replacement deployment is healthy.
9. Recheck runtime errors and provider activity, restore paused capabilities, and close the record with timestamps.

Vercel's rotation guidance also requires redeployment before invalidating the prior credential: https://vercel.com/docs/environment-variables/rotating-secrets

## Credential-specific cautions

### `AUTH_SECRET`

Rotation signs users out, invalidates in-progress OAuth checks and download tickets, and changes HMAC-derived security principals. Before a planned rotation, confirm there are no pending `StorageReconciliationTask` records or prepare a reviewed re-key/cleanup procedure. Rotate Staging and Production independently, announce the sign-in interruption, deploy, and test Google login, logout, secure download, account export, and deletion.

### `DATABASE_URL`

Supabase currently resets the database password under **Database → Settings**: https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB

A password reset may invalidate the current connection immediately. Use a maintenance window, update only the matching Vercel project, redeploy, verify `prisma migrate deploy` and application reads/writes, and confirm the other environment was unaffected.

### Google OAuth secret

Create or rotate the credential in the matching Google Cloud project, update only that environment's Vercel project, redeploy, test login/callback/logout with a fictional allowlisted account, and then disable/delete the superseded secret or client. Recheck authorized origins and redirect URIs; do not reuse the Production client in Staging.

### Private Blob credential

Rotate or reconnect it through the matching Vercel Blob integration, update only the intended project/environment, redeploy, then upload, issue a short-lived download, download, and delete a fictional file. Do not delete a Blob store as a token-rotation shortcut.

### Google Cloud workload identity

No persistent Google service-account private key is permitted. To revoke access, pause uploads, remove or restrict the matching Workload Identity Provider binding or service-account impersonation grant, inspect Google and Vercel activity, correct the trust condition, and redeploy before a fictional upload/download/delete smoke check. Treat changes to the Vercel team/project/environment subject, Google pool/provider, service account, bucket IAM, or OIDC issuer mode as a credential-boundary change. Follow `docs/google-cloud-storage.md`; keep the prior object provider available for verified deletion until migration reconciliation is complete.

### Future OpenAI key

Keep `DEBRIEF_AI_GENERATION_ENABLED=false` during rotation. Create a replacement project-scoped key with the smallest available permissions/budget, update Vercel, redeploy, run only fictional evaluation fixtures, verify daily ceilings, then revoke the old key before re-enabling AI.

## Emergency revocation checklist

- [ ] Record detection time, affected credential/environment, and minimum non-sensitive indicators.
- [ ] Immediately disable the affected capability or registrations; take the site offline only if containment requires it.
- [ ] Revoke the exposed credential at the provider. Do not wait for a routine deployment if it remains usable.
- [ ] Create a replacement, update the correct Vercel scope, and redeploy.
- [ ] For `AUTH_SECRET` exposure, rotate it, invalidate sessions, and require sign-in again.
- [ ] For database or Blob exposure, review provider activity, preserve privacy-safe evidence, and treat unauthorized access as a potential incident.
- [ ] Search source, Git history, logs, screenshots, chat, and issue trackers for the exposure path; remove public copies without destroying required incident evidence.
- [ ] Run authentication, data isolation, upload/download/deletion, export, and release checks.
- [ ] Assess incident-response and notification obligations with qualified legal/security reviewers.
- [ ] Record revocation time, replacement deployment, validation, remaining risks, and follow-up owner.

## Prohibited shortcuts

- Never paste a value into an issue, prompt, email, or screenshot for verification.
- Never use one `AUTH_SECRET`, database, Blob credential, or Google client across Staging and Production.
- Never rotate `AUTH_SECRET` during a routine redeploy.
- Never put Production persistence credentials in Preview.
- Never rely on deleting a Vercel variable alone when the credential remains valid at its provider.
- Never claim rotation succeeded until a new deployment and focused smoke test pass.
