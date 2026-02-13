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
            console.log('FigPal Automation: Attempting to launch Bridge plugin...');

            // 1. Try to find the Resource Tool (Shift+I)
            const resourceTool = document.querySelector('[data-testid="resource-tool"]') ||
                document.querySelector('[aria-label="Resources"]') ||
                document.querySelector('[title="Resources"]');

            if (resourceTool) {
                resourceTool.click();

                // 2. Wait for the menu to open, then search
                setTimeout(() => {
                    const searchInput = document.querySelector('input[placeholder*="Search"]') ||
                        document.querySelector('input[type="search"]');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.value = 'FigPal Bridge';
                        // Trigger input events for Figma's React/Vue state
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

                        // 3. Wait for results and click the first one that looks like a plugin
                        setTimeout(() => {
                            const results = Array.from(document.querySelectorAll('*'));
                            const firstResult = results.find(el =>
                                el.textContent.includes('FigPal Bridge') &&
                                (el.className.includes('resource') || el.className.includes('item'))
                            );

                            if (firstResult) {
                                firstResult.click();
                                FP.chat.addMessage('🚀 **Launching Bridge...** Check your Figma window!', 'bot');
                            } else {
                                // Last resort: try clicking the first thing in the results list
                                const genericResult = document.querySelector('[class*="resource_item"]');
                                if (genericResult) genericResult.click();
                            }
                        }, 800);
                    }
                }, 400);
            } else {
                // Try Shortcut simulation as fallback
                this.runLastPlugin();
                FP.chat.addMessage('⚠️ **Resources menu not found.**\n\nI tried triggering your last plugin (Meta+P). If that failed, please run "FigPal Bridge" manually via Shift+I.', 'bot');
            }
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
