# Support and correction operations

The public `/support` page is the Alpha intake route for privacy, deletion, security, accessibility, content-correction, and general product requests. It sends reports to the monitored address configured as `PRIVACY_CONTACT_EMAIL`; no report form or sensitive support database is introduced.

## Safe intake boundary

Ask only for the category, affected page or feature, approximate time, safe reproduction steps, browser/device details when relevant, a Debrief reference code, and an official source link for content corrections. Never ask for a password, authentication code, token, Social Security number, VA file number, medical record, claim facts, or another person's information. Test with fictional information.

If a reporter sends sensitive material anyway, do not copy it into GitHub or a general tracker. Restrict access, preserve only what is required for the response or legal obligation, and ask the privacy or security owner to decide secure deletion and incident handling.

## Triage and handling

1. Acknowledge the request according to `docs/service-level-objectives.md` and assign a neutral request ID.
2. Classify it as privacy, deletion, security, accessibility, content correction, or product feedback. Assign severity and an owner.
3. Record only the request ID, received/acknowledged dates, category, severity, environment, affected feature, status, owner, target date, and closure/retest result in the operating tracker.
4. Keep any necessary communication in the restricted support channel. Link to an engineering issue by neutral request ID only.
5. Correct, verify, communicate the result, and record closure. Publish user-visible content changes in the changelog.

### Privacy and deletion

Direct signed-in users to **Account and data** for self-service export or deletion. If self-service is unavailable, verify control of the existing signed-in account or its established email channel without requesting passwords or MFA codes. Confirm the scope, execute the documented deletion path, provide the privacy-safe receipt or limitation, and record provider backup/log expiry where applicable.

### Security

Treat suspected account crossover, exposed credentials or private objects, unauthorized access, data loss, or bypass of a safety control as Critical until triage shows otherwise. Notify the security owner immediately, use the relevant kill switch or credential-revocation runbook when needed, preserve privacy-minimized evidence, and assess incident-response and notification obligations. Never direct a security reporter to a public issue.

### Accessibility

Record the affected task, device/browser, assistive technology if used, expected result, observed barrier, and WCAG criterion after review. Apply `docs/accessibility-review-process.md`, provide a usable alternative where possible, and require a retest before closure.

### Content correction

Record the affected condition, diagnostic code, form, or URL; the suspected error or broken link; and an official source if available. Do not ask how the content applies to the reporter. Compare against the preserved authority, require human review before publication, update source/version metadata, and add the published correction to the public changelog.

## Escalation and closure

Critical security or privacy events are escalated immediately. Other requests follow the response targets in the SLO document. A request closes only when the action is verified, the reporter receives a safe outcome or next step, and any necessary follow-up item has an owner. Accessibility and content corrections require a documented retest or source review.

Operational targets do not replace qualified legal review. The owner must seek counsel when a request may trigger breach notice, preservation, identity-verification, consumer-rights, or other statutory obligations.
