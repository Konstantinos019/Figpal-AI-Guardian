// modules/core/event-bus.js
// Shared pub/sub event system + global state container.
// All other modules depend ONLY on this. Zero inter-module dependencies.
(function () {
    'use strict';

    const listeners = {};

    window.FigPal = window.FigPal || {};

    /**
     * Subscribe to an event.
     * @param {string} event - Event name
     * @param {Function} fn - Callback
     */
    window.FigPal.on = function (event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
    };

    /**
     * Unsubscribe from an event.
     * @param {string} event - Event name
     * @param {Function} fn - Callback to remove
     */
    window.FigPal.off = function (event, fn) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(f => f !== fn);
    };

    /**
     * Emit an event to all subscribers.
     * @param {string} event - Event name
     * @param {*} data - Payload
     */
    window.FigPal.emit = function (event, data) {
        (listeners[event] || []).forEach(fn => {
            try {
                fn(data);
            } catch (e) {
                console.error(`[FigPal:${event}]`, e);
            }
        });
    };

    /**
     * Subscribe to an event, but only fire once.
     * @param {string} event - Event name
     * @param {Function} fn - Callback
     */
    window.FigPal.once = function (event, fn) {
        const wrapper = function (data) {
            window.FigPal.off(event, wrapper);
            fn(data);
        };
        window.FigPal.on(event, wrapper);
    };

    // ─── Shared Mutable State ───────────────────────────────────────────
    // Modules read/write via FigPal.state.
    // This is the single source of truth for cross-module data.
    window.FigPal.state = {
        // AI
        provider: 'gemini',
        apiKeys: {}, // Map: { gemini: '...', grok: '...' }
        selectedModel: null,
        currentController: null,

        // Chat
        chatHistory: [],
        skills: [], // Learned documentation snippets
        isThinking: false,

        // Figma context
        fileKey: null,
        selectedNodeId: null,

        // DOM references (populated by injector)
        sprites: {
            default: null,
            thinking: null,
            home: null,
        },
        elements: {
            container: null,
            follower: null,
            chatBubble: null,
            home: null,
        },

        // Character physics
        isFollowing: false,
        isReturningHome: false,
        currentX: 0,
        currentY: 0,
    };

    console.log('FigPal: Event bus initialized');
})();
