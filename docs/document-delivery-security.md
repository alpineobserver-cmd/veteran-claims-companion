# Private document delivery

Debrief's Alpha document intake remains limited to entirely fictional test files. This control does not authorize real medical records or close the broader real-data security and legal gates.

## Delivery boundary

1. The upload route stores the file in Vercel Private Blob in Production, or in the isolated local test directory during development.
2. Browser-facing document records omit the storage key. No Blob URL is stored in or returned to the browser.
3. When the signed-in owner selects Download, the browser sends a same-origin `POST` request for a download ticket.
4. The server verifies the session and queries the document by both document ID and user ID.
5. The server issues a cryptographically signed ticket bound to that user and document. It expires after 60 seconds.
6. The download route verifies the current session, ticket signature, user binding, document binding, and expiry before querying private storage.
7. The server streams the file as an attachment. Responses use `private, no-store`, `no-referrer`, and `nosniff` controls.
8. A successful download creates the existing privacy-minimized audit event. Tickets, filenames, contents, and medical details are not added to logs.

The ticket is deliberately short-lived but may be replayed by the same signed-in owner until it expires. Permanent `AUTH_SECRET` continuity is required: changing the secret immediately invalidates outstanding tickets, sessions, and other authentication state.

## Verification

Run `npm run test:storage` to verify expiry, tamper resistance, cross-user and cross-document rejection, owner-scoped routes, private-only Blob access, and the absence of storage keys in list responses. The same test is included in `npm run test:release`.

Provider encryption, retention, backup expiry, malware scanning, incident response, and an independent security review remain separate backlog gates.
