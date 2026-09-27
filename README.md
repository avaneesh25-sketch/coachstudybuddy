# CoachStudyBuddy

A BYOK web application for turning permitted lecture audio and course slides into source-backed study notes.

## Current increment

- Next.js application with responsive lecture workspace and AI connection settings.
- OpenAI API key test via a fixed server-side provider endpoint. Keys remain in page memory, pass through the server only for the request, and are never explicitly persisted or logged. Clear key or reload to remove the key from the page.
- Lecture drafts with local PDF/PPTX selection. These are memory-only: no upload, extraction or persistence yet.
- Explicit pending states for capture, transcription, comparison and PDF export. No simulated AI results.

## Run

Node.js 20.9+ and pnpm. Run `pnpm install`, `pnpm dev`; open http://127.0.0.1:3001. Production check: `pnpm build`. Tests: `pnpm test`.

## Workflow roadmap

1. BYOK setup and lecture draft (this increment).
2. User-initiated permitted tab-audio capture, short sample first; verify audio before paid transcription.
3. Timestamped transcription and PDF/PPTX extraction, with a clear disclosure and cost estimate before sending content to the chosen provider.
4. Compare slides and transcript; cite slide numbers and timestamps for professor additions, examples and explicit emphasis. Flag gaps and uncertainty.
5. Reviewable integrated notes and polished PDF export.
6. Optional authorized course connectors and idempotent detection of new/revised materials.

## Hosting boundary

Lovable is not required. Vercel is a candidate for the Next.js frontend and short request handlers. Add authentication, request rate limits, private storage, retention controls and a durable processing worker before production hosting. This development preview is not production hardened. Hosting is not configured.

Do not commit API keys, university passwords, browser sessions, course files, recordings or generated private notes. The repository contains generic code only. Use official transcripts or permitted capture; do not bypass access or download restrictions.

Provider reference: https://developers.openai.com/api/reference/resources/models/methods/list
