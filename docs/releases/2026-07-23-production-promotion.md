# Debrief Production promotion record — July 23, 2026

- Release/version: `alpha-2026.07.23`
- Date and time: July 23, 2026 at 21:05:39 UTC
- Environment: Production
- Git commit: `9f2aaf03830aa3abd72078a97a5af3dc546fdc3f`
- Reviewed Staging commit: `482644d47aeb012bc3e9f3c0a054f70c680cf232`
- Reviewer: Repository owner plus the protected Debrief release gate
- Production approver: Repository owner `alpineobserver-cmd`, through explicit Production-promotion approval
- Decision: Approved after migration recovery and final security follow-up

## User-facing changes

- Added the fictional-data-only Exposure Record Check.
- Added a reversible compact workspace navigation mode.
- Carried the reviewed claim-builder, package, security, storage, monitoring, and content updates from Staging into Production.
- Hardened private download tickets by requiring canonical Base64URL payload and signature representations.

## Release evidence

- Staging release gate: passed for commit `482644d` in [run 30044603543](https://github.com/alpineobserver-cmd/veteran-claims-companion/actions/runs/30044603543).
- Production release gate: passed for commit `9f2aaf0` in [run 30044808091](https://github.com/alpineobserver-cmd/veteran-claims-companion/actions/runs/30044808091).
- Environment validation result: passed in the protected Staging and Production build paths.
- `npm run test:release` result: passed through the protected release gate.
- Database migration required: Yes.
- Migration status: the reviewed migrations through `20260722190000_storage_provider_routing` were included. A provider-specific role assumption initially blocked Production; the portable correction and known-failure recovery were applied through pull requests 24–26 before the final promotion.
- Backup or recovery prerequisite: the owner explicitly accepted the documented backup residual for this fictional-data Alpha. No backup-restore drill is represented as complete.
- Previous healthy rollback target: `e0a9fc64bd788048e764c9cc69b671d36eb23283`. A code rollback would not reverse a database migration.
- Staging smoke result: passed the public, login, liveness, provider, and session checks on July 23 at 21:51 UTC. Earlier signed-in Staging smoke evidence covered workspace, document, and claim flows.
- Production smoke result: passed the public, login, liveness, provider, and session checks on July 23 at 21:50 UTC. No Production claim or document data was changed during this reconciliation.
- Scheduled-monitor activation: the default-branch health workflow completed successfully in [run 30047789747](https://github.com/alpineobserver-cmd/veteran-claims-companion/actions/runs/30047789747).
- Changelog updated: Yes.

## Known risks and deferred items

- Real information remains prohibited.
- Human VoiceOver, full human keyboard-only, representative physical-device, and disposable-account deletion checks remain open.
- A deliberately failing public health-alert drill was not run because it would create a misleading public incident issue. Named alert recipients, escalation rules, tested failure delivery, and the public incident-history decision remain under OPS-008.
- Provider backup evidence and an isolated restore drill remain open under OPS-009.

## Promotion and recovery links

- [Initial Production promotion — PR 20](https://github.com/alpineobserver-cmd/veteran-claims-companion/pull/20)
- [Provider-portable database hardening — PR 24](https://github.com/alpineobserver-cmd/veteran-claims-companion/pull/24)
- [Known migration recovery — PR 25](https://github.com/alpineobserver-cmd/veteran-claims-companion/pull/25)
- [Recovered Production promotion — PR 26](https://github.com/alpineobserver-cmd/veteran-claims-companion/pull/26)
- [Canonical private-ticket validation — PR 27](https://github.com/alpineobserver-cmd/veteran-claims-companion/pull/27)
- [Final Production follow-up — PR 28](https://github.com/alpineobserver-cmd/veteran-claims-companion/pull/28)

This record intentionally excludes secrets, tokens, account identifiers, claim answers, filenames, and authentication screenshots.
