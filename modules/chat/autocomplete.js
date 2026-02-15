
// modules/chat/autocomplete.js
// Handles command suggestions and autocomplete UI in the chat input.
// Exports: FigPal.autocomplete = { init, handleInput, handleKeyDown }
(function () {
    'use strict';

    const FP = window.FigPal;

    const REGISTRY = [
        { trigger: '/agent', description: 'Setup your AI provider (Gemini, OpenAI, etc.)', type: 'action' },
        { trigger: '/connect', description: 'Connect agent or codebase (use with "agent" or "codebase")', type: 'action' },
        { trigger: '/vfs', description: 'Check linked codebase status', type: 'action' },
        { trigger: '/open', description: 'Read local file content', type: 'action' },
        { trigger: '/reset', description: 'Reset all settings & reload', type: 'action' },
        { trigger: '/clear', description: 'Clear chat history', type: 'action' },
        { trigger: '/check', description: 'Diagnose connection status', type: 'system' },
        { trigger: '/quota', description: 'View AI usage stats', type: 'system' },
        { trigger: '/console', description: 'View plugin console logs', type: 'system' },
        { trigger: '/learn', description: 'Teach me a new rule', type: 'action' },
        { trigger: '/audit', description: 'Audit selection for DS compliance', type: 'action' },
        { trigger: '/capture', description: 'Save text/node to memory', type: 'action' },
        { trigger: '/export', description: 'Export learned skills to JSON', type: 'action' },
        { trigger: '/import', description: 'Import skills from JSON', type: 'action' },
        { trigger: '/help', description: 'Show available commands', type: 'action' },
        { trigger: '/commands', description: 'List all commands (alias for /help)', type: 'action' },
        { trigger: '/plugin', description: 'Show Bridge instructions', type: 'action' }
    ];

    let overlay = null;
    let activeIndex = 0;
    let filteredCommands = [];
    let isVisible = false;
    let inputRef = null;

    function init(inputElement) {
        if (!inputElement) return;
        inputRef = inputElement;

        if (!document.getElementById('figpal-autocomplete-overlay')) {
            overlay = document.createElement('div');
            overlay.id = 'figpal-autocomplete-overlay';
            overlay.className = 'figpal-autocomplete-overlay';

            const chatBubble = document.getElementById('figpal-chat-bubble');
            if (chatBubble) {
                const inputArea = chatBubble.querySelector('.figpal-chat-input-area');
                if (inputArea) {
                    inputArea.style.position = 'relative';
                    inputArea.appendChild(overlay);
                }
            }
        } else {
            overlay = document.getElementById('figpal-autocomplete-overlay');
        }
    }

    function handleInput(e) {
        const text = e.target.value;
        if (!text.startsWith('/') || text.includes(' ')) {
            hide();
            return;
        }

        const lower = text.toLowerCase();
        filteredCommands = REGISTRY.filter(cmd => cmd.trigger.startsWith(lower));

        if (filteredCommands.length > 0) {
            activeIndex = 0;
            render();
            show();
        } else {
            // Show "No matches" if we're still typing a command
            activeIndex = -1;
            renderNoMatches();
            show();
        }
    }

    function handleKeyDown(e) {
        if (!isVisible) return;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                e.stopImmediatePropagation();
                activeIndex = (activeIndex - 1 + filteredCommands.length) % filteredCommands.length;
                render();
                return true;
            case 'ArrowDown':
                e.preventDefault();
                e.stopImmediatePropagation();
                activeIndex = (activeIndex + 1) % filteredCommands.length;
                render();
                return true;
            case 'Enter':
                e.preventDefault();
                e.stopImmediatePropagation();
                selectItem(activeIndex, true); // Execute immediately
                return true;
            case 'Tab':
                e.preventDefault();
                e.stopImmediatePropagation();
                selectItem(activeIndex, false); // Just fill the input
                return true;
            case 'Escape':
                hide();
                return true;
        }
        return false;
    }

    function selectItem(index, shouldExecute = false) {
        if (!filteredCommands[index]) return;
        const cmd = filteredCommands[index];
        if (inputRef) {
            if (shouldExecute) {
                // When Enter is pressed, execute the command immediately
                inputRef.value = '';
                hide();
                // Trigger the command through the flow
                if (window.FigPal && window.FigPal.flow) {
                    window.FigPal.flow.handleUserMessage(cmd.trigger);
                }
            } else {
                // When clicked or Tab is pressed, just fill the input
                inputRef.value = cmd.trigger + ' ';
                inputRef.focus();
                // Dispatch input event to notify any listeners
                inputRef.dispatchEvent(new Event('input', { bubbles: true }));
                hide();
            }
        }
    }

    function render() {
        if (!overlay) return;
        overlay.innerHTML = '';
        filteredCommands.forEach((cmd, idx) => {
            const item = document.createElement('div');
            item.className = `figpal-autocomplete-item ${idx === activeIndex ? 'selected' : ''}`;
            item.innerHTML = `
                <span class="cmd-trigger">${cmd.trigger}</span>
                <span class="cmd-desc">${cmd.description}</span>
            `;
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                selectItem(idx);
            });
            item.addEventListener('mouseenter', () => {
                activeIndex = idx;
                const items = overlay.querySelectorAll('.figpal-autocomplete-item');
                items.forEach((el, i) => el.classList.toggle('selected', i === idx));
            });
            overlay.appendChild(item);
        });
    }

    function show() {
        if (overlay) overlay.style.display = 'block';
        isVisible = true;
    }

    function renderNoMatches() {
        if (!overlay) return;
        overlay.innerHTML = `
            <div class="figpal-autocomplete-item empty">
                <span class="cmd-trigger">No matches found</span>
                <span class="cmd-desc">Type /help for all commands</span>
            </div>
        `;
    }

    function hide() {
        if (overlay) overlay.style.display = 'none';
        isVisible = false;
        filteredCommands = [];
        activeIndex = 0;
    }

    FP.autocomplete = { init, handleInput, handleKeyDown };
})();
