# Debrief deployment environments

Last updated: 2026-07-20

## Purpose

Debrief uses separate environments so testers can review work in progress without changing the stable public Alpha or its data. The separation is both a release control and a privacy control.

| Environment | Git source | Vercel project | Data | Audience |
| --- | --- | --- | --- | --- |
| Local development | A developer branch | Local computer | Local PostgreSQL and local test documents | Developer only |
| Feature preview | A pull-request branch | Disposable Vercel preview | Staging/test services only | Developer or invited reviewer |
| Staging | `staging` | Debrief Staging | Separate staging PostgreSQL and private Blob | Fictional-data Alpha testers |
| Production | `main` | Debrief Production | Production PostgreSQL and private Blob | Stable public Alpha |

The current public Alpha origin remains the sole Production address. Do not place temporary Vercel deployment aliases in tester instructions.

## Repository controls already in place

- Every non-Production build displays a fixed **Development build — fictional data only** banner with its environment and release identifier.
- `npm run deployment:env-check` blocks a Staging build that is not explicitly labeled with `DATA_ENVIRONMENT=staging`, blocks use of the Production OAuth origin in Staging, and blocks a Production build labeled for Staging data.
- Vercel runs the deployment check before database migrations or the application build.
- GitHub runs `npm run test:release` for pull requests and pushes involving `staging` or `main`.
- The code is backward compatible with the existing Production project while the new labels are added: an unlabeled Vercel Production build is inferred as Production.

These checks reduce configuration mistakes; they cannot prove that two secret connection strings point to different resources. That separation must be confirmed in the Vercel and provider dashboards during initial setup and every credential change.

## One-time Staging setup

1. Finish and commit the current application changes on `main`.
2. Create a long-lived `staging` branch from the known-good `main` commit and protect both branches in GitHub. Require the **Debrief release gate** check before merging.
3. Import the same GitHub repository into a second Vercel project named **Debrief Staging**. Set its Production Branch to `staging`. Do not change the existing Production project's `main` branch.
4. Provision a new PostgreSQL database and a new private Blob store for Staging. Never copy the Production database connection string or Blob credential into Staging or Preview.
5. Create a separate Google OAuth web client for Staging. Add only the stable Staging origin and its `/api/auth/callback/google` callback. Keep the OAuth consent application in Testing and add the approved fictional-account testers.
6. Give Staging a stable Vercel project domain. Do not use the current Production domain.
7. Add the variables in the following table to the **Production scope of the Staging Vercel project**. In that project, `staging` is its production branch even though the application identifies itself as Staging. Secret values must be entered only in Vercel, never in GitHub, documentation, screenshots, or source files.

| Variable | Staging value rule |
| --- | --- |
| `APP_ENV` | `staging` |
| `DATA_ENVIRONMENT` | `staging` |
| `RELEASE_ID` | Optional human-readable version; the Git commit is used when omitted |
| `DATABASE_URL` | Staging PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Credential for the Staging private Blob store, if the integration does not inject it automatically |
| `AUTH_SECRET` | New permanent random value used only by Staging |
| `AUTH_GOOGLE_ID` | Staging OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Staging OAuth client secret |
| `AUTH_URL` | Stable HTTPS Staging origin |
| `AUTH_CANONICAL_HOST` | Hostname from the stable Staging origin, without `https://` or a path |
| `PRIVACY_CONTACT_EMAIL` | The monitored Alpha privacy contact |
| `OPENAI_API_KEY` | Leave unset while paid AI is disabled |

8. In the Staging project's Preview scope, use `APP_ENV=preview` and only Staging/test data services. OAuth and persistent storage may remain disabled on disposable previews if they are not needed for review.
9. Add `APP_ENV=production` and `DATA_ENVIRONMENT=production` to the Production scope of the existing Production Vercel project. Confirm its Production database, Blob, and authentication credentials are scoped to Production only; remove them from Preview and Development scopes or replace those scopes with Staging/test-only resources. Do not change the permanent Production `AUTH_SECRET`, Google credentials, database, Blob store, `AUTH_URL`, or canonical host.
10. Deploy `staging`, confirm the development banner is present, run the smoke checklist below using fictional information, and verify that no Staging workspace appears in Production.

## Normal release path

1. Create a short-lived feature branch from `staging`.
2. Make and locally verify the change with `npm run test:release`.
3. Open a pull request into `staging`; require the GitHub release gate to pass.
4. Merge and test the stable Staging site with fictional data. Record results in a copy of the release record template.
5. Open a pull request from `staging` into `main`. Review the user-facing change, migrations, release notes, known risks, and rollback target.
6. Merge only after an explicit Production approval. Vercel then deploys `main` to the existing Production project.
7. Repeat the smoke test on the canonical Production origin and complete the release record.

Do not promote a Staging deployment artifact into the separate Production Vercel project. The same reviewed Git commit moves through Git branches, while each project builds with its own secrets and storage boundary.

## Smoke checklist

- Public splash, Privacy, Terms, and login pages load without a Vercel access or download prompt.
- Environment banner is visible in Staging and absent in Production.
- Google login and logout succeed with the dedicated fictional account.
- A new fictional workspace saves, reopens, and remains isolated to the tested environment.
- A fictional claim can reach statement verification and export.
- A fictional document can be uploaded, downloaded, and deleted in the tested environment.
- No secrets, email addresses, document names, or claim answers appear in application logs.
- The public changelog and tester instructions point only to the appropriate stable address.

## Emergency fix and rollback

For an urgent defect, create the fix from the current Production commit, merge it into `staging`, run the release gate and focused Staging smoke test, then merge the same commit into `main`. Do not bypass Staging for convenience.

If Production fails, use the Vercel dashboard to roll the Production project back to the last recorded healthy Production deployment. A rollback changes the deployed application but does not reverse a database migration. For any destructive or incompatible migration, prepare and test a separate database recovery plan before release. After restoring service, apply the fix to both `main` and `staging`, record the incident, and re-run the Production smoke checklist.
