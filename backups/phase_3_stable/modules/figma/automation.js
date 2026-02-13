// modules/figma/automation.js
// Figma UI Automation: Launching plugins, triggering menus.
(function () {
    'use strict';
    const FP = window.FigPal;

    const automation = {
        /**
         * Attempts to launch the FigPal Bridge plugin in the Figma UI.
         */
        async launchPlugin() {
            // Deprecated: Now handled by chat command instruction
            console.log('FigPal: Manual plugin launch required.');
        },

        /**
         * Simulates the 'Run Last Plugin' keyboard shortcut.
         */
        runLastPlugin() {
            const event = new KeyboardEvent('keydown', {
                key: 'p',
                keyCode: 80,
                code: 'KeyP',
                which: 80,
                altKey: true,
                metaKey: true, // Cmd on Mac
                bubbles: true
            });
            window.dispatchEvent(event);
        }
    };

    FP.figma = FP.figma || {};
    FP.figma.launchPlugin = automation.launchPlugin;
})();
