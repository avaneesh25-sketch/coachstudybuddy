# University connector v0.3

Load this folder as an unpacked Chrome/Edge extension. Reload CoachStudyBuddy after installing or upgrading. Open https://coachstudybuddy.vercel.app or http://127.0.0.1:3001 in the same browser profile, click Sign in to university portal, complete sign-in directly there, then search a subject code and select a lecture.

The app content script accepts only known request types from its own window/origin. The extension background accepts only the production app and explicit local development origins. Portal access is limited to coach.mastersunion.org. No cookies, credentials, private API calls, recordings or hidden framework state are read. Only user-triggered visible-page navigation and extraction are performed. The bridge uses browser messages, not server pairing or persistent tokens.

Course lookup preserves termCourseId because codes may repeat. Lectures are parsed from visible session labels, and the chosen session is expanded using normal read-only controls. Accessible direct Filestack document links are returned to the app, which requests extraction. Interactive cards without links and protected or external documents can remain unsupported. No claim of complete course coverage is made.

This is a development extension, not a store release. Live extraction must be verified after installation. No fake lecture choices or private course data are bundled.
