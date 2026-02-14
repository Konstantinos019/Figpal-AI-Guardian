// modules/onboarding/setup.js
// Provider selection, API key input, welcome screen.
// Emits: 'setup-complete' when key is saved.
// Exports: FigPal.setup = { init, showSetupPrompt, showWelcomeMessage }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Provider Options ────────────────────────────────────────────────
    function getProviderOptions() {
        return Object.keys(FP.ai.PROVIDERS).map(key => ({
            value: key,
            label: FP.ai.PROVIDERS[key].name,
        }));
    }

    // ─── Setup Prompt ────────────────────────────────────────────────────
    // ─── Setup Prompt ────────────────────────────────────────────────────
    function showSetupPrompt() {
        const providers = getProviderOptions();
        const providerOptionsHtml = providers
            .map(p => `<option value="${p.value}" ${p.value === FP.state.provider ? 'selected' : ''}>${p.label}</option>`)
            .join('');

        FP.chat.addMessage(`
      <div class="figpal-setup">
        <h3>👋 API Connection</h3>
        <p>Connect multiple AI providers. Switch anytime from the chat header.</p>

        <label>AI Provider</label>
        <select id="figpal-provider-select" class="figpal-setup-select">
          ${providerOptionsHtml}
        </select>

        <label>API Key</label>
        <input type="password" id="figpal-key-input"
               placeholder="Paste your API key here"
               class="figpal-setup-input" />

        <button id="figpal-save-key" class="figpal-setup-btn">Connect Provider ✨</button>
      </div>
    `, 'bot', false, true);

        // Bind save handler
        setTimeout(() => {
            const saveBtn = document.getElementById('figpal-save-key');
            const keyInput = document.getElementById('figpal-key-input');
            const providerSelect = document.getElementById('figpal-provider-select');

            if (providerSelect && keyInput) {
                // Load existing key if any
                keyInput.value = FP.state.apiKeys[providerSelect.value] || '';

                providerSelect.addEventListener('change', () => {
                    keyInput.value = FP.state.apiKeys[providerSelect.value] || '';
                    keyInput.style.border = '';
                });
            }

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const key = keyInput?.value?.trim();
                    const provider = providerSelect?.value || 'gemini';

                    if (!key) {
                        keyInput.style.border = '1px solid #ff4444';
                        keyInput.placeholder = 'Key cannot be empty';
                        return;
                    }

                    // Update State
                    FP.state.provider = provider;
                    FP.state.apiKeys[provider] = key;
                    FP.state.selectedModel = FP.ai.PROVIDERS[provider].models[0];

                    // Persist to sync for cloud portability
                    const stateToSave = {
                        provider: provider,
                        apiKeys: FP.state.apiKeys,
                        selectedModel: FP.state.selectedModel,
                    };

                    chrome.storage.sync.set(stateToSave);
                    chrome.storage.local.set(stateToSave, () => {
                        console.log(`FigPal: Connected and Synced to ${provider} ☁️`);
                        saveBtn.textContent = 'Synced ✅';
                        saveBtn.classList.add('connected');
                        setTimeout(() => {
                            FP.emit('setup-complete', { provider, model: FP.state.selectedModel });
                            showWelcomeMessage();
                        }, 500);
                    });
                });
            }

            // Stop propagation for inputs so Figma doesn't hijack keys/paste
            [keyInput, providerSelect].forEach(el => {
                if (!el) return;
                el.addEventListener('keydown', (e) => e.stopPropagation());
                el.addEventListener('paste', (e) => e.stopPropagation());
                el.addEventListener('contextmenu', (e) => e.stopPropagation());
            });
        }, 100);
    }

    // ─── Welcome Message ─────────────────────────────────────────────────
    function showWelcomeMessage() {
        const providerName = FP.ai.PROVIDERS[FP.state.provider]?.name || FP.state.provider;
        const isPluginConnected = FP.pluginBridge && FP.pluginBridge.isConnected;
        const palName = (FP.state.activePal && FP.state.activePal.name) ? FP.state.activePal.name : "FigBot";

        FP.chat.addMessage(
            `Hey! I'm **${palName}** 🛡️ (powered by **${providerName}**).\n\n` +
            `I can help you:\n` +
            `- **Analyze** your Figma selections ${isPluginConnected ? '**(Native ✅)**' : ''}\n` +
            `- **Check** design system compliance\n` +
            `- **Suggest** improvements\n\n` +
            `${isPluginConnected
                ? 'I am connected to your Figma! Select any layer to start.'
                : 'Pro tip: Run the **FigPal Bridge** plugin in Figma for better performance!'}\n\n` +
            `_Quick commands: /reset, /clear, /check, /connect_`,
            'bot'
        );

        // Always show quick actions after welcome
        showQuickStartButtons();
    }

    // ─── Quick Start Buttons ─────────────────────────────────────────────
    function showQuickStartButtons() {
        const isPluginConnected = FP.pluginBridge && FP.pluginBridge.isConnected;
        const skills = FP.state.skills || [];

        let adaptiveButtons = '[Audit:FIX:AUDIT] [Connect Bridge:FIX:LAUNCH_BRIDGE]';

        // Add context-aware buttons based on skills
        if (skills.some(s => s.toLowerCase().includes('color'))) {
            adaptiveButtons += ' [Check Colors:/audit]';
        }
        if (skills.some(s => s.toLowerCase().includes('corner') || s.toLowerCase().includes('radius'))) {
            adaptiveButtons += ' [Check Corners:/audit]';
        }

        adaptiveButtons += ' [Help:/help]';

        const welcomeActions = `
[[Action:Quick Start 👻]]
What should we haunt today?
${adaptiveButtons}
`;
        FP.chat.addMessage(welcomeActions, 'bot');
    }

    // ─── Listen for Plugin Connection ────────────────────────────────────
    FP.on('plugin-status', (status) => {
        if (status.connected) {
            console.log('FigPal Setup: Plugin connected, showing quick start.');
            // If the chat is empty, show quick start
            const content = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
            if (content && content.children.length <= 1) {
                showQuickStartButtons();
            }
        }
    });

    // ─── Init ────────────────────────────────────────────────────────────
    function init() {
        // Load from SYNC first (Cloud), fallback to LOCAL
        chrome.storage.sync.get(['apiKeys', 'provider', 'selectedModel', 'skills'], (syncRes) => {
            chrome.storage.local.get(['apiKeys', 'provider', 'selectedModel', 'skills'], (localRes) => {

                // Merge or pick sync over local
                FP.state.apiKeys = syncRes.apiKeys || localRes.apiKeys || {};
                FP.state.provider = syncRes.provider || localRes.provider || 'gemini';
                FP.state.selectedModel = syncRes.selectedModel || localRes.selectedModel || null;
                FP.state.skills = syncRes.skills || localRes.skills || [];

                console.log('FigPal Setup: Cloud State Restored ☁️', {
                    provider: FP.state.provider,
                    skills: FP.state.skills?.length || 0
                });

                FP.emit('setup-complete', { provider: FP.state.provider });

                if (FP.state.apiKeys[FP.state.provider]) {
                    showWelcomeMessage();
                } else {
                    showSetupPrompt();
                }
            });
        });
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.setup = { init, showSetupPrompt, showWelcomeMessage, showQuickStartButtons };
})();
