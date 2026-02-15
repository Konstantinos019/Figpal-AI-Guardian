// modules/character/physics.js
// Double-lerp ghost follow, resting position, return home animation.
// Exports: FigPal.character.startAnimation()
(function () {
    'use strict';

    const FP = window.FigPal;
    FP.character = FP.character || {};

    // ─── Physics State ───────────────────────────────────────────────────
    let mouseX = 0, mouseY = 0;
    let ghostX = 0, ghostY = 0;
    const ghostSpeed = 0.15;
    const followSpeed = 0.10;

    // Track mouse globally
    let lastMouseX = 0;
    let lastFlipped = false;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Directional Flipping logic
        // from left to right ([x] > lastX) the pal is flipped (true)
        // from right to left ([x] < lastX) we are as is (false)
        if (Math.abs(mouseX - lastMouseX) > 5) {
            const shouldFlip = mouseX > lastMouseX;
            if (shouldFlip !== lastFlipped) {
                lastFlipped = shouldFlip;
                FP.state.isFlipped = shouldFlip;
                // Trigger re-render to apply the flip immediately
                if (FP.injector && FP.injector.reRenderFollower) {
                    FP.injector.reRenderFollower();
                }
            }
            lastMouseX = mouseX;
        }
    }, { capture: true });

    // ─── Animation Loop ──────────────────────────────────────────────────
    function animate() {
        const { elements, isFollowing, isReturningHome } = FP.state;
        const container = elements.container;
        if (!container) { requestAnimationFrame(animate); return; }

        const restingX = window.innerWidth / 2 + 180;
        const restingY = window.innerHeight - 80;

        let targetX = FP.state.currentX;
        let targetY = FP.state.currentY;
        let activePhysics = false;

        if (isFollowing && !container.classList.contains('chat-visible')) {
            // Follow cursor
            targetX = mouseX + 28;
            targetY = mouseY + 28;
            activePhysics = true;
        } else if (isReturningHome && !container.classList.contains('resting')) {
            // Return home
            targetX = restingX;
            targetY = restingY;
            activePhysics = true;

            // Check arrival
            if (Math.abs(FP.state.currentX - restingX) < 1 && Math.abs(FP.state.currentY - restingY) < 1) {
                container.classList.add('resting');
                FP.state.isReturningHome = false;
                activePhysics = false;
                FP.state.currentX = restingX;
                FP.state.currentY = restingY;
            }
        } else if (container.classList.contains('resting')) {
            FP.state.currentX = restingX;
            FP.state.currentY = restingY;
            ghostX = restingX;
            ghostY = restingY;
        }

        const isDocked = container.classList.contains('figpal-is-docked');

        if (activePhysics && !FP.state.isDraggingChat && !isDocked) {
            // Double Lerp (Ghost follows target, Current follows Ghost)
            ghostX += (targetX - ghostX) * ghostSpeed;
            ghostY += (targetY - ghostY) * ghostSpeed;

            FP.state.currentX += (ghostX - FP.state.currentX) * followSpeed;
            FP.state.currentY += (ghostY - FP.state.currentY) * followSpeed;

            container.style.left = FP.state.currentX + 'px';
            container.style.top = FP.state.currentY + 'px';
            container.style.transform = '';
        } else if (!container.classList.contains('resting') && !activePhysics && !isDocked) {
            if (!FP.state.isDraggingChat) {
                container.style.left = FP.state.currentX + 'px';
                container.style.top = FP.state.currentY + 'px';
            }
        }

        requestAnimationFrame(animate);
    }

    // ─── Start ───────────────────────────────────────────────────────────
    FP.character.startAnimation = function () {
        const container = FP.state.elements.container;
        if (container) {
            container.classList.add('resting');
        }
        FP.state.currentX = window.innerWidth / 2;
        FP.state.currentY = window.innerHeight - 100;
        ghostX = FP.state.currentX;
        ghostY = FP.state.currentY;
        animate();
    };

    // ─── Listen for thinking state → re-render with lightbulb ────────────
    FP.on('ai-thinking', (isThinking) => {
        FP.state.isThinking = isThinking;
        if (FP.injector && FP.injector.reRenderFollower) {
            FP.injector.reRenderFollower();
        }
    });
})();
