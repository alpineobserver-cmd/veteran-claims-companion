# Privacy-safe monitoring foundation

## Implemented signals

- `/api/health` is a no-store liveness endpoint. It returns only service, validated environment, and release labels. It does not query or describe the database, object store, accounts, claims, or documents.
- `scripts/check-service-health.mjs` checks the public entry, login, liveness, Auth.js provider configuration, and anonymous session endpoint. It enforces HTTPS and a five-second response threshold. Output contains timestamp, public hostname, route class, status, latency, result, and safe exception name only.
- `.github/workflows/service-health-monitor.yml` can run manually against a public HTTPS origin and, once present on the default branch, runs every 30 minutes. Workflow failure provides an operational alert through GitHub Actions. The optional `STAGING_HEALTH_URL` repository variable enables the isolated Staging check without committing a protected deployment alias.
- Application-side security events already cover sign-in, Auth.js errors/warnings, rate limiting, storage reconciliation, destructive cleanup, private-document failures, and AI-provider failures through a fixed event vocabulary. The formatter drops unknown fields and refuses unsafe token values.

No monitoring request reads authenticated claim content, submits credentials, records email/IP/document/condition data, or copies response bodies into logs.

## Operator response

For a failure, confirm the route and environment, inspect privacy-safe Vercel runtime events for the same period, classify severity using the incident runbook, and use the applicable kill switch or rollback. Do not paste raw user requests, OAuth tokens, cookies, questionnaire data, filenames, or provider credentials into GitHub logs or issues.

## Remaining work

OPS-007 remains partially complete until the operator selects and configures a protected event destination, access policy, retention/deletion period, alert recipients/escalation, and verifies alert delivery. The synthetic workflow measures public uptime, configuration health, and coarse latency; it does not prove authenticated save/export SLOs or Google callback success. OPS-008 separately covers a broader alert service and public status page.
