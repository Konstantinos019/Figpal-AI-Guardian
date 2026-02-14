// modules/ui/components/Button.js
// Standalone Save Button component for drift detection and reuse.
(function () {
    'use strict';

    const FP = window.FigPal;

    /**
     * Renders the Save Button HTML.
     * @returns {string} 
     */
    function render() {
        return `<button class="figpal-main-save-btn">Save</button>`;
    }

    /**
     * Wires up the Save Button logic.
     * @param {HTMLElement} btn - The button element.
     * @param {Object} currentPal - The current pal state to save.
     * @param {Function} onSave - Callback after saving.
     */
    function wire(btn, currentPal, onSave) {
        if (!btn) return;

        btn.addEventListener('click', () => {
            console.log('FigPal Component: Saving active pal...', currentPal);

            // Sync to global state
            FP.state.activePal = { ...currentPal };

            // Persist to storage
            chrome.storage.local.set({ activePal: currentPal }, () => {
                // Update the follower in the canvas
                if (FP.injector?.reRenderFollower) {
                    FP.injector.reRenderFollower();
                }

                // Visual Feedback
                const oldText = btn.textContent;
                btn.textContent = 'Saved!';
                btn.classList.add('saved');

                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.classList.remove('saved');
                    if (onSave) onSave();
                }, 1000);
            });
        });
    }

    // Export to FP namespace
    FP.components = FP.components || {};
    FP.components.Button = { render, wire };
})();
