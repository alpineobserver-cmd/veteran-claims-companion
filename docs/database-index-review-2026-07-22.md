# Supabase foreign-key index review

**Project:** Debrief Staging (`zfzznrxjqiqpnghidkvd`)

**Review date:** July 22, 2026

**Scope:** 13 `unindexed_foreign_keys` recommendations from the Supabase performance advisor.

## Decision

All 13 recommendations map to an application query, nested account export, reverse relationship join, or referential cleanup path. The migration adds indexes with the foreign-key column first; user-scoped collections that are also ordered use a compound index matching their actual filter and order.

| Foreign key | Application evidence | Index decision |
|---|---|---|
| `Account.userId` | Auth/account export and user cascade cleanup | Add `userId` |
| `Answer.questionId` | Account export joins each saved answer to its question | Add `questionId` |
| `AuditEvent.documentId` | Document relationship and `SET NULL` cleanup | Add `documentId, createdAt` |
| `Claim.userId` | Dashboard, intake, package, workspace list and active-count queries | Add `userId, status, updatedAt` |
| `ClaimCondition.conditionId` | Reverse condition relationship and condition maintenance | Add `conditionId` |
| `Evidence.claimId` | Claim/account export evidence collection ordered by creation | Add `claimId, createdAt` |
| `Evidence.evidenceTypeId` | Evidence-to-type join in account export | Add `evidenceTypeId` |
| `Session.userId` | Auth session lifecycle, account export, and cascade cleanup | Add `userId` |
| `Statement.claimId` | Claim relationship and `SET NULL` cleanup | Add `claimId` |
| `Statement.templateId` | Template relationship and `SET NULL` cleanup | Add `templateId` |
| `Statement.userId` | Account statement export ordered by creation | Add `userId, createdAt` |
| `Upload.evidenceId` | Evidence upload relationship and `SET NULL` cleanup | Add `evidenceId` |
| `Upload.userId` | Account deletion and export ordered by creation | Add `userId, createdAt` |

The separate informational recommendation that `VerificationToken` lacks a primary key is not part of the 13 findings and was not changed. Its composite uniqueness follows the Auth.js adapter schema; changing it without adapter evidence would add migration risk without supporting an application query.

## Before plans

Plans were captured against Staging using `EXPLAIN` without `ANALYZE` and the fabricated identifier `__debrief_plan_probe__`; no application rows or claimant content were read.

- Claim dashboard lookup: sequential scan plus sort, estimated total cost `13.46`.
- Statement account export: sequential scan plus sort, estimated total cost `14.27`.
- Upload account deletion/export: sequential scan plus sort, estimated total cost `13.77`.
- Evidence collection/type join: sequential scan on Evidence plus indexed type lookup and sort, estimated total cost `18.53`.
- Answer collection already used the compound unique index for its `claimId` filter and the Question primary key for its join; the new reverse `questionId` index supports question-side relationship checks rather than this forward lookup.

The Alpha tables are deliberately tiny, so PostgreSQL may continue to choose a sequential scan after indexes are present. That is expected and not a failure. Post-deployment verification must confirm the 13 advisor notices disappear, inspect index definitions, and record new plans; forcing the planner is permitted only to demonstrate index eligibility, not to claim production speedup.

Supabase remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
