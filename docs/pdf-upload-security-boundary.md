# PDF upload security boundary

Debrief's closed Alpha accepts fictional files only. PDF inspection verifies structural and size limits, but it is **not** malware scanning and does not prove a PDF has no active content. PDF syntax permits escaped names and compressed object streams, so a regular-expression blocklist cannot provide that guarantee.

Alpha controls are compensating controls: private owner-scoped storage, attachment-only delivery, `nosniff`, no in-app viewer, no sharing, a fictional-data-only requirement, and opaque storage paths. Documents remain untrusted attachments.

Before accepting real claimant or medical documents, Debrief must implement quarantine-and-scan: upload into a non-readable quarantine location, scan with a maintained malware/content service, record the result, promote only clean objects to private storage, and retain a security audit record. This is a release gate.
