# Google strong-authentication enforcement

Debrief can require Google to report a strong authentication method before accepting a Google sign-in. The accepted methods are Google multi-factor authentication (`mfa`), a hardware security key (`hwk`), or a software key such as a passkey (`swk`). A password-only response is rejected when enforcement is active.

Email codes are not used as a second factor. An email code delivered to the same Google account does not create an independent authentication channel, and NIST SP 800-63B does not permit email for out-of-band authentication.

## Google configuration prerequisite

Before changing the Debrief control from `disabled`:

1. In Google Auth Platform, confirm the Debrief OAuth application is published and verified.
2. Open **Settings**, then **Advanced Settings**.
3. Enable **Session age claims** and **Authentication strength claims** in the Google Security Bundle.
4. Use only the dedicated fictional Staging account for the rollout test.

Google may omit the `amr` claim even when Debrief requests it. Enforcement therefore fails closed when the claim is missing.

## Rollout control

Set `DEBRIEF_GOOGLE_MFA_ENFORCEMENT` independently in each Vercel project:

- `disabled`: request the Google claims but do not evaluate them.
- `audit`: record only whether strong authentication was present or missing. Do not record the authentication methods, email address, token, or profile.
- `enforced`: block Google sign-in unless an accepted strong method is present.

Move Staging to `audit` first. Complete sign-in with the fictional account using both a password-only attempt and an approved second factor, inspect the privacy-minimized security events, then move Staging to `enforced`. Production remains `disabled` until a separate reviewed promotion decision.

## Manual verification

1. Open the canonical Staging login page in a private browser window.
2. Sign in with the fictional Google account without completing a strong factor. Confirm Debrief blocks the attempt with reference `MfaRequired` after enforcement is active.
3. Sign in again using Google 2-Step Verification, a passkey, or a hardware key. Confirm Debrief opens the requested private page.
4. Sign out, begin a fresh browser session, and repeat once to ensure an older Google session is not masking the challenge.

Do not automate or store Google passwords, passkeys, security keys, recovery codes, cookies, or session files.
