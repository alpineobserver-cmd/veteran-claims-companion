# Incident response and fictional tabletop procedure

Status: Engineering procedure completed July 22, 2026. Qualified legal review, named backup personnel, verified contact channels, and a completed multi-person tabletop remain required before real-data use.

## Roles

- **Incident commander:** Product owner/Alpha administrator. Declares severity, coordinates decisions, and owns the timeline.
- **Technical lead:** Engineering. Contains the system, preserves privacy-safe evidence, diagnoses, corrects, and verifies.
- **Privacy/legal lead:** Qualified reviewer designated before real-data use. Determines preservation, individual/regulator/provider notification, and legal deadlines.
- **Communications lead:** Named by the incident commander. Sends approved tester/status communications without exposing identities or facts.
- **Recorder:** Maintains the restricted incident record and decision log. A person may hold multiple roles in Alpha, but an independent reviewer is required for real-data incidents.

Never put credentials, tokens, claim facts, medical details, filenames, private object keys, full IP addresses, private screenshots, or affected-person lists in GitHub, chat, a public status page, or the general backlog.

## Severity and response targets

| Severity | Example | Initial action |
| --- | --- | --- |
| Critical | Confirmed cross-account access, public private-object access, active credential theft, destructive data loss, or unauthorized real medical data | Page the owner immediately; acknowledge within one hour; contain first and assess notification obligations |
| High | Plausible exposure without confirmation, repeated authorization failures, deletion/reconciliation backlog, or malware reaching stored quarantine | Acknowledge within four business hours; assign an owner and safe containment plan |
| Medium | Isolated control failure with no evidence of access or loss | Own within one business day and correct through the normal protected release path |
| Low | Hardening opportunity or unsuccessful probe with controls operating as intended | Track and review with planned maintenance |

## Response lifecycle

1. **Receive and identify:** record a neutral incident ID, detection time, reporter channel, environment, release, event/error code, affected service class, and initial severity. Do not copy sensitive payloads.
2. **Declare and assign:** name the incident commander, technical lead, privacy/legal contact, recorder, and next update time.
3. **Contain:** use the upload, AI, or registration kill switch; revoke credentials; invalidate sessions; isolate a deployment; or remove public access only to the minimum extent needed. Preserve user deletion/export paths unless they create the risk.
4. **Preserve evidence:** retain release/commit, configuration fingerprints, provider event references, safe timestamps, security-event types, actions taken, and cryptographic file fingerprints when necessary. Restrict access and document collection purpose and deletion date.
5. **Investigate scope:** distinguish suspected from confirmed access; identify affected environment, accounts/objects by restricted internal process, first/last known time, attack path, persistence, and whether backups/logs/providers are involved.
6. **Eradicate and recover:** correct the root cause on a feature branch; run security/release tests; rotate/revoke affected credentials; reconcile storage/database state; deploy through the protected gate; verify stable Staging before Production.
7. **Notify:** the privacy/legal lead decides whether contract, consumer, health-breach, state, federal, law-enforcement, insurer, provider, or affected-person notification applies and controls content/timing. Engineering must not make a no-notification decision alone.
8. **Close and learn:** confirm containment/recovery, record residual risk and evidence expiry, assign follow-up work, update the threat/data-flow model, and hold a blameless review.

## Playbook triggers

### Credential or administrator-account exposure

Activate the emergency revocation checklist in `docs/secret-inventory-and-rotation.md`. Disable the affected capability, revoke before routine deployment when still usable, replace only in the matching environment, redeploy, invalidate sessions when relevant, review provider activity, and verify the other environment remained isolated.

### Cross-account access or private-object exposure

Pause registrations and uploads if they contribute to exposure. Preserve safe request/release timestamps and provider object references in the restricted record. Test the owner boundary with two fictional accounts, rotate storage/database credentials when compromise is plausible, and treat every potentially accessible record as affected until disproved.

### Deletion or reconciliation failure

Do not delete the database owner record while active objects remain unresolved. Review pending `StorageReconciliationTask` records through a restricted operator process, retry verified absence, preserve the user's deletion request date, and communicate provider backup/log limitations accurately.

### Malicious or suspicious document

Keep document processing fictional-only. Disable uploads, prevent download/processing where technically possible, preserve a checksum rather than circulating the file, do not open it on an operator workstation, and obtain specialist scanner/forensics help. Current validation is not malware scanning.

### AI safety or provider event

Disable `DEBRIEF_AI_GENERATION_ENABLED` immediately. Preserve prompt/model version and privacy-safe result status, not the claimant text in a general tracker. Confirm no further calls occur, review provider settings/activity, and require evaluation and approval before re-enabling.

### Availability or authentication outage

Keep status wording factual, do not weaken authentication/canonical-host checks as a shortcut, and do not rotate `AUTH_SECRET` unless exposure or a deliberate recovery plan requires it. Roll back to a known-good deployment when configuration is not the cause.

## Fictional tabletop exercises

Use entirely fictional accounts, files, timestamps, and records. Do not intentionally expose real credentials or weaken Production.

### Exercise A — Cross-account document response

Inject: a fictional tester reports that a download action appeared to return another fictional user's filename. Expected decisions: Critical declaration, uploads/registrations containment assessment, restricted affected-object search, two-user reproduction, Blob/database credential assessment, communication/legal escalation, corrected release and retest.

### Exercise B — Leaked Staging Blob credential

Inject: a scanner reports a credential-shaped value in a private test channel. Expected decisions: determine whether it is live without reproducing it in the record, disable uploads, revoke/replace the Staging credential, inspect activity, verify Production isolation, redeploy, exercise upload/download/deletion, and close the exposure path.

### Exercise C — Account deletion split failure

Inject: object deletion succeeds but the database operation fails. Expected decisions: confirm the reconciliation record without exposing its storage key, keep the incident separate from GitHub, retry/verify database deletion, preserve the request date and receipt limitations, and assess backup expiry.

### Exercise D — Suspicious fictional PDF

Inject: a structurally valid fictional PDF is later flagged by a specialist scanner. Expected decisions: pause uploads, prevent further processing, preserve hash-only evidence, locate objects through restricted tooling, assess downloads, delete/quarantine safely, and keep malware-scanning work blocked until an approved provider exists.

## Tabletop record

Record date, participants/roles, exercise, environment, release, start/end times, decisions and rationale, actions attempted, controls that worked, gaps, severity changes, communications/legal decisions, recovery proof, follow-up owner/date, and evidence deletion date. Do not record fictional narrative details beyond what is necessary to exercise the control.

The Phase 3 incident item remains partially complete until the owner names contacts, a qualified legal reviewer approves notification decision paths, and at least one multi-person exercise is conducted and recorded.
