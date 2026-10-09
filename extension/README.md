# University connector v0.10

Install in Chrome or Edge and sign in to the university in the same browser profile. The in-app browser cannot load this extension.

The popup reports extension/portal reachability without opening another landing page. CoachStudyBuddy separately reports whether the course and lecture list actually loaded. A successful extension ping is not proof of working course search.

Course lookup uses the observed #termFilter .selectedOption dropdown and its separate labels, waits for the selected term and course-list refresh, then matches the exact course code. Navigation uses a Courses tab rather than replacing an existing lecture-player tab.

Optional AI course search uses the app's selected OpenAI, Gemini or OpenAI-compatible JSON model. Maximum four model calls. The model chooses only freshly observed allowlisted term/course controls; the extension revalidates label and kind before acting. No arbitrary code, credentials, assignments, recording, permission changes or restricted downloads. Visible page content is untrusted evidence. Missing controls and repeated actions stop the bot.

Screenshots are optional and explicitly selected in the app. They require an image-capable model and browser screenshot permission (click this extension on the university Courses tab first). Only the active university Courses tab is captured. Images and control labels are sent through the app to the selected provider for inference; this does not train a model. No credentials are sent by the connector. Provider billing and data-handling terms apply.
