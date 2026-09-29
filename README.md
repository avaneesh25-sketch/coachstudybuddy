# CoachStudyBuddy

A local BYOK lecture study pilot, built with Next.js. Uses permitted lecture audio and course documents to produce source-linked notes.

## Run

Use Node.js 20.9+ and pnpm. Run `pnpm install`, `pnpm build`, then `pnpm start`. Open http://127.0.0.1:3001. For development use `pnpm dev`. Run `pnpm test` for automated tests.

## Pilot workflow

1. Enter your own OpenAI API key in AI connection. Keys stay in page memory and are passed to the fixed provider endpoints only for requests; they are not deliberately saved or logged.
2. Create a lecture draft. Follow `/connector` to load the provided Chrome/Edge extension, pair it with the local app, and import visible course document links. Open the normal document tab if the portal card has no visible link. The connector does not read university passwords or cookies.
3. Fetch documents for local PDF/PPTX text extraction. A file fallback is available. Current supported remote documents are direct Filestack links. Scanned PDFs and diagram interpretation are not supported.
4. Capture up to five minutes of permitted lecture tab audio at 1x. The browser requires user selection and audio sharing. Listen to the sample before sending it for paid Whisper transcription. Timestamps are sample-relative.
5. Send the transcript and extracted slides to OpenAI for cited additions, examples, explicit emphasis and integrated notes. Review the result, save JSON, or use Print / Save PDF.

## Verified and limitations

19 automated tests pass, covering extraction, timestamps, citation validation, request guards and connector filtering. Production build passes. The local server pairing/import/poll path and extraction of a 33-page course PDF were verified. Tests mock AI responses: real paid transcription, real generated notes, print layout and installed-extension operation still need a user pilot.

All lecture content is session-only. Download backups before reloading. Pairing expires after 30 minutes and is held in server memory. This pilot does not automatically detect new lectures, persist a library, or process whole lectures. The extension imports visible supported links only; it does not bypass restrictions or inspect hidden portal state.

## Hosting

This increment runs locally. The connector is local-only and is not ready for Vercel deployment. Add application authentication, durable private storage, rate limits, retention controls and long-running processing before production hosting.

Never commit keys, passwords, university sessions, recordings, course documents or private notes. The repository contains generic code only.
