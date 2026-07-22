# Conditions and forms content governance

Debrief treats official-source monitoring as a review trigger, never as an automated publishing system.

## Recurring checks

`npm run content:authority-check` performs read-only checks against:

- the official eCFR version endpoint for Title 38, Part 4;
- each official VA form information page in the local library; and
- each official VA PDF or DBQ directory destination.

The weekly GitHub workflow opens one privacy-safe issue if Part 4 has a newer issue date, a PDF reports modification after the recorded verification date, an official URL fails, a PDF stops identifying as a PDF, or a redirect leaves an approved government host. A finding means **review required**. It does not prove that a rating criterion or form changed.

The public VA Forms API provides stronger nightly revision, SHA-256, validity, and deletion metadata, but Production API access requires a VA-issued API key. Until that is approved, the monitor deliberately makes no claim that an unchanged URL proves an unchanged form.

## Human publication gate

Protected published content includes `lib/conditions.ts`, `lib/diagnostic-codes.ts`, `lib/rating-schemes.ts`, and `lib/va-forms.ts`. A pull request changing any of these files must:

1. compare the affected local record with its current official source;
2. distinguish regulatory language from Debrief's plain-language explanation;
3. update verification dates, versions, authority metadata, and fingerprints where applicable;
4. add a public `lib/changelog.ts` entry describing the user-visible change and sources;
5. explain the review evidence in the pull request without including claimant information; and
6. receive the `content-reviewed` label from a human after that review.

The release gate rejects protected content changes missing either the changelog update or label. Push checks revalidate the changelog requirement; the merged pull request preserves the dated human-review record. Automation must never apply the label, write condition/form content, or merge the pull request.

## Review outcomes

- **No content change:** record the official source and close the monitor issue.
- **Correction or revision:** make a reviewed pull request and update the public changelog.
- **Ambiguous or specialist interpretation:** leave existing content unchanged, add a visible caution if needed, and escalate to a qualified subject-matter reviewer.
- **Withdrawn or unsafe form link:** remove or disable the link through an expedited reviewed pull request; do not silently redirect users to a third-party copy.

Official references: [eCFR API](https://www.ecfr.gov/developers/documentation/api/v1), [VA Forms API](https://developer.va.gov/explore/api/va-forms/docs).
