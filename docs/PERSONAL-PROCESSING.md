# Personal processing and shared course access

The normal workspace supports personal audio/transcript/material processing before university SSO. It uses the site's Groq Whisper and Gemini keys, never student-supplied keys. Sources are submitted only when the student requests processing. Generated personal PDFs download to the student's device; they are not saved to or read from the shared course library.

Personal endpoints require a same-origin request and a signed, HttpOnly, Secure-on-HTTPS, SameSite=Strict browser cookie valid for one day. This identifies a processing session, not a verified university user. A new browser session can get a new allowance; it is not an enrolment or identity boundary.

Before each provider attempt, the existing database allowance function atomically limits each session to 60 transcription parts and 10 note requests per UTC day, with a shared site-wide cap of 300 transcription parts and 50 note requests, including verified-user requests. Attempts count, including failures. Provider quotas may be lower. These limits do not guarantee free usage if the owner has enabled paid provider billing. No automatic provider/model upgrade or provider retry is performed.

Shared library routes retain university SSO plus course-enrolment checks. Personal endpoints do not generate shared-library attestations. Personal video saving retains the original exact verified-email account gate. Portal detection is a UI convenience and never grants access to shared content or owner video tools.

Production checks should use a short synthetic audio clip and synthetic source text, not another student's content. Never log keys, signed cookies, or the service-role credential.
