# Content provenance controls

Debrief records a version, last-verified date, authority link, hash scope, and SHA-256 fingerprint for every published condition and VA-form guide. `/sources` exposes that register to reviewers.

The hash covers Debrief’s local plain-language record and its source metadata. For a condition, that includes the guide, mapped diagnostic codes, and rating schemes. For a form, it includes the guide, revision/status label, official information page, and download destination. It deliberately is not described as a snapshot or hash of a live government page: upstream markup can change independently and the official source remains controlling.

Before changing library content:

1. Open and review the authoritative eCFR or VA source.
2. Update the local record, its last-verified date/version when appropriate, and the public change log.
3. Run `npm run test:content` and the full release gate.
4. Review the changed fingerprints in `/sources` on Staging.
5. Record human content approval before promotion.

The release commit plus the stable serialization in `lib/content-provenance.ts` allows a reviewer to reproduce every fingerprint without storing a duplicate copyrighted source page.
