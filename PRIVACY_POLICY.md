# Privacy Policy — DS Guardian

**Last updated:** February 11, 2026

DS Guardian is a Chrome extension that provides an AI-powered design assistant for Figma. This policy explains how user data is handled.

## Data Collection

DS Guardian collects and processes the following data:

| Data | Storage | Purpose |
|---|---|---|
| Gemini API key | Locally in browser (`chrome.storage`) | Authenticate AI requests |
| Figma Personal Access Token | Locally in browser (`chrome.storage`) | Read selected design layers |
| Selected Figma layer data | Not stored (sent per-request) | Provide design context to AI |
| User chat messages | Not stored (sent per-request) | Generate AI responses |
| Model preference | Locally in browser (`chrome.storage`) | Remember selected AI model |

## Third-Party Services

User prompts and Figma design context are sent to **Google's Gemini API** to generate AI-powered design feedback. This data is processed according to [Google's API Terms of Service](https://ai.google.dev/terms).

No data is sent to any other third-party service.

## Data Sharing

- We do **not** sell user data.
- We do **not** share user data with third parties, except as described above (Gemini API).
- We do **not** use user data for advertising, analytics, or creditworthiness purposes.

## Data Storage

All credentials (API keys, tokens) are stored **locally in your browser** using Chrome's `chrome.storage` API. No data is stored on external servers.

## Data Deletion

You can clear all stored data at any time by:
1. Typing `/reset` in the DS Guardian chat
2. Or removing the extension from Chrome

## Contact

For questions about this privacy policy, contact: **konstantinos019@gmail.com**
