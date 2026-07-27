# Personal-statement generation audit trail

Last reviewed: July 24, 2026

## Purpose

Debrief preserves a small, user-linked history of each personal-statement drafting attempt so a reviewer can tell which drafting path ran, which policy governed it, what categories of saved information were referenced, whether the attempt succeeded, and what the user later did with the result.

The history is part of the claim draft. It follows the same owner checks, account export, workspace deletion, and account-deletion controls as the rest of that draft. It is not an operational security log and is not sent to a separate monitoring provider.

## Recorded fields

- Random generation identifier
- Feature name (`personal_statement`)
- Drafting mode: AI-assisted, guided template, or missing-information preflight
- Provider model identifier, or a clear non-provider value such as `guided-template` or `not-called`
- Prompt or generation-policy version
- Completion timestamp
- Result: ready, needs information, or failed
- User disposition: pending review, accepted, rejected, regenerated, edited, saved, downloaded, exported, needs information, or failed
- Source references limited to questionnaire field names and timeline positions

## Deliberately excluded

- Questionnaire answer text
- Generated or edited statement text
- Names and email addresses
- Document names, contents, citations, storage keys, or hashes
- Provider request or response bodies
- Prompts and API credentials
- Token values, cookies, or authentication identifiers

The actual statement, questionnaire, and source trace remain in their existing claim-draft fields. The audit trail does not duplicate them.

## Lifecycle

- A drafting attempt adds one entry when the server returns a ready, needs-information, or failed result.
- A browser/network failure that prevents a server result adds a local failure entry with model and policy marked unknown.
- Starting a new attempt marks the previous active result as regenerated.
- Editing, saving, rejecting, downloading, section-verifying, or exporting updates the latest active result’s disposition.
- Signed-in drafts autosave the history with the claim. Signed-out fictional drafts keep it in the same browser storage as the rest of the fictional draft.
- Workspace or account deletion removes the history with the containing draft. Account export includes it inside `Claim.draftData`.

This trail does not prove that generated wording is accurate, approved, or safe. Statement source tracing, record citations, user verification, AI evaluation, and the real-data/AI release gates remain separate controls.
