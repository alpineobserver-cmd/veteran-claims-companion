# Accessibility target and review process

Debrief targets **WCAG 2.2 Level AA** for the public pages and authenticated claim-preparation workflow. This is an engineering and product target, not a certification. Automated checks can prevent known regressions, but they do not establish conformance on their own.

## When a review is required

- Run the automated accessibility and release suites for every pull request into `staging` or `main`.
- Manually review any materially changed route or component before its Staging release.
- Exercise the complete critical path before a Beta decision: entry, sign-in, workspace creation, claim questionnaire, guided statement, verification, package, export, account export, and deletion.
- Repeat the affected checks after an accessibility defect is corrected. Perform a complete review before a broader real-user or real-data release.

Only fictional scenarios may be used. Accessibility reports and evidence must not contain health information, claim facts, account credentials, or private screenshots.

## Manual review matrix

Record the browser, operating system, viewport, assistive technology, release commit, routes, result, and finding IDs for each review.

1. **Keyboard only:** complete every action without a pointer; confirm logical focus order, visible focus, no keyboard trap, skip/return paths, and restoration of focus after menus or dialogs close.
2. **Screen reader:** use VoiceOver with Safari on macOS and at least one mobile pass with VoiceOver on iOS. Confirm headings, landmarks, names, descriptions, statuses, errors, progress, and link purpose are understandable.
3. **Zoom and reflow:** review at 200% browser zoom and at 320 CSS pixels wide. Content and controls must reflow without loss of information, two-dimensional scrolling, or obscured focus.
4. **Text and non-text contrast:** verify normal text, large text, focus indicators, control boundaries, icons, charts, and status indicators against WCAG 2.2 AA thresholds. Never rely on color alone.
5. **Forms and errors:** confirm visible labels, instructions before input, required state, error identification, suggested correction, retained answers, and a summary that sends focus to the problem.
6. **Touch and pointer:** verify target size, spacing, cancellation, drag alternatives, and that hover-only information is also available by keyboard and touch.
7. **Motion and time:** honor reduced-motion preferences; avoid unnecessary time limits; provide warning and extension when a security limit is necessary.
8. **Language and readability:** confirm the page language, plain wording, expansion of uncommon abbreviations, and consistent navigation and help.

## Findings and release decisions

Use these severities:

- **Blocker:** a critical task cannot be completed with an assistive technology or keyboard.
- **Critical:** a user may lose work, make an unsafe choice, or cannot perceive an essential warning or error.
- **Major:** WCAG 2.2 AA failure with a viable but burdensome workaround.
- **Minor:** localized issue that does not prevent task completion.

Blocker and Critical findings stop promotion. Major findings require correction before Beta unless the product owner records the affected criterion, user impact, temporary accessible alternative, owner, and dated remediation plan. Exceptions are never silent or permanent. Minor findings remain tracked with an owner and target release.

## Evidence record

Each review record should contain:

- release and commit;
- reviewer and date;
- routes and workflows checked;
- devices, browsers, viewport sizes, and assistive technologies;
- automated commands and results;
- finding ID, WCAG criterion, severity, reproduction steps, and affected users;
- owner, target release, correction, and independent retest result;
- the promotion decision and approver.

Store privacy-safe records with the release evidence. Do not place tester identities, health information, claim facts, credentials, or private screenshots in GitHub.
