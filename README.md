# Debrief

An independent educational and organizational MVP for veterans preparing VA disability claim materials. It does not submit claims, give legal advice, or represent the Department of Veterans Affairs.

## Project management

Use the [product backlog](docs/product-backlog.md) as the working source of truth for priorities, release gates, Alpha follow-up, and future milestones. Record and triage tester reports in the single [Alpha feedback register](docs/alpha-feedback-register.md).

The Alpha evaluation kit includes [success measures](docs/alpha-success-measures.md), a [post-test survey](docs/alpha-post-test-survey.md), a [moderated-test script](docs/alpha-moderated-test-script.md), and the canonical [tester invitation](docs/alpha-tester-invitation.md). Aggregate privacy-safe session scorecards with `npm run eval:alpha`.

## Included in this increment

- Responsive Next.js 15 dashboard and application shell
- Auth.js database sessions with Google sign-in
- PostgreSQL/Prisma domain model for claims, evidence, uploads, forms, statements, questions, and progress
- Seed content for conditions, evidence types, templates, and VA forms
- Authenticated, versioned cloud saving for claim workspaces
- Synthetic-document intake backed by private object storage
- Provider interfaces for document storage and AI integrations
- Accessible navigation, responsive layouts, and required disclaimer content

## Local setup

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set database/auth/provider values.
3. Run `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate -- --name init` to generate and apply the initial migration.
5. Run `npm run db:seed`.
6. Start with `npm run dev`, then open `http://localhost:3000`.

Google OAuth callbacks use `/api/auth/callback/google`. Keep the OAuth application in testing mode with an explicit tester allowlist during closed alpha. Configure its homepage and privacy-policy links to match the deployed Debrief domain.

### Authentication operations

Production uses `https://veteran-claims-companion.vercel.app` as its sole canonical Alpha origin. Set `AUTH_URL` to that origin and `AUTH_CANONICAL_HOST` to `veteran-claims-companion.vercel.app`; production requests reaching another Vercel alias are redirected before the application starts OAuth. Share only the canonical URL with testers.

Create `AUTH_SECRET` once with a cryptographically random value of at least 32 characters, scope it to Vercel Production, and keep the same value across routine deployments. Do not regenerate it during a redeploy: Auth.js encrypts temporary OAuth checks with this value, so changing it invalidates sign-ins already in progress. `npm run auth:env-check` validates required Production variables, secret strength, HTTPS, and the canonical origin without printing secret values; Vercel runs this check before migrations and the application build.

Authentication logs contain only timestamps, event names, error codes, provider labels, and the new-user boolean. They intentionally exclude names, email addresses, user IDs, tokens, cookies, callback parameters, and questionnaire data. See `docs/auth-e2e-test.md` for automated boundary checks and the dedicated fictional-account callback procedure. See `docs/auth-dependency-decision.md` for the Auth.js beta decision and monitoring triggers.

## Personal statement drafting

The last step of the claim builder can turn a veteran's questionnaire answers into an editable personal-statement draft. Set `OPENAI_API_KEY` in the server environment to enable AI-assisted drafting. `OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`.

The API key must remain server-side. Statement requests use the OpenAI Responses API with storage disabled. The optional display name is added by the application and is not included in the source material sent to the model. If no API key is configured, the same interface creates a clearly labeled guided narrative directly from the answers using fixed, non-AI rules so the MVP remains reviewable.

The claim builder also works without AI. It branches by claim path, provides condition-aware prompts, builds a chronology, links facts to supporting information, and checks for common preparation gaps. Users confirm each statement section before downloading a PDF review package. The package is an independent preparation attachment, not a completed VA form and not evidence that anything was submitted to VA.

Evidence links use explicit statuses: supporting record available, personal recollection, witness or buddy evidence, record identified but not obtained, and no supporting information identified. Only available records with a selected record type, personal recollections, and witness evidence count as identified support. Pending records are tracked separately and are never counted as available evidence. Older saved claims with string-based evidence links are converted when opened.

### Fictional claim evaluation

Run `npm run eval:claims` to exercise the claim workflow with 40 entirely fictional veteran scenarios. The suite covers original, increased-rating, secondary, uncertain-path, incomplete, evidence-gap, contradiction, uncertainty, clinician-attribution, sensitive-narrative, witness-observation, and unsafe-medical-wording cases. It also checks repetition, forbidden wording, paragraph assembly, and cross-claim isolation. The command makes no network or paid-model calls; use the same fixtures as regression cases when AI drafting is enabled.

Signed-in users can save versioned questionnaire snapshots to PostgreSQL, reopen them from the dashboard, and continue on another device. Signed-out users retain a browser-only draft and are invited to move it to their account when they sign in and save. The API verifies claim ownership on every read, update, and delete operation and rejects stale updates from another browser tab. Account and data controls allow a tester to delete all active application data. The alpha accepts fictional test documents only; real medical documents remain prohibited until malware scanning, documented retention and backup deletion, incident response, and a production health-data legal determination are complete.

## Fictional document intake

The `/intake` workflow is a test-only foundation for the larger evidence-assisted process. It accepts PDF, JPEG, and PNG files up to 4 MB only after the signed-in user confirms that the file is entirely fictional or synthetic. File signatures are checked on the server, objects use random immutable keys, downloads and deletion require ownership, responses disable browser storage, and upload/download/delete actions are audited without logging document names or contents.

Local development stores synthetic files under the ignored `.data/` directory. For Vercel, create a Blob store from the project's Storage tab, set its access to **Private**, and connect it to the project. Vercel adds the required storage credential automatically; legacy token-based stores use `BLOB_READ_WRITE_TOKEN`. Private Blob requires `@vercel/blob` 2.3 or newer.

This milestone does not include malware scanning, OCR, document AI analysis, real-record authorization, or a production health-data compliance determination. Do not use any part of the alpha—including questionnaire fields—for real health information, Social Security numbers, VA file numbers, or third-party records.

## Closed-alpha boundary

The current build is deliberately excluded from search indexing and is intended for a small allowlist of testers using fictional scenarios. It includes an Alpha Privacy Notice and Alpha Terms of Use for transparency, but those drafts are not a substitute for review by qualified counsel. Before accepting real claimant information, obtain legal review of VA accreditation boundaries, FTC health-privacy and breach requirements, applicable state privacy laws, vendor contracts and retention, accessibility, and incident response. Debrief must remain self-directed software and must not represent that it prepares, presents, or prosecutes an individual claim on a user’s behalf.

## Deployment

Create a PostgreSQL database, configure the environment variables in Vercel, connect a **Private** Vercel Blob store, run `prisma migrate deploy` during deployment, and deploy the Next.js project. For an existing database that was created with `prisma db push` and has no migration history, reconcile the baseline before using `prisma migrate deploy`. Before public release, verify all educational content against current official VA resources and complete privacy, security, accessibility, and legal reviews.

Required Production authentication values are `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL=https://veteran-claims-companion.vercel.app`, and `AUTH_CANONICAL_HOST=veteran-claims-companion.vercel.app`. Vercel masks secret values, so permanence is an operating control: confirm there is one Production `AUTH_SECRET`, do not replace it during normal releases, and record any intentional emergency rotation as an incident or planned maintenance event. A secret rotation signs users out and invalidates OAuth attempts already in progress.
