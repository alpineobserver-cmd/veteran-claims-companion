# Operational kill switches

These environment controls let the Debrief administrator contain a risky function without changing source code. They default to enabled when absent. An unrecognized non-empty value fails closed, and deployment validation rejects it.

| Environment variable | Disabled behavior | Behavior that remains available |
| --- | --- | --- |
| `DEBRIEF_UPLOADS_ENABLED` | Rejects new document uploads with a temporary-pause message | Authentication, existing-file download and deletion, claims, and account deletion |
| `DEBRIEF_AI_GENERATION_ENABLED` | Prevents requests to the configured AI provider | The free deterministic guided narrative, saved work, editing, and export |
| `DEBRIEF_REGISTRATIONS_ENABLED` | Rejects Google accounts that have never been linked to Debrief | Existing linked accounts can still sign in and delete or export their data |

Accepted enabled values are `true`, `1`, `on`, and `enabled`. Accepted disabled values are `false`, `0`, `off`, `disabled`, `pause`, and `paused`.

## Emergency procedure

1. In the affected Vercel project, change only the required variable in the Production environment.
2. Redeploy the same known-good commit so the environment change reaches all functions. This is an operational redeployment, not a code release.
3. Confirm the disabled path returns the expected pause behavior and unaffected recovery/deletion paths still work.
4. Record the time, reason, operator, affected environment, verification result, and incident or feedback reference. Never put secrets or user health information in that record.
5. Investigate and remediate before re-enabling. Redeploy and run the same verification after restoring the control.

If multiple controls are needed, disable them separately so the response can be verified after each change. Rotating or deleting credentials remains a separate emergency action.
