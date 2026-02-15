
// modules/chat/autocomplete.js
// Handles command suggestions and autocomplete UI in the chat input.
// Exports: FigPal.autocomplete = { init, handleInput, handleKeyDown }
(function () {
    'use strict';

    const FP = window.FigPal;

    const REGISTRY = [
        { trigger: '/connect agent', description: 'Setup AI provider keys (Gemini, OpenAI)', type: 'action' },
        { trigger: '/connect codebase', description: 'Link local project files', type: 'action' },
        { trigger: '/keys', description: 'Edit AI provider API keys', type: 'action' },
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
        { trigger: '/plugin', description: 'Show Bridge instructions', type: 'action' },
        { trigger: '/create', description: 'Generate Figma elements (AI)', type: 'action' },
        { trigger: '/exec', description: 'Execute Figma API code', type: 'action' }
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

        // Only trigger if getting started with a slash
        if (!text.startsWith('/')) {
            hide();
            return;
        }

        const lower = text.toLowerCase();

        // improved matching: match if command starts with input OR input starts with command (for arguments)
        filteredCommands = REGISTRY.filter(cmd => {
            const cmdLower = cmd.trigger.toLowerCase();
            // 1. User is typing command: "/conn" -> matches "/connect"
            if (cmdLower.startsWith(lower)) return true;
            // 2. User has typed command and is typing args: "/connect ag" -> matches "/connect"
            if (lower.startsWith(cmdLower + ' ')) return true;
            return false;
        });

        // Hide if exact match with space (user is typing args, but we don't have arg suggestions yet)
        // Unless we want to keep showing the command help? Let's keep showing it for context.

        if (filteredCommands.length > 0) {
            activeIndex = 0;
            render();
            show();
        } else {
            hide();
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
                selectItem(activeIndex);
                return true;
            case 'Tab':
                e.preventDefault();
                e.stopImmediatePropagation();
                selectItem(activeIndex);
                return true;
            case 'Escape':
                hide();
                return true;
        }
        return false;
    }

    function selectItem(index) {
        if (!filteredCommands[index]) return;
        const cmd = filteredCommands[index];
        if (inputRef) {
            // Check if input already has this command
            const currentVal = inputRef.value;

            // If we are just completing the command part
            if (!currentVal.startsWith(cmd.trigger + ' ')) {
                // Optimization: If exact match, execute immediately (assumes user would type space if they wanted args)
                if (currentVal === cmd.trigger || currentVal === cmd.trigger + ' ') {
                    hide();
                    console.log('ANTIGRAVITY: Executing exact match command:', cmd.trigger);
                    inputRef.value = '';
                    if (FP.flow && FP.flow.handleUserMessage) {
                        FP.flow.handleUserMessage(cmd.trigger);
                    }
                    return;
                }

                inputRef.value = cmd.trigger + ' '; // Append space for args
                inputRef.focus();
                // Dispatch input event to notify any listeners / trigger resize
                inputRef.dispatchEvent(new Event('input', { bubbles: true }));

                // Keep showing if it accepts args? For now hide to let user type.
                hide();
            } else {
                // Already typed/has args, execute what's there!
                hide();
                const textToExecute = currentVal.trim();
                inputRef.value = '';

                if (FP.flow && FP.flow.handleUserMessage) {
                    FP.flow.handleUserMessage(textToExecute);
                }
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
