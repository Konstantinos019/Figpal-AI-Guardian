// js/interactions.js
(function () {
    'use strict';

    const FP = window.FigPal;

    function init() {
        if (FP.isInitialized) return;
        FP.isInitialized = true;

        // Register DOM elements
        FP.state.elements = {
            container: document.getElementById('figpal-container'),
            follower: document.getElementById('figpal-follower'),
            home: document.getElementById('figpal-home'),
            panelOverlay: document.getElementById('figpal-panel-overlay')
        };

        const { container, follower, home } = FP.state.elements;

        // Sprite Re-rendering handler
        const reRender = () => {
            follower.innerHTML = FP.sprite.assemble({
                ...FP.state.activePal,
                flipped: FP.state.isFlipped
            });
        };
        FP.on('sprite-update', reRender);

        // Update Namepost Text
        const setHomeText = (newName) => {
            const homeText = document.getElementById('figpal-home-text');
            if (homeText) {
                homeText.textContent = newName || "FigBot";
            }
        };

        FP.on('pal-name-changed', setHomeText);

        // Character Interactions
        follower.addEventListener('click', (e) => {
            e.stopPropagation();
            FP.panel.toggle(true);
        });

        // Signpost Interaction
        home.addEventListener('click', (e) => {
            e.stopPropagation();
            FP.panel.toggle(true);
        });

        // Initialize modules
        FP.panel.init();

        // Now that panel.init() loaded from localStorage, set text
        setHomeText(FP.state.activePal?.name);

        FP.character.startAnimation();
        reRender();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
