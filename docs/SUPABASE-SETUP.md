# Activate the managed student workspace

Code is available at /student. The existing homepage remains available until COACH_MANAGED_ENABLED=true.
Students supply no API keys. The operator funds/manages Groq and Gemini quotas.

## 1. Create Supabase
Create a project called coachstudybuddy at https://supabase.com/dashboard .
Keep the database password private. Apply supabase/migrations/202610150001_study_library.sql in the SQL editor.
This creates private course access, summary metadata, usage counters and a private PDF bucket.
Do not add public bucket access or student write policies.

## 2. University SSO and enrolment
Configure the university SAML identity provider for mastersunion.org in Supabase Auth.
Supabase SAML SSO may require a paid plan: verify your plan before enabling it.
Register https://coachstudybuddy.vercel.app/api/study/callback as an allowed redirect; use the exact preview callback when testing.
The application uses server-side PKCE and HttpOnly session cookies. University email alone is not course access.
An approved university LMS integration must populate course_access with:
user_id (Supabase Auth UUID), term_course_id (portal UUID), course_code, term,
subject_name, active, expires_at, verified_by (trusted integration/source reference).
No browser endpoint can grant enrolment. Refresh/revoke records from the authoritative LMS.
The LMS sync itself requires the university's API/SSO documentation and credentials and is NOT implemented by this migration.

## 3. Vercel environment (server only)
Set these in the CoachStudyBuddy project using Vercel's secure environment-variable fields:
- SUPABASE_URL: project HTTPS URL, no trailing slash
- SUPABASE_ANON_KEY: legacy anon API key
- SUPABASE_SERVICE_ROLE_KEY: service_role key; never put it in NEXT_PUBLIC variables
- GROQ_API_KEY: operator key for whisper-large-v3-turbo
- GEMINI_API_KEY: operator key
- GEMINI_NOTES_MODEL: an available structured-output Gemini model tested for the project
- SITE_URL: https://coachstudybuddy.vercel.app (exact deployment origin)
- COACH_MANAGED_ENABLED: leave false until verification is complete, then true

Provider credentials are read only on the server. Student-supplied keys/model headers are ignored by managed endpoints.
Free provider plans have quotas and data-use terms; they do not guarantee free service at classroom scale.
The initial daily processing caps are 60 audio requests and 10 note requests per student;
global caps are 300 audio requests and 50 note requests (UTC). Attempts consume allowance.
No background automatic provider retries or paid-plan upgrades occur.

## 4. Verify before activation
- Sign in with university SSO, confirm another domain/non-SSO account is rejected.
- Confirm a university user without current enrolment cannot generate, list or download that course.
- Import one course/session, build a short test pack, verify the PDF and its storage entry.
- Select the same session again: the saved-summary dialog must offer download without AI calls.
- Verify another term/course with the same subject code does not reuse the first session.
- Verify an authorised second student can download while an unauthorised student cannot.
- Attempt client-side metadata/signature tampering; saving must reject it.
- Test two concurrent saves; only one session record should survive.
- Refresh login during a long capture; existing audio must remain in the tab.
Then enable COACH_MANAGED_ENABLED and redeploy.

Existing private GitHub PDFs are NOT automatically migrated. Keep the old private library intact
until course/session identifiers and access records have been mapped and migration verified.
The managed library saves generated session PDFs; original resources remain in the university portal.
