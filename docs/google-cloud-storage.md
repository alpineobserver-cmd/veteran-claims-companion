# Google Cloud Storage activation and migration

Status: Application adapter and isolated Staging resources are configured for fictional validation. Staging uploads remain paused until the end-to-end upload, download, and verified-delete smoke test is completed. Real medical or claimant information remains prohibited.

## Staging resource record

Created July 22, 2026:

- Google Cloud project: `debrief-staging-storage` (`928631666085`)
- Regional bucket: `debrief-staging-documents-928631666085` in `us-east4`
- Bucket controls: uniform bucket-level access and public-access prevention enforced; Google-managed encryption; seven-day soft delete; no retention lock
- Runtime service account: `debrief-storage-runtime@debrief-staging-storage.iam.gserviceaccount.com`
- Workload identity pool/provider: `vercel-staging` / `vercel`
- Trusted subject: only `owner:veteran-claims:project:debrief-staging:environment:production`
- Runtime access: `roles/storage.objectUser` on this bucket only; no project-wide role and no user-managed service-account key
- Vercel project: `veteran-claims/debrief-staging`, Production environment only

The Staging Vercel variables are present and `DOCUMENT_STORAGE_PROVIDER=gcs`. `DEBRIEF_UPLOADS_ENABLED=false` is the current safety state pending the fictional smoke test. These resources do not authorize Production or real records.

## Architecture

Debrief uses Google Cloud Storage as a server-only private object store. Browser clients never receive bucket credentials or public object URLs. The existing Auth.js session, owner-scoped database lookup, 60-second application download ticket, file inspection, quotas, deletion verification, and reconciliation controls remain in front of every object operation.

Vercel and Google authenticate through Workload Identity Federation. Vercel supplies a short-lived OIDC token at request time; Google exchanges it for a short-lived service-account access token. Debrief does not support a pasted service-account private key.

## Required Google Cloud resources

Create these independently for Staging and Production:

1. A Google Cloud project with billing and the Cloud Storage, Security Token Service, and IAM Service Account Credentials APIs enabled.
2. A regional private bucket. Choose the region through the approved data-residency review; do not use a public website bucket.
3. Uniform bucket-level access and public-access prevention enforced on the bucket.
4. A dedicated service account with object read, create, and delete permissions only on that bucket. Do not grant project Owner, Editor, or Storage Admin to the runtime identity.
5. A dedicated Workload Identity Pool and OIDC provider that trusts the matching Vercel team issuer.
6. Attribute conditions restricted to the exact Vercel team, project, and `production` environment used by the stable Staging or Production project. Do not grant the entire pool without an environment restriction.
7. Permission for the restricted Vercel principal to impersonate only the dedicated storage service account.
8. Data Access audit logs, alert routing, lifecycle/retention, soft-delete, versioning, encryption/key-management, and administrator-access settings approved and recorded without secret values.

Google's setup identifiers are configuration, not user credentials. Store them only in the matching Vercel project's Production environment:

```text
DOCUMENT_STORAGE_PROVIDER=gcs
GCS_AUTH_MODE=vercel-oidc
GCS_BUCKET=<matching private bucket name>
GCP_PROJECT_ID=<matching project id>
GCP_PROJECT_NUMBER=<matching project number>
GCP_SERVICE_ACCOUNT_EMAIL=<dedicated runtime service account>
GCP_WORKLOAD_IDENTITY_POOL_ID=<matching pool id>
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=<matching provider id>
```

Do not add `GCP_PRIVATE_KEY`, a service-account JSON key, or `GOOGLE_APPLICATION_CREDENTIALS` to Vercel. Local integration checks may use Application Default Credentials obtained through the operator's Google CLI session; local application storage remains the default for ordinary development.

## Activation sequence

1. Keep `DEBRIEF_UPLOADS_ENABLED=false` while changing the backend.
2. Create and review the Staging resources above.
3. Add the eight configuration values to the stable Staging project's Production scope only, then redeploy.
4. Confirm the environment validation and migration jobs pass.
5. With a fictional account and fixture, upload, list, request a download ticket, download, delete, and verify absence. Run the two-user isolation check and confirm the second account cannot access the object.
6. Confirm a document created before the switch still downloads from and deletes out of Vercel Blob. Records carry their provider, so the application routes old and new objects separately.
7. Review Cloud Audit Logs and Debrief privacy-safe events without recording object keys, filenames, account identifiers, or contents in the release record.
8. Re-enable fictional uploads only after all checks pass. Keep the existing Vercel Blob store and credential available until every old object and reconciliation task has been migrated or deleted and the migration report is reconciled.
9. Repeat separately for Production only after Staging approval. Never reuse the Staging project, bucket, pool, provider, service account, or Vercel configuration.

## Failure and rollback

If Google authentication or object operations fail, pause uploads and restore `DOCUMENT_STORAGE_PROVIDER=vercel`, then redeploy. Do not remove the Google bucket, Vercel Blob store, database provider fields, or reconciliation tasks during rollback. Existing Google-backed records still require the Google configuration for download and verified deletion even when new uploads return to Vercel Blob.

Partial object/database failures remain in `StorageReconciliationTask` with a provider name and private object key. Those values are never logged or sent to the browser. Resolve pending tasks before removing either backend.

## Release boundary

Google Cloud Storage supports private, encrypted object storage, but activation does not authorize real records or make the whole product compliant. Malware scanning/quarantine, approved retention and backup behavior, provider contracts, legal analysis, administrator controls, incident readiness, and independent security review remain blocking requirements.

Provider references:

- https://vercel.com/docs/oidc/gcp
- https://cloud.google.com/iam/docs/workload-identity-federation
- https://cloud.google.com/storage/docs/uniform-bucket-level-access
- https://cloud.google.com/storage/docs/public-access-prevention
- https://cloud.google.com/storage/docs/lifecycle
- https://cloud.google.com/security/compliance/hipaa
