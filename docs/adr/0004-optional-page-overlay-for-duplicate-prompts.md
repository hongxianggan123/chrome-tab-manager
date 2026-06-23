# Use Optional Page Overlay For Duplicate Prompts

Duplicate prompts will default to the side panel, but users can enable a page overlay that appears inside ordinary web pages. The overlay requires runtime optional authorization for `<all_urls>` and is injected on demand only when a new duplicate tab actually needs a prompt. It does not read page content, scan the DOM, save page data, or upload data.

This keeps the default install permission surface aligned with the side panel experience while allowing users who want immediate in-page feedback to opt into the broader permission. If authorization is denied, revoked, or the page cannot be injected, the extension falls back to a pending side panel prompt and action badge/title reminder. If authorization is later revoked, the display mode is switched back to the side panel and the user sees a non-blocking explanation.

Pending duplicate prompts and handled tab ids are session state, stored in `chrome.storage.session` rather than `chrome.storage.local`. This survives MV3 service worker suspension within the browser session without turning duplicate prompt state into long-term stored history.

The alternative was to keep all duplicate prompts inside the side panel. That preserves the narrowest permission surface, but it cannot notify users directly on a newly opened duplicate page unless the side panel is already open. The optional overlay is a deliberate trade-off: clearer immediate feedback for opted-in users, with a fallback that preserves the conservative default.
