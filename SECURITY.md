# Security policy

Debrief is currently a closed alpha restricted to fictional information. Do not test with real health information, government identifiers, VA file numbers, credentials, or another person’s data.

Report a suspected vulnerability privately to the alpha administrator who invited you. Provide the affected route, a minimal fictional-data reproduction, expected behavior, and observed behavior. Do not include secrets or real claimant information and do not test against another person’s account.

For login failures, provide only the approximate UTC time, browser, route, and sanitized reference code shown by Debrief. Never send a password, multifactor code, OAuth authorization code, cookie, token, full callback URL, or screenshot containing Google account details.

The alpha administrator should treat suspected unauthorized access as an incident: preserve relevant infrastructure logs, stop affected processing, rotate exposed credentials, determine the data and users involved, and obtain legal advice on notification duties. The FTC Health Breach Notification Rule may apply to a future consumer health product even when HIPAA does not.

Real-data use is unsupported until the launch gates in `docs/alpha-readiness-audit.md` are closed.
