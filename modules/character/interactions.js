// modules/character/interactions.js
// Click, drag, resize, keyboard (Alt+D, Escape) handlers.
// Exports: FigPal.character.initInteractions()
(function () {
    'use strict';

    const FP = window.FigPal;
    FP.character = FP.character || {};

    FP.character.initInteractions = function () {
        const { container, follower, chatBubble } = FP.state.elements;
        if (!container || !follower || !chatBubble) return;

        let isDraggingChat = false;
        let hasDragged = false;
        let isResizing = false, activeHandle = null;
        let startWidth = 302, startHeight = 400, startMouseX = 0, startMouseY = 0;
        let dragOffsetX = 0, dragOffsetY = 0;
        let startDragX = 0, startDragY = 0;

        // Sync drag state to FP.state for physics module
        Object.defineProperty(FP.state, 'isDraggingChat', {
            get: () => isDraggingChat,
            configurable: true,
        });

        // ─── Character Click ─────────────────────────────────────────────
        follower.addEventListener('click', (e) => {
            if (hasDragged) {
                hasDragged = false;
                return;
            }
            e.stopPropagation();

            if (container.classList.contains('resting')) {
                // Wake up
                FP.state.isFollowing = true;
                FP.state.isReturningHome = false;
                container.classList.remove('resting');
                // Ghost starts at current position (physics.js reads currentX/Y)
            } else {
                // Toggle chat, stay put
                FP.state.isFollowing = false;
                FP.state.isReturningHome = false;
                container.classList.toggle('chat-visible');
            }
        });

        // ─── Character Drag ──────────────────────────────────────────────
        follower.addEventListener('mousedown', (e) => {
            if (!container.classList.contains('resting')) {
                isDraggingChat = true;
                hasDragged = false;
                startDragX = e.clientX;
                startDragY = e.clientY;
                dragOffsetX = e.clientX - FP.state.currentX;
                dragOffsetY = e.clientY - FP.state.currentY;
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // ─── Chat Resize ─────────────────────────────────────────────────
        const resizers = chatBubble.querySelectorAll('.figpal-resizer');
        resizers.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                activeHandle = handle;
                startMouseX = e.clientX;
                startMouseY = e.clientY;
                const rect = chatBubble.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                container.classList.add('resizing');
            });
        });

        // ─── Global Mouse Move (drag + resize) ───────────────────────────
        window.addEventListener('mousemove', (e) => {
            if (isResizing) {
                const deltaX = e.clientX - startMouseX;
                const deltaY = e.clientY - startMouseY;
                if (activeHandle.classList.contains('top') || activeHandle.classList.contains('top-left') || activeHandle.classList.contains('top-right')) {
                    chatBubble.style.height = Math.max(200, startHeight - deltaY) + 'px';
                }
                if (activeHandle.classList.contains('left') || activeHandle.classList.contains('top-left') || activeHandle.classList.contains('bottom-left')) {
                    chatBubble.style.width = Math.max(280, startWidth - deltaX) + 'px';
                } else if (activeHandle.classList.contains('right') || activeHandle.classList.contains('top-right') || activeHandle.classList.contains('bottom-right')) {
                    chatBubble.style.width = Math.max(280, startWidth + deltaX) + 'px';
                }
                return;
            }
            if (isDraggingChat) {
                const moveDist = Math.hypot(e.clientX - startDragX, e.clientY - startDragY);
                if (moveDist > 3) {
                    hasDragged = true;
                }
                FP.state.currentX = e.clientX - dragOffsetX;
                FP.state.currentY = e.clientY - dragOffsetY;
                container.style.left = FP.state.currentX + 'px';
                container.style.top = FP.state.currentY + 'px';
            }
        });

        // ─── Mouse Up ────────────────────────────────────────────────────
        window.addEventListener('mouseup', () => {
            isDraggingChat = false;
            if (isResizing) {
                isResizing = false;
                activeHandle = null;
                container.classList.remove('resizing');
            }
        });

        // ─── Keyboard Shortcuts ──────────────────────────────────────────
        window.addEventListener('keydown', (e) => {
            // Alt+D: Toggle chat
            if (e.code === 'KeyD' && e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                if (container.classList.contains('resting')) {
                    FP.state.isFollowing = false;
                    container.classList.remove('resting');
                    FP.state.isReturningHome = false;
                    container.classList.add('chat-visible');
                } else {
                    container.classList.toggle('chat-visible');
                }
                if (container.classList.contains('chat-visible')) {
                    const input = chatBubble.querySelector('input');
                    if (input) setTimeout(() => input.focus(), 50);
                }
            }

            // Escape: Close chat → Go home → Follow
            if (e.code === 'Escape') {
                if (container.classList.contains('chat-visible')) {
                    e.preventDefault();
                    e.stopPropagation();
                    container.classList.remove('chat-visible');
                    document.activeElement?.blur();
                } else if (FP.state.isFollowing) {
                    e.preventDefault();
                    e.stopPropagation();
                    FP.state.isFollowing = false;
                    FP.state.isReturningHome = true;
                } else if (!container.classList.contains('resting')) {
                    e.preventDefault();
                    e.stopPropagation();
                    FP.state.isFollowing = true;
                    FP.state.isReturningHome = false;
                }
            }
        }, { capture: true });

        // ─── Prevent scroll passthrough ──────────────────────────────────
        chatBubble.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
    };
})();
