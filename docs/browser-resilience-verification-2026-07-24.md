# Browser workflow, recovery, and scale verification

Date: July 24, 2026  
Scope: local isolated Chromium; fictional data only  
Production changes: none

## What is now repeatable

The Playwright browser suite starts an isolated local Debrief server with external AI and uploads disabled. It does not create an authentication bypass, use a Google account, contact the Production database, or process real information.

The functional suite verifies:

- All 11 Claim Builder steps for one fictional original claim
- Intent-to-file response, service context, current symptoms, timeline, treatment, evidence, review, and guided statement generation
- Privacy-minimized drafting-history creation
- Immediate browser autosave of a generated statement before the user leaves the statement step
- Statement-section verification
- Real PDF-handler download initiation and a non-empty browser download
- Device-only save, refresh, and resume
- Explicit fresh-claim isolation from an older incomplete draft
- Progress made while the browser is offline, followed by refresh and route navigation
- Safe recovery and retained answers when drafting fails
- Suppression of rapid duplicate generation requests
- Ten retained fictional workspaces, 20 statement versions, 50 generation-history entries, long answers, and a long workspace title
- No document or body horizontal overflow at 390 × 844, 768 × 1024, or 1440 × 1000

Three reviewed macOS Chromium screenshot baselines cover:

- The public landing page at desktop width
- The first Claim Builder step at mobile width
- A large statement workspace at desktop width

Pixel comparison is intentionally local and platform-specific. CI runs the browser behavior and geometry checks but skips macOS pixel comparisons. New baselines must be reviewed rather than accepted automatically.

## Defects found and corrected

1. **Statement-step refresh loss.** Signed-out drafts were saved when moving between steps, but a statement generated or edited on the current step could be lost if the user refreshed before continuing. Device-only draft state now autosaves after every draft-state change.
2. **Repeated fresh-start reset.** The one-time `new=1` marker remained in the address after initialization. Refreshing an in-progress new claim could archive it and reset the questionnaire. Debrief now removes the marker immediately after the new workspace is initialized.
3. **Raw network error wording.** A browser-level drafting failure could show `Failed to fetch`. Debrief now presents a stable recovery message explaining that the answers remain saved.

Each correction is exercised by the permanent browser suite.

## Commands

```bash
npm run test:browser
npm run test:browser:update
```

`test:browser:update` changes the approved local screenshot baselines. Use it only when the visual change is intentional and the new images have been inspected.

## Remaining human or hosted evidence

- Real Google OAuth using a disposable fictional account
- Signed-in database autosave and resume through the hosted Staging environment
- Physical iPhone, iPad, Android, Windows, and macOS browser coverage
- Human confirmation that the native downloaded PDF opens correctly
- Keyboard-only and screen-reader completion
- Moderated low-fluency usability sessions

These items remain open in the product backlog and are not implied by the local browser pass.
