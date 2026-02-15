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

            if (container.classList.contains('chat-visible')) {
                // Case 1: Chat Open -> Close chat, stay static
                container.classList.remove('chat-visible');
                FP.state.isFollowing = false;
                FP.state.isReturningHome = false;
            } else if (container.classList.contains('resting')) {
                // Case 2: Resting (Docked) -> Start Following
                console.log('FigPal: Waking up from rest -> Following');
                container.classList.remove('resting');
                FP.state.isFollowing = true;
                FP.state.isReturningHome = false;
            } else {
                // Case 3: Static (Floating) -> Open Chat
                container.classList.add('chat-visible');
                FP.state.isFollowing = false;
                FP.state.isReturningHome = false;

                // Focus input
                const input = container.querySelector('input');
                if (input) setTimeout(() => input.focus(), 50);
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
                document.body.classList.add('resizing');
            });
        });

        // ─── Global Mouse Move (drag + resize) ───────────────────────────
        window.addEventListener('mousemove', (e) => {
            if (isResizing) {
                const deltaX = e.clientX - startMouseX;
                const deltaY = e.clientY - startMouseY;

                // Docked Width Resize Logic
                if (container.classList.contains('figpal-is-docked') && activeHandle.classList.contains('left')) {
                    const newWidth = Math.max(280, Math.min(800, startWidth - deltaX));
                    document.documentElement.style.setProperty('--figpal-panel-width', newWidth + 'px');
                    return;
                }

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
                container.style.transform = '';
            }
        });

        // ─── Mouse Up ────────────────────────────────────────────────────
        window.addEventListener('mouseup', () => {
            isDraggingChat = false;
            if (isResizing) {
                // Save docked width persistence
                if (container.classList.contains('figpal-is-docked')) {
                    const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--figpal-panel-width'));
                    localStorage.setItem('figpal-panel-width', currentWidth);
                }

                isResizing = false;
                activeHandle = null;
                container.classList.remove('resizing');
                document.body.classList.remove('resizing');
            }
        });

        // ─── Keyboard Shortcuts ──────────────────────────────────────────
        console.log('FigPal: Initializing keyboard shortcuts...');

        document.addEventListener('keydown', (e) => {
            // Debug log to verify events are reaching the content script
            if (e.altKey || e.metaKey) {
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

                if (container.classList.contains('chat-visible')) {
                    // IF CLOSING: also start following
                    container.classList.remove('chat-visible');
                    FP.state.isFollowing = true;
                    FP.state.isReturningHome = false;
                    container.classList.remove('resting');
                } else {
                    // IF OPENING: toggle visible
                    container.classList.add('chat-visible');
                    // Focus Input
                    const input = chatBubble.querySelector('input');
                    if (input) setTimeout(() => input.focus(), 50);
                }
            }
        }, { capture: true });

        // ─── Prevent scroll passthrough ──────────────────────────────────
        chatBubble.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
    };
})();
