# Privacy-safe security event contract

`lib/security-events.ts` is the only application formatter for security-relevant runtime events. It emits one JSON object to Vercel runtime logs with an allowlisted schema:

- `timestamp`
- `source` (`debrief-security`)
- `environment`
- `release`
- fixed `event`
- optional sanitized `code`, `provider`, `operation`, `scope`, `retryAfterSeconds`, or `isNewUser`

Unknown detail keys are dropped. Token-shaped values must match a short non-identifying character allowlist or become `redacted`. The contract never accepts or emits account/user IDs, HMAC principals, email/name, IP address, claim/document IDs, filenames, storage keys, questionnaire/statement text, document contents, OAuth/session/download tokens, cookies, request bodies, URLs with query strings, or stack traces.

Authentication, durable-rate-limit, storage reconciliation, account/workspace/document cleanup, private download, and AI provider failures use this formatter. Database `AuditEvent` records remain user-visible application history and are not a substitute for operational security events.

## Operator handling

- Treat an event as an investigative signal, not proof of malicious activity or affected data.
- Correlate with environment, release, safe timestamp, and provider event reference in a restricted incident record.
- Never paste raw runtime log streams into GitHub or general support channels.
- Use `docs/incident-response-and-tabletop.md` for Critical/High escalation.
- Review the event-name allowlist and redaction regression whenever a new event or external monitoring adapter is added.

## Remaining SEC-010 gate

The Alpha currently writes these events to Vercel runtime logs. Before claiming protected monitoring is complete, the owner must select a destination, approve its contract and region, restrict access, define retention and deletion, assign alert owners, configure severity-based alerts, test delivery without sensitive data, and document provider failure handling. Vercel Drains may require a paid plan; the application contract does not assume a particular destination.

Provider reference: [Vercel Drains](https://vercel.com/docs/drains).
