// modules/core/injector.js
// DOM creation, SPA polling, sprite loading, input listeners.
// Populates FP.state.elements and FP.state.sprites, then bootstraps all modules.
// Exports: FigPal.injector = { start }
(function () {
    'use strict';

    const FP = window.FigPal;
    let isInjected = false;

    // ─── SPA Polling ─────────────────────────────────────────────────────
    function start() {
        setInterval(() => {
            // 1. URL check
            const isFigmaFile = /figma\.com\/(design|file|proto)\//.test(window.location.href);

            FP.state.fileKey = null;
            FP.state.selectedNodeId = null;

            if (!isFigmaFile) return;

            const urlMatch = window.location.href.match(/\/design\/([^\/]+)/) ||
                window.location.href.match(/\/file\/([^\/]+)/);
            if (urlMatch) FP.state.fileKey = urlMatch[1];

            const nodeMatch = window.location.href.match(/[?&]node-id=([^&]+)/);
            if (nodeMatch) {
                const rawId = decodeURIComponent(nodeMatch[1]);
                FP.state.selectedNodeId = rawId.replace('-', ':');
            }

            // 2. Already injected?
            if (document.getElementById('figpal-container')) {
                isInjected = true;
                return;
            }

            // 3. Detect editor
            const targetElement = document.querySelector('[data-testid="design-toolbelt-wrapper"]') ||
                document.querySelector('[data-testid="objects-panel"]');

            if (targetElement && !isInjected) {
                console.log('FigPal: Editor detected via', targetElement.getAttribute('data-testid'));
                inject();
            }
        }, 1000);
    }

    // ─── DOM Injection ───────────────────────────────────────────────────
    function inject() {
        if (document.getElementById('figpal-container')) return;
        console.log('FigPal: Injecting...');
        isInjected = true;

        // Sprites
        const defaultSprite = chrome.runtime.getURL('assets/selection.svg');
        const thinkingSprite = chrome.runtime.getURL('assets/thinking.svg');
        const homeSprite = chrome.runtime.getURL('assets/home.svg');

        FP.state.sprites = {
            default: defaultSprite,
            thinking: thinkingSprite,
            home: homeSprite,
        };

        // Container
        const container = document.createElement('div');
        container.id = 'figpal-container';

        // Home signpost
        const home = document.createElement('img');
        home.id = 'figpal-home';
        home.src = homeSprite;

        // Follower character
        const follower = document.createElement('img');
        follower.id = 'figpal-follower';
        follower.src = defaultSprite;
        follower.onerror = () => console.error('FigPal: Could not load image from', follower.src);

        // Chat bubble
        const chatBubble = document.createElement('div');
        chatBubble.id = 'figpal-chat-bubble';
        chatBubble.innerHTML = `
      <div class="figpal-chat-header">
        <span>DS Guardian</span>
        <select id="figpal-model-selector" title="Change AI Model"></select>
        <button class="figpal-close-btn" aria-label="Close chat">×</button>
      </div>
      <div class="figpal-chat-content">
        <!-- Messages injected here by renderer.js -->
      </div>
      <div class="figpal-chat-input-area">
        <input type="text" placeholder="Ask me anything..." />
        <button id="figpal-send-btn" title="Send message">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9L9 5L1 1V9Z" fill="white"/>
          </svg>
        </button>
        <button id="figpal-stop-btn" title="Stop generating" style="display: none;">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="10" rx="2" fill="white"/>
          </svg>
        </button>
      </div>
      <div class="figpal-resizer top"></div>
      <div class="figpal-resizer top-left"></div>
      <div class="figpal-resizer top-right"></div>
      <div class="figpal-resizer left"></div>
      <div class="figpal-resizer right"></div>
      <div class="figpal-resizer bottom-left"></div>
      <div class="figpal-resizer bottom-right"></div>
    `;

        // Assemble DOM
        document.body.appendChild(container);
        document.body.appendChild(home);
        container.appendChild(follower);
        container.appendChild(chatBubble);

        // Store refs
        FP.state.elements = { container, follower, chatBubble, home };

        // ─── Wire up UI ──────────────────────────────────────────────────
        wireCloseButton(chatBubble, container);
        wireModelSelector(chatBubble);
        wireSendButton(chatBubble);
        wireStopButton(chatBubble, follower, defaultSprite);
        wireInputListeners(chatBubble);

        // ─── Bootstrap modules ───────────────────────────────────────────
        FP.setup.init();
        FP.character.startAnimation();
        FP.character.initInteractions();

        // ─── Listen for thinking state → toggle buttons ──────────────────
        FP.on('ai-thinking', (isThinking) => {
            toggleInputState(chatBubble, isThinking);
        });

        console.log('FigPal: Loaded successfully!');
    }

    // ─── UI Wiring Helpers ───────────────────────────────────────────────

    function wireCloseButton(chatBubble, container) {
        const closeBtn = chatBubble.querySelector('.figpal-close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.remove('chat-visible');
        });
    }

    function wireModelSelector(chatBubble) {
        const modelSelector = chatBubble.querySelector('#figpal-model-selector');
        if (!modelSelector) return;

        function populateModels(models) {
            modelSelector.innerHTML = '';
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                modelSelector.appendChild(opt);
            });
        }

        // Load saved model list or use provider defaults
        chrome.storage.local.get(['selectedModel', 'provider'], (res) => {
            const provider = res.provider || FP.state.provider || 'gemini';
            const cfg = FP.ai.PROVIDERS[provider];
            const models = cfg ? cfg.models : ['gemini-2.5-flash'];

            populateModels(models);

            if (res.selectedModel && models.includes(res.selectedModel)) {
                modelSelector.value = res.selectedModel;
                FP.state.selectedModel = res.selectedModel;
            } else {
                modelSelector.value = models[0];
                FP.state.selectedModel = models[0];
            }
        });

        modelSelector.addEventListener('change', (e) => {
            FP.state.selectedModel = e.target.value;
            chrome.storage.local.set({ selectedModel: e.target.value });
        });

        // Update model list when provider changes
        FP.on('setup-complete', (data) => {
            const cfg = FP.ai.PROVIDERS[data.provider];
            if (cfg) {
                populateModels(cfg.models);
                modelSelector.value = cfg.models[0];
                FP.state.selectedModel = cfg.models[0];
            }
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

    function wireStopButton(chatBubble, follower, defaultSprite) {
        const stopBtn = chatBubble.querySelector('#figpal-stop-btn');

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

            follower.src = defaultSprite;
            follower.classList.remove('thinking');
            const avatars = chatBubble.querySelectorAll('.figpal-avatar');
            if (avatars.length > 0) {
                avatars[avatars.length - 1].src = defaultSprite;
            }
        });
    }

    function wireInputListeners(chatBubble) {
        const chatInput = chatBubble.querySelector('.figpal-chat-input-area input');
        if (!chatInput) return;

        chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                const userText = chatInput.value.trim();
                if (userText) {
                    chatInput.value = '';
                    FP.flow.handleUserMessage(userText);
                }
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
            sendBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
        } else {
            stopBtn.style.display = 'none';
            sendBtn.style.display = 'flex';
            setTimeout(() => chatInput?.focus(), 50);
        }
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.injector = { start };
})();
