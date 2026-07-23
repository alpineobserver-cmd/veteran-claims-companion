# Account export and deletion controls

These controls apply to the fictional-data Alpha. They do not resolve provider backup retention, infrastructure-log retention, or the broader real-data gate.

## Portable export

The authenticated account page provides a JSON export containing the signed-in user's:

- Debrief profile fields and Google connection metadata;
- session expiration dates without session tokens;
- workspaces, questionnaire drafts, answers, progress, conditions, and evidence;
- statements;
- fictional document metadata, page/OCR fields if any, and SHA-256 fingerprints;
- legacy upload metadata; and
- application audit events.

The export never selects password hashes, OAuth access/refresh/identity tokens, database session tokens, or private object-storage keys. Binary test files are downloaded separately through the existing short-lived owner-bound flow, avoiding creation of a second sensitive archive. Provider backups and infrastructure logs are outside the export.

## Active account deletion

Account deletion requires an authenticated, same-origin request and two browser confirmations. The server:

1. enumerates both current Document objects and legacy Upload objects for that user;
2. deduplicates and deletes each private object;
3. reads each object key again and stops if any active object remains;
4. deletes the user, relying on database foreign-key cascades for authentication connections, sessions, claims, statements, document metadata, and audit events;
5. queries the user again and stops if the active database record remains; and
6. returns a privacy-safe receipt recording timestamp, verification results, deleted-object count, and the backup/log limitation.

The browser downloads the receipt and clears local cache, cookies, and storage. The receipt is evidence of the application's active-storage checks, not proof that provider backups or security logs have expired.

## Remaining gate

Before SEC-008 can close, the administrator must approve and verify provider backup/log retention and deletion behavior. Binary-file bundling can be reconsidered if users cannot reasonably download their fictional files individually, but any bundle must remain private, bounded, and short-lived.
