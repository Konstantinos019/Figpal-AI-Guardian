# Audit Findings: Custom Avatar Feature

## Discoveries
- **Registry Desync**: `panel.js` maintains a local `subTypeRegistry["Custom"]`. If it's modified but not perfectly synced with storage or other modules, navigation/selection can fail.
- **Storage Limits**: Large Data URLs might be hitting `chrome.storage.local` limits, causing partial or failed writes.
- **Broken Image Fallback**: While `sprite.js` has a fallback for *missing* URLs, it lacks one for *broken* URLs (e.g. invalid Data URLs).
- **Event Delegation**: Some buttons in `renderPreview` are re-wired manually, which is error-prone compared to top-level delegation.

## Event Listeners
- `deleteBtn` is wired once in `init()`. It depends on `currentPal` which is also local to `init()`.
- `handleUpload` is wired inside `renderPreview()`.

## State Persistence
- `chrome.storage.local.set` is used without checking for success/limit errors.
