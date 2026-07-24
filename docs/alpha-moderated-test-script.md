# Debrief moderated Alpha test script

Recommended session length: 35–45 minutes  
Required data boundary: fictional scenario and fictional documents only

## Before the session

- Assign neutral codes: one `T-###` tester code and one `AS-####` session code.
- Confirm the tester's exact Google email is allowlisted in Google OAuth Testing. Keep that address out of project files and observation notes.
- Send only `https://debriefclaims.com`.
- Prepare a fictional scenario and optional fictional files. Never ask a tester to adapt their real history.
- Open the scorecard fields in `docs/alpha-success-measures.md` and the feedback register.
- Confirm there are no open Blocker or Critical items affecting the planned test.

## Opening statement

> Thank you for helping test Debrief. We are testing the product, not you. Please think aloud and tell me what you expect before you click. Use only the fictional scenario provided—do not discuss or enter real medical information, real claim details, government identifiers, credentials, or another person's information. I may ask what you are thinking, but I will not guide you unless you become fully stuck. You may stop at any time.

Confirm verbally that the tester understands the fictional-data restriction, will use the assigned scenario, and will not share passwords, authentication codes, or private Google account screens.

## Baseline question

Before opening the site, ask:

> On a scale from 1 to 5, how confident are you that you understand how to organize the fictional scenario into a claim package and know what to do next?

Record only the number as `confidenceBefore`.

## Tasks and neutral prompts

Start the session timer when the tester opens the canonical address. Do not demonstrate the interface first.

### Task 1 — Understand the service and sign in

> Open the link and tell me what you think this service does, what it does not do, and what you would do next.

Observe whether the tester finds login, understands the fictional-data boundary, and reaches the dashboard. If stuck, ask only: “What are you looking for?”

### Task 2 — Create a workspace and begin a fresh claim

> Create a workspace for the fictional scenario and begin a new claim.

Observe labels, button choice, forward direction, accidental reuse of old work, and whether the first questionnaire section is reached. Start the Claim Builder timer at the first question.

### Task 3 — Add fictional evidence if provided

> Add the fictional document provided and connect it to the appropriate work.

If no document is provided, record upload as not tested. Do not ask the tester to find another file.

### Task 4 — Complete the questionnaire and review the draft

> Work through the fictional claim. Review the resulting statement and edit it until you consider it usable, or tell me why you cannot.

Observe abandonment, navigation between sections, missing-information prompts, unsupported language, editing control, and whether the tester understands the review checklist. Stop the Claim Builder timer when the tester first considers the draft usable.

### Task 5 — Save, leave, and resume

> Save your progress, leave the workspace, and then return to continue it.

Record attempted/succeeded without collecting claim content.

### Task 6 — Package, export, and next step

> Prepare and export what you can, then tell me what you believe you should do next.

Observe whether the tester distinguishes preparation/export from actual VA submission and whether the next action is clear.

### Optional Task 7 — Delete test data

> Delete the fictional workspace or account data created during this test.

Use this task only when deletion behavior is in scope and the tester understands that the data is fictional.

## Moderator rules

- Ask “What did you expect?” and “What would you look for next?” instead of teaching the interface.
- Do not answer product questions until the relevant task is complete.
- Record observable behavior and neutral product feedback, not assumptions about the tester.
- Never transcribe statement content, questionnaire answers, document names, or Google account details.
- If real information is entered or disclosed, stop the session, avoid copying it into notes, and follow the privacy/security process.
- If a Blocker or Critical issue appears, stop the affected test path and create a sanitized feedback record immediately.

## Closing and recording

Use `docs/alpha-post-test-survey.md` and ask the confidence question exactly as written.

1. Complete the structured scorecard in `evals/alpha-session-results.json`.
2. Run `npm run eval:alpha`.
3. Add each actionable observation to the feedback register or link it to an existing canonical item.
4. Confirm whether the tester wants their fictional Alpha data deleted.
5. Remind the tester not to send real claim or health details in follow-up messages.
