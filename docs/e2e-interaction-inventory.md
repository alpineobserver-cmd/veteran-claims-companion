# Browser interaction inventory

TEST-008 keeps the browser suite focused on meaningful user actions and the paths that follow from them. It is not a claim that an automated browser can safely exercise third-party systems, a real VA submission, or destructive account actions against a shared environment.

## Covered in the protected Playwright suite

| Area | Representative interactions | Expected outcome |
| --- | --- | --- |
| Application shell | Primary navigation, condition/form search, notifications, workspace-column collapse and expand | A user can reach each first-party area and recover workspace width without a client error. |
| Claim Builder | Start a fresh claim, complete the guided questionnaire, create and edit a statement, verify/export, save, resume, recover after interruption | A fictional claim can move from intake through a reusable package without reviving an earlier unfinished claim. |
| Conditions library | Search, filter by body system, clear an empty search, open a rating guide | A user can narrow the directory and reach an internal guide. |
| Forms library | Search, filter, clear an empty search, open a form guide | A user can find a guide without leaving Debrief; official downloads are checked as safe external-link contracts. |
| Exposure Record Check | Service period and location selection, optional exposure details and notes, possible-match results, start over | The educational check provides possible matches without presenting them as a VA or DoD record search. |
| Resilience and scale | Offline interruption recovery, failed drafting state, duplicate-request prevention, large fictional workspace set, responsive visual checks | Local progress is recoverable and the interface remains usable under representative fictional load. |

## Deliberately not automated against a shared environment

- Google OAuth consent and sign-out: covered by configuration checks and a dedicated manually controlled test account, not a reusable browser test that would handle live credentials.
- VA, DoD, and other government links: verified for their first-party HTTPS destination, but not followed or submitted by our tests.
- File upload, account export, account deletion, and persistent database changes: require isolated, disposable authenticated test data and storage. Their server-side authorization and validation are covered separately; any end-to-end test must run only against dedicated test resources.
- Actual benefit claims, medical records, and personally identifying information: never used in automated tests. All browser fixtures are fictional.

## Release gate

`npm run test:browser` runs this inventory alongside the existing complete-claim, recovery, and responsive/large-account scenarios. The protected GitHub `verify` workflow runs the browser suite before a pull request can merge into `staging` or `main`.
