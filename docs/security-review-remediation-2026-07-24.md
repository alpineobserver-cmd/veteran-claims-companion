# Security review remediation — 24 July 2026

This record responds to the independent code review dated 24 July 2026. It applies to the fictional-data Alpha only and is not an authorization to accept real claimant or medical information.

## Completed in code

- Anonymous template drafting and claim-package PDF generation now use durable, privacy-preserving rate-limit principals. Signed-in users use account-scoped limits.
- State-changing requests fail closed when neither `Origin` nor `Sec-Fetch-Site` can establish a same-origin browser context.
- `AUTH_SECRET` is no longer directly reused by application controls: HKDF derives separate subkeys for document tickets and rate-limit principal hashing.
- Document download tickets are delivered in an authorization header through an authenticated POST flow, not in URLs, browser history, or query-string logs.
- Hosted deployments must explicitly set operational kill switches; unset controls default off in production.
- The public health endpoint no longer exposes environment or release identifiers.
- Object-storage paths use opaque random prefixes instead of user and claim identifiers.

## Deliberate Alpha residuals

- PDF inspection is best-effort format validation, not malware scanning. The mandatory real-data quarantine-and-scan release gate is documented in `docs/pdf-upload-security-boundary.md`.
- Content-Length is an early rejection signal, not the authoritative request-body limit. Vercel body limits remain a required deployment control; a streaming upload implementation is required before real-document support.
- Download tickets remain valid during their 60-second expiry window, but require both the ticket and the authenticated owner session. The token no longer appears in a URL. One-time nonce consumption is a future enhancement for real-data readiness.

## Infrastructure and release actions still required

1. Configure Vercel Firewall/rate limiting for anonymous API routes as a second layer.
2. Validate a nonce-based Content Security Policy in report-only mode before replacing the current Next.js-compatible policy. Do not remove `unsafe-inline` without deployment testing.
3. Confirm hosted function body limits and add a size-capped streaming upload path before accepting real files.
4. Add HSTS preload only after the apex and all subdomains are permanently HTTPS-capable and redirects are stable.
5. Implement quarantine, scanning, promotion, and scan-audit retention before permitting real claimant or medical records.
