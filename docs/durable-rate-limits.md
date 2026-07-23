# Durable rate limits and cost controls

Status: implemented for the fictional-data Alpha on July 21, 2026.

## What is protected

Debrief applies account-scoped fixed-window limits to authenticated claim mutations, workspace creation, document upload/access/deletion, account export/deletion, and external AI drafting. The counters live in PostgreSQL, so a redeployment, function restart, or request reaching another Vercel instance does not reset them.

| Operation | Limit |
| --- | ---: |
| Claim changes | 180 per 10 minutes |
| New workspaces | 30 per day |
| Upload attempts | 10 per hour and 25 per day |
| Document access or deletion | 60 per 10 minutes |
| Account exports | 5 per hour |
| Account-deletion attempts | 3 per hour |
| External AI burst | 8 per 10 minutes per user |
| External AI daily user ceiling | 30 per day by default |
| External AI daily Alpha ceiling | 200 per day by default |
| External AI user token reservation | 300,000 per day by default |
| External AI global token reservation | 2,000,000 per day by default |
| External AI response ceiling | 2,000 tokens per request by default |
| External AI spend reservation | 500 cents per day by default |

Existing total-storage controls remain separate: a user may retain at most 25 test documents, a workspace at most 10, and each allowed upload is subject to the existing size and parser limits. Existing active-claim limits and the AI response-token cap also remain in force.

The AI counters are consumed only after the request passes validation, external AI is enabled and configured, and the user is authenticated. The free guided-template path does not consume the paid-provider budget. Before a provider request, Debrief reserves the UTF-8 byte length of the provider input plus the maximum output-token allowance. This deliberately overstates normal token use and reservations are not refunded after errors, which keeps concurrency and provider failures from opening a budget bypass.

Debrief also reserves an operator-defined maximum cost for every provider request before it is sent. The daily spend counter is atomic and fail-closed, so concurrent requests cannot pass after the cap. Privacy-safe warning events are emitted once when a token or spend bucket crosses 80% and 95%. Because model pricing can change, the per-request cost ceiling must be recalculated from the selected model's current maximum input/output price before external AI is enabled or its model is changed. The provider's own billing budget should remain a second, independent safeguard.

## Privacy and failure behavior

The database stores an HMAC of the internal account identifier, not the raw identifier, email address, IP address, claim content, filename, or medical detail. The HMAC key is derived from the permanent `AUTH_SECRET`. Operational limit events contain only a timestamp, event code, limit scope, and retry interval.

An account export includes the user's counter scopes, counts, and windows without exposing the HMAC key. Whole-account deletion removes the user's HMAC-linked counter buckets in the same database transaction as the account record. Global AI safety counters are operational records not tied to an individual account.

A blocked request returns HTTP 429, `Retry-After`, and no-store headers. If the durable counter cannot be checked, the protected request fails closed with HTTP 503. Expired buckets are periodically removed after a seven-day operational buffer.

## Configuration

The application has conservative defaults. These optional Vercel environment variables make the paid-AI ceilings explicit:

```text
DEBRIEF_AI_DAILY_USER_LIMIT=30
DEBRIEF_AI_DAILY_GLOBAL_LIMIT=200
DEBRIEF_AI_DAILY_USER_TOKEN_LIMIT=300000
DEBRIEF_AI_DAILY_GLOBAL_TOKEN_LIMIT=2000000
DEBRIEF_AI_MAX_OUTPUT_TOKENS=2000
DEBRIEF_AI_MAX_REQUEST_COST_CENTS=5
DEBRIEF_AI_DAILY_SPEND_CAP_CENTS=500
```

The deployment validator bounds every control and requires both spend values whenever an API key and external generation are enabled. The maximum per-request reservation cannot exceed the daily cap. Configure values separately in Staging and Production. Lowering a value takes effect immediately for its current fixed window; raising it should be an intentional cost decision.

The cost values are reservations, not a provider invoice parser. Set `DEBRIEF_AI_MAX_REQUEST_COST_CENTS` to a rounded-up worst-case price for the configured model, input boundary, and output limit. Recalculate and document it whenever model, pricing, context size, or output allowance changes. Keep `DEBRIEF_AI_DAILY_SPEND_CAP_CENTS` within the owner-approved loss tolerance.

The migration `20260721190000_durable_rate_limits` must be deployed before the protected routes receive traffic. The existing Vercel build runs `prisma migrate deploy` before `next build`.

## Operations

- Route `ai_budget_threshold_reached` events to the protected monitoring destination once SEC-010 is configured; until then, inspect protected runtime events before every external-AI test window.
- Monitor HTTP 429/503 rates, PostgreSQL availability, AI-provider spend, Blob usage, and Vercel traffic together.
- Treat repeated `rate_limit_exceeded` events as a signal for investigation, not proof of malicious behavior.
- Do not add raw account identifiers, IP addresses, document metadata, or claim contents to the rate-limit event.
- Use the existing AI/upload kill switches if activity or cost becomes unsafe.
- Revisit limits after measured Alpha usage; record any change in the change log and release decision.

These are application-layer controls. They do not replace Vercel platform DDoS protections, a reviewed firewall/WAF policy, protected security-event monitoring, or an incident-response plan.
