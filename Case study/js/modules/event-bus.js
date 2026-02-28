// js/modules/event-bus.js
(function () {
    'use strict';

    const listeners = {};
    window.FigPal = window.FigPal || {};
    const FP = window.FigPal;

    FP.on = function (event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
    };

    FP.off = function (event, fn) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(f => f !== fn);
    };

    FP.emit = function (event, data) {
        (listeners[event] || []).forEach(fn => {
            try { fn(data); } catch (e) { console.error(`[FigPal:${event}]`, e); }
        });
    };

    FP.state = {
        isThinking: false,
        activePal: {
            category: "Animal",
            subType: "Cat",
            colorName: "Pink",
            color: "#e58fcc",
            name: "FigPal",
            accessory: "Heart"
        },
        custom: {
            sprites: {},
            subTypes: [],
            configs: {}
        },
        elements: {
            container: null,
            follower: null,
            home: null,
            panelOverlay: null
        },
        isFollowing: true,
        isReturningHome: false,
        currentX: 0,
        currentY: 0,
        isFlipped: false
    };

    console.log('FigPal: Event bus initialized');
})();
