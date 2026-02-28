// js/modules/physics.js
(function () {
    'use strict';

    const FP = window.FigPal;
    FP.character = FP.character || {};

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ghostX = window.innerWidth / 2;
    let ghostY = window.innerHeight / 2;
    const ghostSpeed = 0.15;
    const followSpeed = 0.10;
    let lastMouseX = window.innerWidth / 2;
    let lastFlipped = false;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (Math.abs(mouseX - lastMouseX) > 5) {
            const shouldFlip = mouseX > lastMouseX;
            if (shouldFlip !== lastFlipped) {
                lastFlipped = shouldFlip;
                FP.state.isFlipped = shouldFlip;
                FP.emit('sprite-update');
            }
            lastMouseX = mouseX;
        }
    }, { capture: true });

    function animate() {
        const container = FP.state.elements.container;
        if (!container) { requestAnimationFrame(animate); return; }

        let targetX = mouseX + 28;
        let targetY = mouseY + 28;

        ghostX += (targetX - ghostX) * ghostSpeed;
        ghostY += (targetY - ghostY) * ghostSpeed;
        FP.state.currentX += (ghostX - FP.state.currentX) * followSpeed;
        FP.state.currentY += (ghostY - FP.state.currentY) * followSpeed;

        container.style.left = FP.state.currentX + 'px';
        container.style.top = FP.state.currentY + 'px';

        requestAnimationFrame(animate);
    }

    FP.character.startAnimation = function () {
        const container = FP.state.elements.container;
        if (container) container.classList.remove('resting');
        FP.state.currentX = window.innerWidth / 2;
        FP.state.currentY = window.innerHeight / 2;
        ghostX = FP.state.currentX;
        ghostY = FP.state.currentY;
        mouseX = window.innerWidth / 2;
        mouseY = window.innerHeight / 2;
        animate();
    };

    console.log('FigPal: Physics module initialized');
})();
