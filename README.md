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

26 automated tests pass, covering extraction, timestamps, citation validation, request guards and connector filtering. Production build passes. The local server pairing/import/poll path and extraction of a 33-page course PDF were verified. Tests mock AI responses: real paid transcription, real generated notes, print layout and installed-extension operation still need a user pilot.

All lecture content is session-only. Download backups before reloading. Pairing expires after 30 minutes and is held in server memory. This pilot does not automatically detect new lectures, persist a library, or process whole lectures. The extension imports visible supported links only; it does not bypass restrictions or inspect hidden portal state.

## Hosting

This increment runs locally. The connector is local-only and is not ready for Vercel deployment. Add application authentication, durable private storage, rate limits, retention controls and long-running processing before production hosting.

Never commit keys, passwords, university sessions, recordings, course documents or private notes. The repository contains generic code only.

## AI providers

Select OpenAI, Google Gemini / AI Studio, or Other OpenAI-compatible API in AI connection. Provider changes clear the key. Connection tests use the selected service's model-list endpoint, and do not prove billing or per-model feature access. Google keys use the x-goog-api-key header. Gemini supports inline WebM transcription with approximate timestamps and structured note generation. Default Gemini model is gemini-flash-latest; IDs are editable.

Compatible services need a public HTTPS API base URL, Bearer authentication, model listing, JSON chat completions and a notes model. For audio, they additionally need /audio/transcriptions with verbose_json segment timestamps and an audio model ID. APIs with other protocols or authentication are not supported automatically. Custom endpoints resolve to public IPv4 addresses and TLS connections are pinned to prevent DNS rebinding; redirects are not followed. Keys and content go only to the explicitly selected provider. Provider routing is covered by mocked tests; real Gemini and custom-provider processing still require a valid user key and quota.

Save the audio backup before updating/reloading. Restore a saved audio sample in the updated app to keep your recording. No API key from chat is embedded or reused.

## Shareable hosted pilot

The Vercel web version uses user-provided keys and session-only study data. Hosted document uploads are limited to 4 MB; local uploads allow 10 MB. Five-minute audio samples remain under 4 MB. The portal extension and pairing stay local-only; hosted users add permitted PDF/PPTX files manually. No account library or permanent media storage is provided. Download audio/notes before closing or refreshing. AI provider availability and account quotas still apply.

## University selection workflow (v0.3)

The primary UI no longer asks for manual lecture names or notes uploads. It asks users to install the browser connector once, sign into the university portal, enter a subject code, resolve any duplicate course matches, and choose a lecture from the live portal list. Find & import searches the chosen session's visible materials/pre-read/resource links and extracts up to five accessible documents. The extension bridge works on the production Vercel origin without a localhost server or server-memory pairing. No portal password is entered in CoachStudyBuddy.

The connector needs Chrome/Edge installation in the same profile as the portal and app. Live extension operation is not verified in the in-app browser, which cannot load it. Interactive cards without direct links may require opening the portal material panel and retrying. This is a pilot connector, not a guarantee that every resource can be imported.

## Transcript-first study library (v0.4)

The official transcript is preferred over paid speech-to-text. In the selected lecture player, the connector can invoke the visible Download Transcript control and read an exposed official download. It validates that the player identifies the selected session. If the portal does not expose the downloaded file to the connector, choose the downloaded TXT, VTT, SRT or JSON file. Missing timestamps stay untimed. Live portal download automation remains unverified; a success toast is not proof of a retrieved transcript.

Generate notes after importing the session resources. Teaching-style observations require transcript citations and may describe evidence such as examples and questions, never unsupported personality traits. Inputs above the current 200,000-character comparison limit are rejected before an AI request, rather than silently truncated.

Download a paginated PDF, or connect a fine-grained GitHub token scoped to a private study repository with Contents read/write. Tokens are kept in tab memory, never localStorage or Git. Repository visibility and push permissions are checked server-side on every save. The PDF, transcript JSON and study-pack JSON are committed together under `Term/Subject/Session number - name/`. Conflicting branch updates never force-push. Save the same folder again to update it with Git history.

Up to 30 processed sessions can be queued for one ZIP download or sequential GitHub saves. The queue stays in tab memory and warns before closing. Failed saves retain unfinished items. This is a bulk study-pack export, not automated downloading of every recording.

Optional video capture appears only after the server verifies a GitHub account email matching the deployment's `VIDEO_OWNER_EMAIL_SHA256`. Set this to the SHA-256 of the lowercase permitted email. Missing configuration, unverified emails, or unavailable email permissions deny access. The token needs Email addresses read permission for this check. Access is rechecked before capture. The browser still requires explicit screen/tab-sharing consent. Recording stops at 30 minutes or approximately 90 MB and downloads locally; it is not sent to AI or GitHub. Protected recordings are not bypassed.

Validation: parser, citation, PDF extraction, private repository enforcement, atomic commits and verified-email gate unit tests. Live university download, a real AI summary, authorized video capture and user-token GitHub export still need end-to-end verification.
