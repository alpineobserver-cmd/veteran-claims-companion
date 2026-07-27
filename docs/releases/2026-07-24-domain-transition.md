# Production domain transition — July 24, 2026

## Decision

Use `https://debriefclaims.com` as Debrief's sole public Production origin. Keep Staging on its isolated Vercel project and resources.

## Changes

- Connected the apex domain to the existing Production project without promoting Staging code.
- Set Production `AUTH_URL=https://debriefclaims.com`.
- Set Production `AUTH_CANONICAL_HOST=debriefclaims.com`.
- Added the matching Google OAuth JavaScript origin and callback URI.
- Redeployed the existing Production commit so the environment changes took effect.
- Added `www.debriefclaims.com` as a `308` redirect to the apex.
- Updated application fallbacks, release checks, health monitoring, tester instructions, and operating documentation.
- Removed the previous Vercel origin and callback from the Production Google OAuth client after a successful custom-domain login.

## Verification

- Vercel reported the apex configuration and TLS certificate as valid.
- The configuration-only Production redeploy completed with status **Ready** from commit `9f2aaf0`.
- A signed-in administrator opened `https://debriefclaims.com`, completed Google authentication, and confirmed the application looked correct.
- Automated canonical-host tests cover deployment aliases, the `www` host, path/query preservation, the canonical apex, and non-Production behavior.

## Residual action

The registrar must publish this record before the `www` redirect can become valid:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `edcaee13d0a6db94.vercel-dns-017.com.` |

After DNS propagation, confirm Vercel reports `www.debriefclaims.com` as valid and an anonymous request receives a permanent redirect to `https://debriefclaims.com`.

## Rollback

If the apex domain or OAuth callback becomes unavailable, re-add the prior origin and callback to the Production Google OAuth client, restore the prior Production canonical host variables, and redeploy the last known-good Production commit. Do not rotate `AUTH_SECRET`, database credentials, storage credentials, or Google client secrets during a domain rollback.
