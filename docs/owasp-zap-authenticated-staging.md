# Authenticated OWASP ZAP Staging procedure

This procedure is for an authenticated **passive** ZAP review of the isolated Debrief Staging service. It does not authorize an active scan, mutation testing, Production testing, real records, real claim details, or user credentials being shared with engineering.

## Purpose and scope

- Target only `https://debrief-staging-khaki.vercel.app`.
- Use a new Google or Microsoft account dedicated to this test. Its display name must be fictional and it must not be used for any other service or personal communications.
- Enter only the supplied Debrief fictional test records and fictional questionnaire answers.
- Start with a proxy-based passive review while a human operator completes the normal Staging workflow. Do not use ZAP's Full Scan, API Scan, fuzzer, forced browse, or active rules.

## Required operator preparation

1. Create the disposable OAuth account and add its email address to the matching Staging OAuth allowlist, if the provider remains in testing mode.
2. Tell the operator only the account email address and the scheduled review window. Never send its password, recovery code, session cookie, access token, or browser profile to GitHub, chat, logs, or a test report.
3. Confirm Staging has the fictional-data controls enabled and that the account begins without saved claims or documents.
4. Configure ZAP Desktop or an equivalent local proxy with an in-scope rule limited to the exact HTTPS Staging hostname. Exclude Google, Microsoft, Vercel, Blob/Storage, analytics, localhost, all Production aliases, and every other hostname.
5. Set a five-request-per-second ceiling, no authentication automation, and no active scan policy. Keep one operator available to stop the proxy immediately if unexpected behavior occurs.

## Passive authenticated walkthrough

1. Start a new ZAP session and confirm only the Staging hostname is in scope.
2. In a normal browser configured to use the local proxy, sign in to Staging manually. Complete any OAuth consent personally; do not enter credentials into ZAP or automation scripts.
3. With fictional data only, visit Dashboard, Document Upload, Claim Builder, Review, Claim Package, Account & data, logout, and the login recovery route. Use the provided test PDFs only if document upload is part of the approved window.
4. Let ZAP finish passive analysis. Export the HTML, Markdown, and JSON reports to the operator's protected local evidence location.
5. Review alerts by route, request method, authentication state, and evidence. Treat every alert as a hypothesis until it is reproduced safely.
6. Delete the fictional Staging account and uploaded fictional files using Debrief's Account & data controls. Confirm sign-out and deletion before ending the session.

## Stop conditions and reporting

Stop immediately and preserve only privacy-safe evidence if the proxy observes a request to another hostname, a real identifier or health detail, an unexpected write/delete action, a session token, a storage key, repeated error responses, or an unexplained login loop.

Record only the run time, tool/version, target hostname, route class, alert rule ID/name, severity after human triage, reproducible safe steps, remediation owner, and retest status. Do not attach raw requests, responses, cookies, OAuth information, account identifiers, filenames, claim answers, screenshots, or report bodies to GitHub.

## Active-scan gate

An active authenticated API or browser scan requires a separate written authorization that names exact endpoints, permitted HTTP methods, request-rate ceiling, synthetic fixture set, operator, monitoring window, rollback plan, and cleanup verification. It must run against Staging only.
