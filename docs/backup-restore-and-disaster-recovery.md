# Backup, restoration, and disaster-recovery runbook

**Boundary:** fictional Alpha data only. This runbook is not evidence that provider backups, recovery time, or deletion expiry have been approved for real medical information.

## Systems and recovery order

1. **Application release:** GitHub is the source of truth; Vercel serves the reviewed `main` or `staging` commit.
2. **Database:** Prisma migrations are the schema source of truth; Supabase PostgreSQL holds accounts, sessions, claims, statements, metadata, and object references.
3. **Private objects:** Vercel Blob holds fictional uploaded files. Database restoration does not restore Blob bytes.
4. **Configuration:** Vercel environment variables, Google OAuth clients, Supabase settings, Blob access, and canonical domains must be re-established separately and must never be copied into this repository or a recovery record.

Restore the database before reconnecting private objects, then reconcile every restored document row by its stored SHA-256 and expected private object. Never make a recovered environment public until owner isolation, Data API denial, short-lived download tickets, deletion, and fictional-data warnings pass.

## Current recovery evidence

- Every Prisma migration applies to an empty PostgreSQL 16 database in the protected release gate.
- Vercel application rollback and Staging promotion are documented and tested independently of data restoration.
- Supabase documents provider daily backups for paid plans and recommends regular off-site logical dumps for free projects. The actual Debrief plan, available restore points, region, retention, and restoration access still require administrator evidence.
- Supabase database backups do not restore external object bytes. Debrief uses Vercel Blob, so Blob recovery requires a separately approved, encrypted object-copy process and manifest.
- Vercel Blob supports authenticated list/get/put/copy operations for private stores. Debrief has not yet approved or tested a retained secondary copy, so deleted Blob bytes must currently be treated as unrecoverable.

## Incident decision

1. Open an incident record and preserve timestamps, affected environment, release identifier, and safe error codes only.
2. Stop the affected workflow using the upload, registration, or AI kill switch where applicable. If writes cannot be safely contained, take the affected environment out of tester circulation.
3. Determine the last known-good application commit, database time, and Blob manifest. Do not guess a restore point.
4. Prefer restoration to a new isolated project. In-place restoration causes downtime and removes the current state, so it requires explicit incident-commander approval and a pre-restore evidence capture.
5. Rotate credentials before connecting a recovered resource if credential exposure is possible.
6. Validate recovery using fictional fixtures before changing any canonical connection string.

## Isolated fictional restore drill

The administrator must perform this drill without using Production resources or real information:

1. Record the source project, backup type, earliest/latest available restore points, proposed recovery point, expected data loss, and expected cost.
2. Create an isolated recovery project from a provider backup or an approved encrypted logical dump. Disable external operations and do not connect its credentials to a public deployment.
3. Reapply or verify all committed Prisma migrations and confirm `prisma migrate status` is current.
4. Verify table counts and a set of disposable fictional record identifiers against the pre-drill manifest. Do not place row contents in the evidence record.
5. Confirm Supabase Data API roles still have no application-table access and server-side owner scoping still passes.
6. Restore a small, separately backed-up fictional Blob sample into an isolated private store. Match SHA-256 values and prove public access fails.
7. Connect a temporary protected Vercel project using new recovery-only credentials. Run login, save, resume, private download, export, and deletion checks with a disposable fictional account.
8. Verify deletion and storage-reconciliation behavior, record achieved recovery point and elapsed time, then destroy the isolated drill resources under the provider retention rules.

Never reuse Production OAuth, database, Blob, or authentication secrets for a drill. A restored database may contain sessions; invalidate them before allowing sign-in.

## Recovery acceptance record

Record: drill/incident ID, date, environment, approver, source backup timestamp, actual recovered timestamp, estimated and actual data loss, start/finish time, database result, Blob result, migration result, isolation result, security checks, failed steps, corrective actions, resource deletion evidence, and next drill date. Do not record credentials, object keys, filenames, emails, claim facts, or document contents.

## Required operator decisions before closure

- provider plan and verified database backup schedule/retention;
- acceptable recovery-point objective and recovery-time objective;
- encrypted off-site logical-backup location, access owners, and rotation;
- Vercel Blob secondary-copy method, retention, deletion propagation, and restore procedure;
- named incident commander and recovery approver; and
- a completed, dated isolated restore drill.

Provider references: [Supabase database backups](https://supabase.com/docs/guides/platform/backups), [Supabase restore to a new project](https://supabase.com/docs/guides/platform/clone-project), [Vercel Blob management](https://vercel.com/docs/vercel-blob/manage-blob-storage).
