# Debrief internal threat model

Status: Internal engineering model completed July 22, 2026 for the fictional-data Alpha. It does not replace an independent penetration test, legal review, or authorization for real medical information.

## Scope and security objectives

In scope: the browser application, Next.js middleware and routes, Auth.js/Google OAuth, Prisma/PostgreSQL, private Blob storage, support intake, Vercel runtime/build logs, administrator credentials, backups, and the disabled future OpenAI path.

Primary objectives:

1. A user can access, change, export, or delete only their own account, claims, and documents.
2. Private object bytes and storage locators never become public or reusable bearer URLs.
3. Authentication, OAuth, database, Blob, download-ticket, and administrator secrets never enter browser bundles, exports, logs, or support records.
4. Claim facts, health details, filenames, and document contents are excluded from security telemetry.
5. Failed multi-system deletion cannot silently strand an object or database record.
6. Untrusted input cannot execute code, exhaust resources beyond bounded limits, or instruct a future model to invent facts.
7. Operators can contain uploads, AI, or registrations and can reconstruct a privacy-safe incident timeline.

## Assets and trust boundaries

| Asset | Main threats | Current controls |
| --- | --- | --- |
| Database session and OAuth tokens | Theft, replay, log/export leakage | Database sessions, Google-only provider, no token export/logging, HTTPS, permanent environment-specific secret |
| Claim answers and statements | Cross-account access, XSS, support/log leakage, unwanted retention | Owner-scoped routes, output escaping by React, no-store APIs, fictional-data warnings, account export/deletion |
| Private object bytes and keys | Public exposure, IDOR, malicious file, partial deletion | Private Blob, random keys, signature/parser limits, owner-bound 60-second ticket, verified deletion/reconciliation |
| Administrator credentials | Account takeover, environment crossover | Provider MFA requirement, secret inventory/rotation, separate Staging/Production resources, protected branches |
| Security and audit evidence | Sensitive-data leakage, tampering, insufficient detail | Fixed database audit actions, allowlisted structured security-event fields, release/environment labels |
| Product content and packages | Stale authority, unsafe guidance, PDF injection | Human-authored source metadata, Zod limits, PDF generation in memory, no submission automation |

Trust boundaries are: browser ↔ Vercel; Google ↔ Auth.js; Vercel ↔ Supabase direct PostgreSQL; Vercel ↔ private Blob; runtime ↔ provider logs/administrators; support page ↔ email provider; and the disabled runtime ↔ OpenAI path. See `docs/data-inventory-and-flow.md` for the field and flow inventory.

## Threat analysis

| ID | STRIDE / scenario | Existing or completed control | Residual decision |
| --- | --- | --- | --- |
| TM-01 | Spoofing: forged or stolen login/session | Google OAuth, database sessions, canonical-host enforcement, Auth.js checks, branded safe error recovery | Review provider session settings and administrator MFA evidence before real-data use |
| TM-02 | Tampering/IDOR: change another user's claim, document, statement, or account | Every private route authenticates and scopes queries by `session.user.id`; two-user database harness and cross-user ticket tests are in the release gate | Independent penetration test remains required |
| TM-03 | CSRF: authenticated mutation from a foreign origin | Same-origin validation on authenticated mutations; SameSite/secure cookie behavior supplied by Auth.js; no state change through document GET except audit recording after a valid ticket | Validate live cookie flags during each authentication review |
| TM-04 | Information disclosure: reusable or public object address | Storage credentials stay server-side; object keys are omitted from responses/exports; application ticket expires in 60 seconds and is owner/document bound | Provider region, staff access, encryption, and object-retention evidence remain blocked |
| TM-05 | Malicious document or parser exhaustion | Extension/MIME/signature agreement; PDF/JPEG/PNG structural and decoded-size limits; active PDF and polyglot rejection; quotas and request limits | Malware scanning and quarantine provider remain SEC-006 |
| TM-06 | Repudiation: no record of security-relevant actions | Fixed database audit actions plus centralized structured events with timestamp, environment, release, event, and allowlisted non-identifying details | Protected destination, access, retention, and alerts remain SEC-010 |
| TM-07 | Sensitive telemetry leakage | Central event formatter drops unknown keys and rejects unsafe values; route logs no longer interpolate errors, IDs, filenames, storage keys, or user data | External drain/export must preserve this contract and be reviewed before activation |
| TM-08 | XSS/script injection | React escaping, no raw HTML, restrictive source allowlist, blocked objects/frames/base changes, `script-src-attr 'none'`, production upgrade of insecure requests | Static App Router output still requires `script-src 'unsafe-inline'`; nonce/hash migration remains partial SEC-018 |
| TM-09 | Browser/device disclosure | Signed-out drafts use same-origin localStorage and downloads are user-controlled | LocalStorage is not approved for real claim/health data; real-data gate must require a redesigned signed-out path or account-only persistence |
| TM-10 | Denial of service and cost exhaustion | Body/file/parser limits, account/workspace/file quotas, durable per-user/global rate limits, AI budget ceilings, kill switches | Vercel firewall policy and protected alerting remain separate operational work |
| TM-11 | Partial deletion or stranded objects | Object absence is verified; durable HMAC-scoped reconciliation records retry or surface split failures; database deletion is withheld when active objects remain | Provider backup/log expiry and restoration proof remain blocked |
| TM-12 | Privilege escalation through Supabase Data API | Application uses server-only direct PostgreSQL; RLS is enabled; `anon`, `authenticated`, and `service_role` application-table grants are revoked | Recheck grants/advisors after every schema change |
| TM-13 | Secret leakage or environment crossover | Secret inventory, separate resources, Production-only persistence credentials, build-time environment validation, rotation/revocation procedure | Provider access and secret-fingerprint review is an operating responsibility |
| TM-14 | AI prompt injection, data retention, or invented facts | Provider path disabled without key/kill-switch approval; request is structured and bounded; optional name removed; `store:false`; deterministic fallback and factual-gap gate | Full AI/provider/legal evaluation remains blocked; uploaded documents are not sent to AI |
| TM-15 | Unsafe support disclosure | `/support` rejects credentials, claim facts, health data, and private screenshots; tracker uses neutral request IDs | Monitored mailbox, access list, retention, and secure deletion must be approved |
| TM-16 | Supply-chain or framework compromise | Lockfile, dependency audit, protected GitHub checks, patched Next.js/React versions, no arbitrary upload execution | Continue automated advisories and Auth.js beta review |
| TM-17 | Data loss or malicious deletion | Confirmation controls, ownership checks, export, deletion receipt, backup documentation | Actual backup restoration and approved retention policy remain SEC-007/009 |

## Abuse cases exercised by the release gate

- Foreign-origin mutations are rejected.
- User A cannot list, read, mutate, export, download, or delete user B's records.
- Expired, malformed, tampered, or cross-user document tickets fail.
- Filenames, MIME declarations, signatures, structural limits, active PDF content, and trailing polyglots are adversarially tested.
- Oversized requests, excessive objects, repeated calls, and failed cleanup paths fail closed.
- Account deletion does not delete another fictional account and verifies active object/database absence.
- Generated statements pause on missing or contradictory facts and do not cross-contaminate fictional conditions.

## Findings and remediation record

| Finding | Severity | Action in this work package | Remaining status |
| --- | --- | --- | --- |
| Security events were emitted through multiple formats | High | Added one allowlisted formatter and migrated authentication, rate-limit, reconciliation, account, claim, document, and AI failure events | Destination/alert ownership blocked under SEC-010 |
| CSP allowed browser event-handler attributes through the broad script fallback | Medium | Added `script-src-attr 'none'`, denied unused frame/media sources, limited manifests, and enabled production insecure-request upgrading | Inline framework script/style migration remains partial SEC-018 |
| No reproducible field-level inventory existed | High | Added schema/browser/provider inventory, data-flow diagram, known-unknown register, and schema-drift regression | Provider evidence still required for SEC-001 closure |
| No consolidated threat model or incident exercise existed | High | Added this model plus incident and fictional tabletop procedures | Independent review and completed multi-person tabletop remain required |
| Signed-out drafts persist restricted-shaped data in localStorage | High for future real-data use | Explicitly documented and placed behind the existing fictional-data boundary | Must be redesigned or disabled before real-data authorization |
| OAuth provider tokens are retained by the Auth.js adapter | Medium | Classified as authentication secrets; confirmed exclusion from exports and logs | Minimize or justify retained token fields during authentication architecture review |

## Review cadence and stop conditions

Review this model after authentication, storage, schema, document processing, AI, monitoring, support, or deployment architecture changes and before every real-data decision. A finding involving cross-user access, public object access, credential exposure, unbounded external cost, or real-data processing without approval is a release blocker and triggers the incident procedure.
