# Content Security Policy hardening record

Debrief defines its CSP through `lib/content-security-policy.ts`. `middleware.ts` creates a unique nonce for every application request, passes it to Next.js, and returns the matching response policy. The root layout reads that request header, keeping App Router rendering request-specific so Next.js can apply the nonce to bootstrap scripts.

## Enforced controls

- Same-origin defaults for scripts, styles, connections, images, and manifests. Images may be embedded only as data URLs; the broad external-image allowance is not used.
- No objects, frames, media, foreign form targets, foreign base URLs, or framing ancestors.
- No inline browser event-handler attributes through `script-src-attr 'none'`.
- Workers limited to same-origin and Blob URLs.
- Cross-origin opener, embedder, and resource policies isolate the application from foreign browsing contexts and cross-origin resources.
- Insecure subresource requests upgraded in Production.
- Production scripts require the per-request nonce and `strict-dynamic`; Development alone also permits `unsafe-eval`, which Next.js/React debugging requires.

## Nonce rendering tradeoff

The application contains statically generated App Router pages. Next.js nonces require a unique request-time CSP and dynamic rendering so framework scripts receive the nonce. Enabling them globally disables static HTML optimization/CDN caching and has a measurable availability, cost, and performance tradeoff. Hash/SRI support is experimental and is not enabled on the current stable Next.js 15 release line.

For those compatibility reasons, `style-src 'unsafe-inline'` remains for framework styling and existing inline styles. `script-src 'unsafe-inline'` is no longer present in Production: Next.js receives the nonce from middleware and applies it to its framework scripts. Inline event-handler attributes remain blocked and source origins remain narrow.

## Migration gate

Re-evaluate stable hash/SRI support after a major Next.js upgrade or if static rendering is otherwise restored. The evaluation must compare build/runtime compatibility, authenticated and public routes, OAuth, downloads, PDF/export actions, caching, latency, cost, browser console violations, and rollback. Do not weaken directives merely to silence a violation; identify the required resource and add the smallest reviewed allowance.

The Level 1 remediation review on July 31, 2026 confirmed that the production build emits Next.js inline bootstrap scripts and uses narrowly scoped dynamic inline widths. The nonce migration was selected for framework scripts; the retained inline-style allowance and dynamic-rendering/caching cost remain a release-review concern before real-data authorization.

Framework reference: [Next.js Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy).
