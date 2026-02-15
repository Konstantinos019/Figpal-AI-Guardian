// modules/chat/ui.js
// Modular UI wiring for the chat interface.
// Handles model selection, send/stop buttons, and input listeners.
// Exports: FigPal.chatUI = { init }
(function () {
    'use strict';

    const FP = window.FigPal;

    /**
     * Initialize all chat UI listeners
     * @param {HTMLElement} chatBubble - The main chat container
     */
    function init(chatBubble) {
        if (!chatBubble) return;

        wireModelSelector(chatBubble);
        wireSendButton(chatBubble);
        wireStopButton(chatBubble);
        wireInputListeners(chatBubble);

        // Also initialize autocomplete
        const chatInput = chatBubble.querySelector('.figpal-chat-input-area input');
        if (FP.autocomplete && FP.autocomplete.init && chatInput) {
            FP.autocomplete.init(chatInput);
        }
    }

    function wireModelSelector(chatBubble) {
        const modelSelector = chatBubble.querySelector('#figpal-model-selector');
        const modelNameDisplay = chatBubble.querySelector('#figpal-model-name');
        if (!modelSelector) return;

        function updateDisplay() {
            if (modelNameDisplay) {
                modelNameDisplay.textContent = modelSelector.value;
            }
        }

        function populateModels() {
            const provider = FP.state.provider || 'gemini';
            const cfg = FP.ai.PROVIDERS[provider];
            if (!cfg) return;

            modelSelector.innerHTML = '';
            cfg.models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                modelSelector.appendChild(opt);
            });

            // Set current selection
            if (FP.state.selectedModel && cfg.models.includes(FP.state.selectedModel)) {
                modelSelector.value = FP.state.selectedModel;
            } else {
                modelSelector.value = cfg.models[0];
                FP.state.selectedModel = cfg.models[0];
            }
            updateDisplay();
        }

        // Initialize
        populateModels();

        // Load saved selection
        chrome.storage.local.get(['selectedModel', 'provider'], (res) => {
            if (res.provider) FP.state.provider = res.provider;
            if (res.selectedModel) {
                FP.state.selectedModel = res.selectedModel;
                populateModels();
            }
        });

        modelSelector.addEventListener('change', (e) => {
            FP.state.selectedModel = e.target.value;
            chrome.storage.local.set({ selectedModel: e.target.value });
            updateDisplay();
        });

        FP.on('setup-complete', () => {
            populateModels();
        });
    }

    function wireSendButton(chatBubble) {
        const sendBtn = chatBubble.querySelector('#figpal-send-btn');
        const chatInput = chatBubble.querySelector('.figpal-chat-input-area input');

        sendBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (chatInput && chatInput.value.trim() !== '') {
                const text = chatInput.value.trim();
                chatInput.value = '';
                FP.flow.handleUserMessage(text);
            }
        });
    }

    function wireStopButton(chatBubble) {
        const stopBtn = chatBubble.querySelector('#figpal-stop-btn');
        const follower = FP.state.elements.follower;

        stopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            FP.ai.abort();

            toggleInputState(chatBubble, false);

            const thinkingMsg = chatBubble.querySelector('.figpal-message.thinking');
            if (thinkingMsg) {
                thinkingMsg.textContent = 'Stopped by user.';
                thinkingMsg.classList.remove('thinking');
                thinkingMsg.classList.add('figpal-error');
            }

            FP.state.isThinking = false;
            FP.injector.reRenderFollower();
            if (follower) follower.classList.remove('thinking');
        });
    }

    function wireInputListeners(chatBubble) {
        const chatInput = chatBubble.querySelector('.figpal-chat-input-area input');
        if (!chatInput) return;

        chatInput.addEventListener('keydown', (e) => {
            // ALWAYS stop propagation for our input to prevent Figma from seeing these keys.
            // Since interactions.js (capture phase) now lets standard keys through for isOurInput,
            // we handle the shielding here in the bubbling phase.
            e.stopPropagation();

            // Forward to autocomplete first
            if (FP.autocomplete && FP.autocomplete.handleKeyDown) {
                if (FP.autocomplete.handleKeyDown(e)) return;
            }

            if (e.key === 'Enter') {
                const userText = chatInput.value.trim();
                if (userText) {
                    chatInput.value = '';
                    FP.flow.handleUserMessage(userText);
                }
            }
        });

        chatInput.addEventListener('input', (e) => {
            if (FP.autocomplete && FP.autocomplete.handleInput) {
                FP.autocomplete.handleInput(e);
            }
        });

        chatInput.addEventListener('paste', (e) => e.stopPropagation());
        chatInput.addEventListener('contextmenu', (e) => e.stopPropagation());
    }

    function toggleInputState(chatBubble, isThinking) {
        const sendBtn = chatBubble.querySelector('#figpal-send-btn');
        const stopBtn = chatBubble.querySelector('#figpal-stop-btn');
        const chatInput = chatBubble.querySelector('.figpal-chat-input-area input');

        if (isThinking) {
            if (sendBtn) sendBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'flex';
        } else {
            if (stopBtn) stopBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = 'flex';
            setTimeout(() => chatInput?.focus(), 50);
        }
    }

    // Handle global thinking state
    FP.on('ai-thinking', (isThinking) => {
        const chatBubble = FP.state.elements.chatBubble;
        if (chatBubble) toggleInputState(chatBubble, isThinking);
    });

    // ─── Export ──────────────────────────────────────────────────────────
    FP.chatUI = { init };
})();
