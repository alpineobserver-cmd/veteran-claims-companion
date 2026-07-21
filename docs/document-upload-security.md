# Fictional document upload boundary

Debrief accepts only entirely fictional Alpha test documents. Passing these checks does not establish that a file is malware-free, authorize real medical information, or replace the malware-scanning and security-review gates.

## Checks applied before storage

- The request and decoded file are each limited to approximately 4 MB.
- Empty files and content outside PDF, JPEG, and PNG signatures are rejected.
- The final filename extension must agree with the detected content type.
- A browser-declared MIME type, when present, must be accepted and agree with the detected content.
- Filenames are normalized and rejected for path separators, control characters, bidirectional-control characters, dangerous embedded executable/archive extensions, or excessive length.
- PDF files require a supported header, terminal cross-reference marker, page/object/stream limits, bounded declared stream sizes, bounded decoding chains, and image-dimension limits. Encrypted, embedded, executable, JavaScript, launch, rich-media, and XFA content is rejected.
- JPEG files require a valid frame, scan marker, terminal marker, bounded segment count, and decoded-dimension limit.
- PNG files require valid chunk boundaries and CRCs, required header/data/end chunks, bounded chunk count, decoded-dimension limits, and no animated-PNG control chunks.
- Trailing data is rejected to reduce polyglot-file risk.

The application stores the accepted file but does not OCR, extract archives, execute content, render server-side previews, or feed files to AI. Malware scanning and quarantine remain required before any real-data decision.

Run `npm run test:storage` for the upload/parser and private-delivery regression suite.
