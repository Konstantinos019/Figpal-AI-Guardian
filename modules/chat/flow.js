// modules/chat/flow.js
// Chat flow orchestrator: user msg → commands → context → AI → render.
// REDUCED: Now acts as a message router between Figma and the Chat Iframe.
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Handle User Message ─────────────────────────────────────────────
    async function handleUserMessage(text, specificResponse) {
        console.log('FigPal Flow: Message received (Routing to Iframe ignored for now)', text);
        // This will be the bridge point for the Iframe in the future.
    }

    // ─── Listen for events ───────────────────────────────────────────────
    FP.on('user-message', (data) => {
        handleUserMessage(data.text, data.specificResponse);
    });

    // ─── Export ──────────────────────────────────────────────────────────
    FP.flow = { handleUserMessage };
})();
