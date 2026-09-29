# Load the development connector

1. Open Chrome or Edge's extensions page.
2. Enable Developer mode and choose Load unpacked.
3. Select this `extension` folder.
4. Open http://127.0.0.1:3001 in the same browser. Click Connect portal to obtain a 30-minute pairing code.
5. Sign into the university portal directly. Open a lecture's Materials panel, click this extension, paste the code and choose Import this page.
6. If the portal uses interactive cards with no document links in its visible markup, open the desired material normally, then use the extension on that document tab. The supported document host for this pilot is cdn.filestackcontent.com.

Scope: user-invoked active tab read access plus access to the local app. No cookies, passwords, recording stream URLs, hidden framework state or private APIs. Importing a document does not grant permission to send it to AI; that happens only via a separate app action. The pairing code is not an API key and is never persisted by the extension.

This unpacked extension is a development build, not a published store extension. Automatic extraction from the live portal needs validation with the extension loaded by the user. Browser popups/PDF viewers may require importing the document tab separately. Other LMS providers are not supported.
