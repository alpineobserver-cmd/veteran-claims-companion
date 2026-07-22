# Third-party notices

Reviewed against `package-lock.json` on July 22, 2026. Run `npm run licenses:check` to reproduce the production-package license classification. The package lock and the license files shipped with each installed package remain the exact dependency record.

## Material user-interface and application components

| Component | Use | License | Project |
|---|---|---|---|
| Next.js and React | Web application framework and interface runtime | MIT | https://nextjs.org and https://react.dev |
| Auth.js / next-auth | Google sign-in and database sessions | ISC | https://authjs.dev |
| Prisma | Database client and migration tooling | Apache-2.0 | https://www.prisma.io |
| Vercel Blob SDK | Private object-storage client | Apache-2.0 | https://vercel.com/storage/blob |
| Zod | Request validation | MIT | https://zod.dev |
| Lucide | Interface icons; Lucide contributors | ISC | https://lucide.dev |
| Sharp | Next.js image processing dependency | Apache-2.0 | https://sharp.pixelplumbing.com |

Copyright and permission notices for those works are provided by their upstream license files and linked repositories. Names and marks remain the property of their respective owners; their inclusion does not imply endorsement.

## Reviewed non-permissive or attribution-sensitive components

- **libvips binaries packaged for Sharp** — the `@img/sharp-libvips-*` optional packages identify their license as **LGPL-3.0-or-later**. Source and build information are available from the [libvips project](https://www.libvips.org/) and [lovell/sharp-libvips](https://github.com/lovell/sharp-libvips). Debrief does not modify libvips.
- **caniuse-lite browser-compatibility data** — **CC-BY-4.0**, maintained by the Browserslist/caniuse-lite contributors and derived from Can I Use data. See the [caniuse-lite repository](https://github.com/browserslist/caniuse-lite) and [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

## Government and educational source material

Debrief links to the **eCFR**, VA.gov, and official **VA forms** as primary authorities. The application’s condition and form explanations are original plain-language summaries; the source register identifies the linked authority and local record hash. No VA seal is used and no government endorsement is claimed. Federal-government source status and trademark/branding questions remain subject to qualified legal review before broader release.

## Complete production dependency inventory

The lockfile currently contains only MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC-BY-4.0, LGPL-3.0-or-later, or explicitly reviewed combinations for production dependencies. `scripts/check-third-party-licenses.mjs` fails when a new or unknown license expression enters the production graph so that this notice can be updated before release.

This inventory is an engineering review and attribution record, not a legal opinion.
