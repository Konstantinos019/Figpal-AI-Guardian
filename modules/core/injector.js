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

            // 2. Main Injection Logic
            const toolbarWrapper = document.querySelector('[data-testid="design-toolbelt-wrapper"]');
            const targetElement = toolbarWrapper || document.querySelector('[data-testid="objects-panel"]');

            if (targetElement) {
                inject();
                injectToolbarButton(toolbarWrapper);
            }
        }, 1000);
    }

    function injectToolbarButton(toolbarWrapper) {
        if (!toolbarWrapper) return;

        // Figma UI3 can have multiple toolbar rows (Design vs Dev Mode).
        const leftSideRows = Array.from(toolbarWrapper.querySelectorAll('[class*="leftSideRow"]'));

        leftSideRows.forEach(row => {
            // Check if already injected in THIS specific row
            if (row.querySelector('.figpal-toolbar-btn')) return;
            if (row.offsetWidth === 0 || row.offsetHeight === 0) return;

            // Find a native button to clone (prioritize standard square tools like Move or Rectangle)
            const templateBtn = row.querySelector('[aria-label="Move"]') ||
                row.querySelector('[aria-label="Rectangle"]') ||
                row.querySelector('[aria-label="Actions"]') ||
                row.querySelector('.toolbelt_button--topLevelButtonNew--KhQeE');

            if (!templateBtn) return;

            const toolbarBtn = templateBtn.cloneNode(true);
            toolbarBtn.className = templateBtn.className + ' figpal-toolbar-btn';
            toolbarBtn.setAttribute('aria-label', 'DS Guardian');
            toolbarBtn.setAttribute('data-testid', 'ds-guardian-tool');
            toolbarBtn.setAttribute('data-tooltip', 'DS Guardian');
            toolbarBtn.setAttribute('data-tooltip-shortcut', 'Alt+D');
            toolbarBtn.setAttribute('aria-pressed', 'false');
            toolbarBtn.classList.remove('toolbelt_button--selectedButton--ebyl7'); // Start unselected

            // Replace icon and remove dropdown arrow
            const iconContainer = toolbarBtn.querySelector('svg') || toolbarBtn;

            // Remove any extra elements like the dropdown arrow (chevron)
            toolbarBtn.querySelectorAll('svg').forEach((s, i) => {
                if (i > 0) s.remove(); // Keep only the first SVG (the icon)
            });
            // Also remove any div that might contain an arrow
            toolbarBtn.querySelectorAll('[class*="chevron"], [class*="arrow"]').forEach(el => el.remove());

            iconContainer.innerHTML = `
                <g id="Vector">
                    <path d="M11.5492 10.0125C11.7859 10.0544 11.9439 10.2802 11.9022 10.5169C11.8603 10.7537 11.6346 10.9116 11.3978 10.8699C11.1609 10.8282 11.003 10.6024 11.0448 10.3655C11.0866 10.1287 11.3123 9.97079 11.5492 10.0125Z" fill="currentColor"/>
                    <path d="M7.355 9.17303C7.59177 9.21487 7.74975 9.44147 7.70799 9.67827C7.66606 9.9149 7.4403 10.0729 7.2036 10.0313C6.96678 9.98951 6.80894 9.76368 6.85061 9.52687C6.89237 9.29001 7.11814 9.13127 7.355 9.17303Z" fill="currentColor"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.2688 4.21928C10.2128 3.95874 11.432 3.95343 13.2078 4.50762C15.1158 5.1031 16.9967 6.34414 18.552 7.85379C20.107 9.36322 21.3658 11.1696 22.0045 12.9266C22.6403 14.6759 22.6871 16.462 21.6634 17.8191C20.6441 19.17 18.6699 19.9515 15.6081 19.9515C13.6101 19.9515 11.2386 19.7944 8.96004 19.2081C6.68282 18.6222 4.46917 17.6001 2.82058 15.8509C2.42153 15.4275 2.07853 15.0648 1.85518 14.5886C1.62736 14.1028 1.53877 13.5369 1.53876 12.7182C1.53883 11.7842 1.9314 11.2128 2.45738 10.904C2.67085 10.7786 2.89555 10.7041 3.10297 10.659C3.05182 10.3181 3.12785 9.92367 3.22886 9.58131C3.33863 9.20933 3.49775 8.83108 3.65159 8.52234C3.79747 8.22966 3.9637 7.94726 4.09985 7.80275C5.02461 6.82157 6.00591 5.92491 7.20955 5.25273C7.7037 4.97667 8.35936 4.47036 9.2688 4.21928ZM12.9484 5.33948C11.2851 4.82038 10.2421 4.85435 9.501 5.05879C8.72571 5.27281 8.27203 5.65765 7.63399 6.01399C6.54223 6.62373 5.63166 7.44776 4.73352 8.40071C4.6935 8.44351 4.57586 8.62077 4.43157 8.9102C4.29474 9.18476 4.15631 9.51558 4.06412 9.82797C3.96751 10.1555 3.93975 10.4035 3.96545 10.5433C3.96927 10.5639 3.97405 10.5779 3.97736 10.5867C3.98599 10.5883 3.99985 10.5918 4.01989 10.5918C4.72039 10.5919 5.43182 11.0349 6.08254 11.0349C6.7593 11.2697 7.36354 11.5093 7.9453 11.6286C8.45304 11.7327 8.99344 11.8142 9.55799 11.8966C10.1186 11.9784 10.7037 12.0616 11.283 12.1688C12.4391 12.3826 13.6174 12.6991 14.6308 13.3315C14.8347 13.4589 14.8975 13.728 14.7703 13.932C14.643 14.1358 14.3738 14.1978 14.1698 14.0706C13.2958 13.5252 12.2461 13.2327 11.1248 13.0253C10.5653 12.9218 9.99874 12.8409 9.43211 12.7582C8.8694 12.6761 8.30551 12.5915 7.77008 12.4818C7.11398 12.3472 6.41903 12.0733 5.79675 11.8574C5.14862 11.6326 4.55997 11.4629 4.01989 11.4628C3.96449 11.4628 3.90896 11.458 3.85488 11.45C3.82366 11.4572 3.79129 11.4627 3.75791 11.4628C3.52563 11.4628 3.17717 11.4912 2.89798 11.655C2.65801 11.7961 2.40982 12.07 2.40975 12.7182C2.40976 13.4821 2.49433 13.9002 2.64366 14.2186C2.79749 14.5467 3.03588 14.8099 3.45426 15.2538C4.95164 16.8425 6.9948 17.8028 9.17693 18.3644C11.3578 18.9255 13.6493 19.0805 15.6081 19.0805C18.5606 19.0805 20.1923 18.323 20.9685 17.2943C21.7395 16.2719 21.7725 14.8375 21.1862 13.2243C20.6025 11.6185 19.4294 9.9194 17.9455 8.47896C16.4617 7.03872 14.6949 5.88459 12.9484 5.33948Z" fill="currentColor"/>
                </g>
            `;

            // Ensure standard SVG attributes for scaling
            const svgElement = toolbarBtn.querySelector('svg');
            if (svgElement) {
                svgElement.setAttribute('viewBox', '0 0 24 24');
                svgElement.setAttribute('width', '20');
                svgElement.setAttribute('height', '20');
                svgElement.style.width = '20px';
                svgElement.style.height = '20px';
            }

            // Target the inner tools row for better alignment
            const targetRow = row.querySelector('[class*="enabledToolsRow"]') || row;
            targetRow.appendChild(toolbarBtn);

            toolbarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                FP.state.elements.container.classList.toggle('chat-visible');
                updateToolbarBtnState();
            });
        });

        // Sync state
        const observer = new MutationObserver(() => updateToolbarBtnState());
        observer.observe(FP.state.elements.container, { attributes: true, attributeFilter: ['class'] });

        updateToolbarBtnState();
    }

    function updateToolbarBtnState() {
        const toolbarBtns = document.querySelectorAll('.figpal-toolbar-btn');
        const container = FP.state.elements.container;
        if (!toolbarBtns.length || !container) return;

        toolbarBtns.forEach(btn => {
            if (container.classList.contains('chat-visible')) {
                btn.classList.add('toolbelt_button--selectedButton--ebyl7');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('toolbelt_button--selectedButton--ebyl7');
                btn.setAttribute('aria-pressed', 'false');
            }
        });
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
        <div class="figpal-header-left">
          <span>DS Guardian</span>
          <div id="figpal-connection-dot" class="figpal-status-dot" title="Bridge Status"></div>
        </div>
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

        // ─── Listen for plugin status → update dot ───────────────────────
        FP.on('plugin-status', (data) => {
            const dot = document.getElementById('figpal-connection-dot');
            if (dot) {
                if (data.connected) {
                    dot.classList.add('connected');
                } else {
                    dot.classList.remove('connected');
                }
            }
        });

        // ─── Listen for selection updates → visual feedback ──────────────
        FP.on('selection-updated', (selectionData) => {
            const follower = FP.state.elements.follower;
            if (!follower) return;

            const selection = selectionData.nodes || selectionData;

            if (selection && selection.length > 0) {
                follower.classList.add('captured');
                // Trigger a quick pulse to show we saw the selection
                follower.classList.remove('figpal-selection-pulse');
                void follower.offsetWidth; // flush CSS
                follower.classList.add('figpal-selection-pulse');
            } else {
                follower.classList.remove('captured');
                follower.style.filter = '';
            }
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
        }

        // Initialize
        populateModels();

        // Load saved selection
        chrome.storage.local.get(['selectedModel', 'provider'], (res) => {
            if (res.provider) FP.state.provider = res.provider;
            if (res.selectedModel) {
                FP.state.selectedModel = res.selectedModel;
                populateModels(); // Re-populate with correct models and select saved one
            }
        });

        modelSelector.addEventListener('change', (e) => {
            FP.state.selectedModel = e.target.value;
            console.log(`FigPal: Model changed to ${FP.state.selectedModel}`);
            chrome.storage.local.set({ selectedModel: e.target.value });
        });

        // Refresh when provider changes (e.g., via /connect or setup)
        FP.on('setup-complete', (data) => {
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
