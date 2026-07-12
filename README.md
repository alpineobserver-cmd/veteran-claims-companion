# Veteran Claims Companion

An independent educational and organizational MVP for veterans preparing VA disability claim materials. It does not submit claims, give legal advice, or represent the Department of Veterans Affairs.

## Included in this increment

- Responsive Next.js 15 dashboard and application shell
- Auth.js database sessions with Google and email magic-link providers
- PostgreSQL/Prisma domain model for claims, evidence, uploads, forms, statements, questions, and progress
- Seed content for conditions, evidence types, templates, and VA forms
- Provider interfaces for future file storage and AI integrations
- Accessible navigation, responsive layouts, and required disclaimer content

## Local setup

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set database/auth/provider values.
3. Run `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate -- --name init` to generate and apply the initial migration.
5. Run `npm run db:seed`.
6. Start with `npm run dev`, then open `http://localhost:3000`.

Google OAuth callbacks use `/api/auth/callback/google`. Email authentication requires an SMTP server. The dashboard currently displays intentional demo data so the UX can be reviewed before an account is created.

## Deployment

Create a PostgreSQL database, configure the environment variables in Vercel, run `prisma migrate deploy` during deployment, and deploy the Next.js project. Before public release, verify all educational content against current official VA resources and complete privacy, security, accessibility, and legal reviews.
