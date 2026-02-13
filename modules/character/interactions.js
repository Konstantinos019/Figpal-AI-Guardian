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
        console.log('FigPal: Initializing keyboard shortcuts...');

        document.addEventListener('keydown', (e) => {
            // Debug log to verify events are reaching the content script
            if (e.altKey || e.metaKey || e.code === 'Escape') {
                console.log(`FigPal Debug: ${e.code}/${e.key} | Alt:${e.altKey} | Meta:${e.metaKey} | Target:${e.target.tagName}#${e.target.id || 'none'}`);
            }

            // Skip ONLY IF typing in a legitimate text field (not Figma's internal capture input).
            const isControl = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
            const isOurInput = e.target.closest && e.target.closest('#figpal-container');
            const isFigmaCapture = e.target.id === 'focus-target' || e.target.classList.contains('focus-target');

            if (isControl && !isOurInput && !isFigmaCapture) {
                return;
            }

            // Alt+D or Cmd+D: Toggle chat
            const isD = e.code === 'KeyD' || e.key.toLowerCase() === 'd';
            const isShortcut = (e.altKey || e.metaKey) && isD && !e.shiftKey && !e.ctrlKey;

            if (isShortcut) {
                console.log('FigPal: Shortcut Alt/Cmd+D detected!');
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
            if (e.code === 'Escape' || e.key === 'Escape') {
                console.log('FigPal: Escape key detected');
                if (container.classList.contains('chat-visible')) {
                    console.log('FigPal: Escape -> Closing chat');
                    e.preventDefault();
                    e.stopPropagation();
                    container.classList.remove('chat-visible');
                    document.activeElement?.blur();
                } else if (FP.state.isFollowing || !container.classList.contains('resting')) {
                    console.log('FigPal: Escape -> Releasing to Home');
                    e.preventDefault();
                    e.stopPropagation();
                    FP.state.isFollowing = false;
                    FP.state.isReturningHome = true;
                    container.classList.add('resting'); // Force resting visual if needed
                } else {
                    console.log('FigPal: Escape -> Waking up from resting');
                    e.preventDefault();
                    e.stopPropagation();
                    FP.state.isFollowing = true;
                    FP.state.isReturningHome = false;
                    container.classList.remove('resting');
                }
            }
        }, { capture: true });

        // ─── Prevent scroll passthrough ──────────────────────────────────
        chatBubble.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
    };
})();
