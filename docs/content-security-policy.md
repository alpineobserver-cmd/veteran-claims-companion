# Content Security Policy hardening record

Debrief defines its CSP through `lib/content-security-policy.ts` and applies it to every route from `next.config.ts`.

## Enforced controls

- Same-origin defaults for scripts, styles, connections, and manifests.
- No objects, frames, media, foreign form targets, foreign base URLs, or framing ancestors.
- No inline browser event-handler attributes through `script-src-attr 'none'`.
- Workers limited to same-origin and Blob URLs.
- Insecure subresource requests upgraded in Production.
- Development alone permits `unsafe-eval`, which Next.js/React debugging requires.

## Why nonce/hash migration remains partial

The current application contains statically generated App Router pages. Next.js nonces require a unique request-time CSP and dynamic rendering so framework scripts receive the nonce. Enabling them globally would disable static optimization/CDN caching and materially change availability, cost, and performance. Hash/SRI support is experimental and is not enabled on the current stable Next.js 15 release line.

For those compatibility reasons, `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` remain temporarily present for framework bootstrap and existing inline styling. Inline event-handler attributes are nevertheless blocked, and source origins remain narrow. This is an explicit residual risk, not a claim of strict CSP completion.

## Migration gate

Re-evaluate a nonce-based dynamic deployment or stable hash/SRI support before real-data authorization, after a major Next.js upgrade, or if static rendering is otherwise removed. The evaluation must compare build/runtime compatibility, authenticated and public routes, OAuth, downloads, PDF/export actions, caching, latency, cost, browser console violations, and rollback. Do not weaken directives merely to silence a violation; identify the required resource and add the smallest reviewed allowance.

Framework reference: [Next.js Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy).
