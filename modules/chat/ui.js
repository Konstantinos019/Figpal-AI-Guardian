// modules/chat/ui.js
// Modular UI wiring for the chat interface.
// REDUCED: Now only handles global state listeners for the iframe shell.
(function () {
    'use strict';

    const FP = window.FigPal;

    /**
     * Initialize chat shell UI
     * @param {HTMLElement} chatBubble - The main chat container
     */
    function init(chatBubble) {
        if (!chatBubble) return;
        // Internal wiring removed to support Iframe-based chat.
        console.log('FigPal Chat UI: Shell initialized.');
    }

    // Handle global thinking state for visual feedback on the follower
    FP.on('ai-thinking', (isThinking) => {
        const follower = FP.state.elements?.follower;
        if (follower) {
            if (isThinking) {
                follower.classList.add('thinking');
            } else {
                follower.classList.remove('thinking');
            }
        }
    });

    // ─── Export ──────────────────────────────────────────────────────────
    FP.chatUI = { init };
})();
