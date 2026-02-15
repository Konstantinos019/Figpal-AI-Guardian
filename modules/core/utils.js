// modules/core/utils.js
(function () {
    'use strict';
    const FP = window.FigPal = window.FigPal || {};

    const utils = {
        escapeHTML: (str) => {
            if (!str) return '';
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        generateId: () => {
            return Math.random().toString(36).substr(2, 9);
        }
    };

    FP.utils = utils;
    console.log('FigPal: Utilities loaded. 🛠️');
})();
