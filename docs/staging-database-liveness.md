# Staging database liveness

## Purpose

Debrief Staging uses a daily, database-only liveness request to reduce the risk that Supabase pauses its Free Plan project for inactivity. This is an operational availability check, not a user-data monitor.

## Behavior

- Vercel invokes `GET /api/cron/database-liveness` daily at 09:00 UTC on the Staging Vercel project's Production deployment.
- The route requires `Authorization: Bearer <CRON_SECRET>` and fails closed with `401` when the secret is missing or wrong.
- In `APP_ENV=staging`, the route executes only `SELECT 1` through Prisma.
- It does not query, write, export, log, or return application tables, claims, users, documents, sessions, storage keys, or health information.
- In any non-Staging environment, an authorized request returns `204` and does not connect to the database.

## Required configuration

Set a random `CRON_SECRET` only in the **Production environment of the Debrief Staging Vercel project**. Do not add its value to GitHub, `.env.example`, browser-visible variables, Preview, or the Production Debrief project. The empty placeholder in `.env.example` is intentional.

Vercel automatically attaches the secret as a Bearer token to configured cron requests. Verify runs in the Staging Vercel logs by route, status, and timestamp only; do not record request headers or secret values.

## Failure response

- A `401` indicates missing or mismatched cron authorization. Confirm the Staging project's `CRON_SECRET` exists and redeploy the Staging project.
- A `503` means the database could not answer `SELECT 1`. Treat it as a Staging availability issue and use the Supabase dashboard before retrying. Do not put user or claim data into incident notes.
- If Supabase pauses the project despite the check, restore it from Supabase Studio and record only the timestamp and provider status in the operational log.
