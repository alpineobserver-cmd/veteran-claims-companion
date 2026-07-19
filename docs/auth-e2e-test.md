# Authentication end-to-end test

This procedure verifies the complete Google callback without placing a Google password, recovery code, cookie, or session file in source control or CI.

## Dedicated fictional Alpha account

1. Create a Google Account used only for Debrief Alpha testing. Do not use a veteran's identity, records, or real claim information.
2. Give the account a fictional display name and enable multifactor authentication.
3. Store its password and recovery material only in the owner's password manager. Never add them to GitHub, Vercel, `.env` files, test fixtures, screenshots, or support messages.
4. Add the exact account email under **Google Auth Platform → Audience → Test users**.
5. Record the account owner and recovery contact in the private operating records, not this repository.

Google account login remains a human verification step. Automating a Google password or MFA flow would create a reusable credential in the test system and is intentionally prohibited.

## Automated boundary test

Run a built Debrief server locally, then execute:

```bash
npm run build
npm start
AUTH_E2E_BASE_URL=http://localhost:3000 npm run test:auth
```

After deployment, run the same non-credential boundary checks against Production:

```bash
AUTH_E2E_BASE_URL=https://veteran-claims-companion.vercel.app npm run test:auth
```

The automated suite checks the login page, provider and callback URLs, unauthenticated session response, cache controls, and branded error recovery.

## Human callback verification

1. Open a private browser window.
2. Visit only `https://veteran-claims-companion.vercel.app/login`.
3. Select **Continue with Google** once.
4. Sign in with the dedicated fictional Alpha account.
5. Confirm Google returns to `/dashboard` on the canonical domain.
6. Confirm refreshing the dashboard preserves the authenticated session.
7. Sign out and confirm protected pages require a new login.
8. Check Vercel logs for `sign_in_started`, `sign_in_succeeded`, and `sign_out_succeeded`. The records must not contain an email, name, token, cookie, or document information.
9. Record the date, deployment commit, browser, pass/fail result, and any sanitized error code below.

| Date | Commit | Browser | Result | Error code/notes |
|---|---|---|---|---|
| _Pending first run_ |  |  |  |  |
