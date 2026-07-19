# Debrief closed-alpha readiness audit

Date: July 18, 2026  
Scope: application code, API routes, authentication, saved claims, fictional document storage, dependencies, user-facing claims, and alpha documentation.  
Conclusion: suitable for a small allowlisted alpha using fictional data only. Not approved for real claimant or medical information.

## Controls verified or added

- Every claim, workspace, document list, download, and deletion query is scoped to the authenticated user.
- Saved-draft updates use version checks to prevent silent stale-tab overwrites.
- Test documents use server-side signature detection, random keys, private storage, checksums, attachment-only downloads, `no-store`, and permanent-delete actions.
- Oversized uploads are rejected using both request and file size before the server creates a full buffer.
- Mutation routes reject cross-origin browser requests; JSON and upload requests have explicit size ceilings.
- Closed-alpha quotas limit active workspaces and stored test documents.
- Security headers now include CSP, frame denial, MIME sniffing prevention, HSTS, a restrictive permissions policy, and referrer controls.
- Search indexing is disabled for the alpha.
- Google is the only enabled sign-in provider. The unused vulnerable email stack was removed.
- `npm audit` reports zero known vulnerabilities after dependency remediation on the audit date.
- Testers can delete individual documents and workspaces or delete the complete account and active stored data.
- The public Privacy Notice and Terms describe actual alpha behavior, third-party processing, AI consent, deletion, fictional-data limits, lack of VA affiliation, and lack of accredited representation.
- The deterministic statement suite passes 40 fictional scenarios without unsupported causal wording or cross-claim leakage.

## Open risks and required gates

### Blockers before real claimant information

1. Obtain qualified legal review of 38 CFR Part 14 accreditation boundaries. Debrief must remain self-directed and must not represent that a person or the service prepares, presents, or prosecutes an individual claim on a claimant’s behalf.
2. Determine applicability of the FTC Act, FTC Health Breach Notification Rule, HIPAA/business-associate rules, state consumer-health and privacy laws, and any international rules based on actual users and operations.
3. Replace the alpha notices with counsel-approved terms and privacy disclosures identifying the legal operator, physical or registered address where required, a monitored privacy/security contact, governing terms, and all vendor retention periods.
4. Complete vendor and data-flow review for Vercel, the PostgreSQL host, Google OAuth, private Blob, OpenAI if enabled, logging, backups, support access, subprocessors, encryption, regions, deletion, and incident notification.
5. Add malware scanning and quarantine before accepting any real document. File signatures alone do not establish that a file is safe.
6. Complete a threat model, independent penetration test, incident-response plan/tabletop, breach-notification decision tree, secret rotation procedure, recovery test, and backup deletion policy.
7. Replace in-process AI rate limiting with a durable distributed limiter and add abuse monitoring and cost caps before enabling paid AI.
8. Run a manual WCAG 2.2 AA audit with keyboard, screen reader, zoom/reflow, focus, error, contrast, and mobile testing; remediate findings before public access.

### Important engineering follow-ups

- Auth.js remains a pinned beta release. Track its security advisories and plan migration to a supported stable path when compatible.
- The CSP currently permits inline script/style required by the framework and application. Move toward nonces/hashes when practical.
- External object deletion and relational database deletion cannot be atomic. Add a retry/reconciliation job and administrator alerting before real-data use.
- Audit events are operational database rows, not an immutable security log. Export minimal, privacy-preserving events to protected monitoring before production.
- Add automated authorization tests with two users, upload/parser tests, account-deletion tests, API abuse tests, and browser accessibility tests.
- Confirm the condition and form libraries against current official sources immediately before each release and preserve source/version metadata.
- Generate and publish third-party software notices and verify distribution obligations, including the LGPL-licensed libvips component used by Sharp and the CC BY-licensed browser-compatibility dataset.
- Complete product-name, domain, and trademark clearance before treating “Debrief” as a production brand.

## Alpha operating checklist

- Keep Google OAuth in testing mode and allowlist only named alpha testers.
- Set a strong `AUTH_SECRET`; keep all secrets server-side; rotate any credential exposed in chat, source control, or logs.
- Configure a private Blob store and confirm production storage never falls back to local disk.
- Set `PRIVACY_CONTACT_EMAIL` to a monitored address and link the deployed `/privacy` URL from the Google OAuth consent screen.
- Instruct testers in writing to use fictional scenarios only and provide the private security-reporting path.
- Review platform/database/Blob access lists and deployment logs before invitations.
- Test account deletion and document deletion in the deployed environment with fictional files.
- Do not enable `OPENAI_API_KEY` during alpha unless the AI consent, provider settings, spend cap, and authenticated-only behavior are independently verified.
- Record each release and regulatory/form-content change in the in-product change log.
