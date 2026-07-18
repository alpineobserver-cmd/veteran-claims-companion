# Veteran Claims Companion

An independent educational and organizational MVP for veterans preparing VA disability claim materials. It does not submit claims, give legal advice, or represent the Department of Veterans Affairs.

## Included in this increment

- Responsive Next.js 15 dashboard and application shell
- Auth.js database sessions with Google and email magic-link providers
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

Google OAuth callbacks use `/api/auth/callback/google`. Email authentication requires an SMTP server. The dashboard currently displays intentional demo data so the UX can be reviewed before an account is created.

## Personal statement drafting

The last step of the claim builder can turn a veteran's questionnaire answers into an editable personal-statement draft. Set `OPENAI_API_KEY` in the server environment to enable AI-assisted drafting. `OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`.

The API key must remain server-side. Statement requests use the OpenAI Responses API with storage disabled. The optional display name is added by the application and is not included in the source material sent to the model. If no API key is configured, the same interface creates a clearly labeled guided-template draft directly from the answers so the MVP remains reviewable.

The claim builder also works without AI. It branches by claim path, provides condition-aware prompts, builds a chronology, links facts to supporting information, and checks for common preparation gaps. Users confirm each statement section before downloading a PDF review package. The package is an independent preparation attachment, not a completed VA form and not evidence that anything was submitted to VA.

Signed-in users can save versioned questionnaire snapshots to PostgreSQL, reopen them from the dashboard, and continue on another device. Signed-out users retain a browser-only draft and are invited to move it to their account when they sign in and save. The API verifies claim ownership on every read, update, and delete operation and rejects stale updates from another browser tab. This increment does not accept medical-document uploads; those require a configured private object-storage provider, content validation, malware scanning, and retention controls.

## Synthetic document intake

The `/intake` workflow is a test-only foundation for the larger evidence-assisted process. It accepts PDF, JPEG, and PNG files up to 4 MB only after the signed-in user confirms that the file is entirely fictional or synthetic. File signatures are checked on the server, objects use random immutable keys, downloads and deletion require ownership, responses disable browser storage, and upload/download/delete actions are audited without logging document names or contents.

Local development stores synthetic files under the ignored `.data/` directory. For Vercel, create a Blob store from the project's Storage tab, set its access to **Private**, and connect it to the project. Vercel adds the required storage credential automatically; legacy token-based stores use `BLOB_READ_WRITE_TOKEN`. Private Blob requires `@vercel/blob` 2.3 or newer.

This milestone does not include malware scanning, OCR, AI analysis, real-record authorization, or a production health-data compliance determination. Do not use it for real medical information, Social Security numbers, VA file numbers, or third-party records.

## Deployment

Create a PostgreSQL database, configure the environment variables in Vercel, connect a **Private** Vercel Blob store, run `prisma migrate deploy` during deployment, and deploy the Next.js project. For an existing database that was created with `prisma db push` and has no migration history, reconcile the baseline before using `prisma migrate deploy`. Before public release, verify all educational content against current official VA resources and complete privacy, security, accessibility, and legal reviews.
