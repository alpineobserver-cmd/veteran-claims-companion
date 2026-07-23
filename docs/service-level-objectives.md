# Alpha service-level objectives

These objectives define measurable reliability targets for the closed fictional-data Alpha. They apply to the stable Staging tester release and, after promotion, the canonical Production service. They are not a promise of uninterrupted availability and do not authorize real health information.

## Targets and indicators

Measure product reliability over a rolling 30-day window and report Staging and Production separately.

| Service objective | Target | Service-level indicator |
| --- | ---: | --- |
| Availability | 99.5% | Successful non-5xx responses for the public entry, login, dashboard, claim builder, claim package, privacy, terms, and support routes divided by all monitored requests to those routes. Announced maintenance is reported separately, not silently discarded. |
| Sign-in success | 98.0% | Server-started Google sign-in attempts that establish a valid Debrief session divided by all server-started attempts. Report explicit user cancellation and confirmed provider outage separately and retain an unadjusted total. |
| Save success | 99.0% | Authenticated, valid claim create/update operations returning success divided by all valid save attempts. Report validation errors and version conflicts separately rather than counting them as infrastructure failures. |
| Export success | 99.0% | Authenticated, valid account or claim-package export requests returning a complete response divided by all valid export attempts. |
| Critical incident acknowledgement | 95% within 1 hour | Critical incidents acknowledged by the operational owner within one hour of detection or receipt. Target containment is four hours; recovery and notification duties are assessed per incident. |

High-severity non-critical support requests target acknowledgement within four business hours and an owned next step within one business day. Other Alpha support requests target acknowledgement within two business days.

## Error budgets and response

At 99.5% availability, the 30-day error budget is about 3 hours 39 minutes. The 98% sign-in target permits 2 failed attempts per 100; the 99% save and export targets permit 1 failed valid operation per 100. Small Alpha samples must show both the raw count and percentage so a single event is not hidden by rounding.

When an objective exhausts its error budget, pause non-essential feature promotion for the affected workflow, investigate the dominant failure mode, assign corrective work, and require a healthy verification window before resuming. A Critical incident may stop a release even when the rolling objective remains above target.

## Privacy-minimized measurement

Collect only the timestamp, environment, release, route or operation class, success/failure, safe error code, latency bucket, and a pseudonymous request or incident correlation value when necessary. Do not record names, email addresses, IP addresses in product analytics, questionnaire answers, condition names, claim facts, document names or contents, storage keys, tokens, or cookies.

The OPS-007 foundation now supplies public uptime, authentication-configuration, liveness, and coarse-latency checks plus privacy-minimized application error events. It does not yet measure authenticated save/export success or Google callback completion, and protected event export/retention/alert ownership remain open. These controls provide evidence but do not by themselves prove the rolling SLOs are met.

Review the definitions quarterly and after any architecture, authentication, persistence, or export change. Record approved definition changes with the release evidence so trend comparisons remain honest.
