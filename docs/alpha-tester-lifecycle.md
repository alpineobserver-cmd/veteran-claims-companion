# Alpha tester onboarding and offboarding

Owner: Alpha administrator  
Applies to: Debrief Staging and Production closed Alpha  
Data boundary: fictional information and fictional documents only

This is the canonical checklist for granting, reviewing, and removing tester access. Keep the restricted contact/allowlist record outside this repository. Use only a neutral tester code such as `T-001` in repository feedback and test records.

## Restricted lifecycle record

Maintain one protected row per tester with only:

- Neutral tester code
- Environment(s) authorized
- Invitation date and inviter
- Exact Google account held in the Google test-user allowlist
- Alpha Terms version and acknowledgement date
- Fictional scenario assignment
- Access-review date
- Offboarding date and reason category
- Google allowlist removal confirmed
- Active Debrief sessions revoked or tester sign-out confirmed
- Account/data disposition: retained for active testing, self-deleted, administrator-assisted request pending, or deletion verified

Do not place the restricted record in GitHub, the product feedback register, public issues, chat, analytics, or release notes. Do not record passwords, MFA details, account screenshots, real claim facts, or health information.

## Onboarding checklist

- [ ] Assign the next neutral tester code; keep the identity-to-code mapping in the restricted lifecycle record only.
- [ ] Send the canonical invitation in `docs/alpha-tester-invitation.md` and the assigned fictional scenario.
- [ ] Confirm the tester understands: fictional data only, voluntary testing, drafts may be wrong, no filing-deadline reliance, and Debrief is not VA or an accredited representative.
- [ ] Record acknowledgement of the current Alpha Terms version and date. Do not record questionnaire answers as proof of consent.
- [ ] Confirm whether access is for Staging, Production, or both. Grant the minimum environment needed.
- [ ] In the matching Google Cloud project, open **Google Auth Platform → Audience → Test users**, add the exact invited Google account, and save. Production and Staging use separate OAuth clients/projects and must be reviewed separately.
- [ ] Confirm the account is not accidentally present in the other environment's allowlist.
- [ ] Ask the tester to open only the stable environment address and complete login once.
- [ ] Verify the tester reaches Debrief rather than Vercel protection and that no other tester's workspace is visible.
- [ ] Record access verification without copying email addresses or authentication screenshots into repository records.

Google documents that an External app in Testing is limited to explicitly added test users and currently directs administrators to manage them under Audience: https://developers.google.com/workspace/guides/configure-oauth-consent

## Review during testing

- [ ] Review the restricted allowlist at least monthly and before each new test round.
- [ ] Remove duplicate, unknown, expired, or no-longer-needed entries.
- [ ] Keep repository feedback tied only to the neutral tester code.
- [ ] If the tester reports an authentication issue, record only approximate UTC time, browser, route, and sanitized Debrief reference code.
- [ ] Treat suspected credential exposure, cross-user access, or real-data entry as an immediate security/privacy escalation under `SECURITY.md`.

## Offboarding checklist

- [ ] Record the offboarding request/date and stop assigning new tests.
- [ ] Ask the tester to sign out of Debrief on every device.
- [ ] Remove the exact account from **Google Auth Platform → Audience → Test users** in every environment where it was authorized.
- [ ] Confirm removal from each separate Production/Staging allowlist. Removing an OAuth test user prevents future Google authorization but should not be treated as proof that an existing Debrief database session ended.
- [ ] Revoke remaining Debrief sessions in the protected database administration surface when immediate access removal is required. Locate the account only inside the provider's protected console and delete its `Session` rows; do not copy its email, user ID, or session token into tickets or chat.
- [ ] If the tester requests deletion, prefer **Account & data → Permanently delete my account** so active database records and private objects are verified deleted and a receipt is produced.
- [ ] For an administrator-assisted deletion request, verify the requester's identity through the established private contact, do not request a password or code, and track it under the privacy/deletion request process rather than a public issue.
- [ ] Record only the deletion disposition and verification date in the restricted lifecycle record. Provider backup/log expiry remains subject to the approved retention policy and must not be represented as immediate.
- [ ] Confirm the tester no longer signs in and close or sanitize any remaining feedback records.

## Quarterly evidence

Record the review date, reviewer role, environments reviewed, number of active test users, number removed, unresolved deletion requests, and exceptions. Do not record the allowlisted email addresses in the review evidence.
