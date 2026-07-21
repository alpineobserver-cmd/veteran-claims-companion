# Storage deletion reconciliation

Status: implemented for the fictional-data Alpha on July 21, 2026.

## Purpose

Database records and private Blob objects cannot participate in one atomic transaction. Debrief therefore performs object deletion first, verifies absence, and deletes the database record second. A durable reconciliation task is created if either side does not complete.

Tasks contain the minimum information needed to retry or diagnose cleanup: an HMAC-protected account principal, operation and route scope, internal entity reference, private storage key only when object deletion remains necessary, attempt count, sanitized error code, timestamps, and status. Browser responses never expose these tasks or storage keys. Account export includes only safe task metadata.

## Covered paths

- Upload rollback after an object was stored but its database transaction failed
- Individual document deletion
- Workspace deletion across all current documents and orphaned upload rollbacks
- Whole-account deletion across current documents, legacy uploads, and orphaned upload rollbacks

Upload rollback tasks are retried opportunistically during the user's next accepted upload. Document, workspace, and account tasks are retried by repeating the requested deletion. A successful document/workspace retry resolves matching tasks; successful account deletion removes its user-linked tasks in the same database transaction.

## Alert events

The application emits structured `storage_reconciliation_pending`, `storage_reconciliation_retry_failed`, `storage_reconciliation_resolution_failed`, or `storage_reconciliation_record_failed` security events. Events include timestamp, operation, scope, and sanitized error code only. They must never include account IDs, hashes, storage keys, filenames, claim IDs, document contents, or health information.

Protected event export and alert ownership remain tracked separately under SEC-010. Until that monitoring destination is approved, review Vercel runtime errors after deletion failures and before every release.

## Operator review

Use an aggregate query that does not select `storageKey`, `entityId`, or `principalHash`:

```sql
SELECT "operation", "scope", "status", COUNT(*) AS "tasks", MIN("createdAt") AS "oldest"
FROM "StorageReconciliationTask"
GROUP BY "operation", "scope", "status"
ORDER BY "status", "oldest";
```

Any pending task older than 24 hours requires investigation. Do not manually mark a task resolved until the object or database record has been verified absent. Do not copy private storage keys into tickets, email, analytics, or chat.

## Limitations

This mechanism is application reconciliation, not a provider backup-deletion guarantee. Provider backup expiry, protected monitoring, retention approval, and disaster-recovery testing remain separate blocked gates. The current workflow still accepts fictional Alpha files only.
