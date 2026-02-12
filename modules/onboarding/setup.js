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
    function showSetupPrompt() {
        const providers = getProviderOptions();
        const providerOptionsHtml = providers
            .map(p => `<option value="${p.value}">${p.label}</option>`)
            .join('');

        FP.chat.addMessage(`
      <div class="figpal-setup">
        <h3>👋 Welcome to FigPal!</h3>
        <p>Choose your AI provider and enter your API key to get started.</p>

        <label>AI Provider</label>
        <select id="figpal-provider-select" class="figpal-setup-select">
          ${providerOptionsHtml}
        </select>

        <label>API Key</label>
        <input type="password" id="figpal-key-input"
               placeholder="Paste your API key here"
               class="figpal-setup-input" />

        <button id="figpal-save-key" class="figpal-setup-btn">Save & Start ✨</button>
      </div>
    `, 'bot', false, true);

        // Bind save handler
        setTimeout(() => {
            const saveBtn = document.getElementById('figpal-save-key');
            const keyInput = document.getElementById('figpal-key-input');
            const providerSelect = document.getElementById('figpal-provider-select');

            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const key = keyInput?.value?.trim();
                    const provider = providerSelect?.value || 'gemini';

                    if (!key) {
                        keyInput.style.border = '1px solid #ff4444';
                        keyInput.placeholder = 'Key cannot be empty';
                        return;
                    }

                    FP.state.provider = provider;
                    FP.state.apiKey = key;
                    FP.state.selectedModel = FP.ai.PROVIDERS[provider].models[0];

                    chrome.storage.local.set({
                        provider: provider,
                        apiKey: key,
                        selectedModel: FP.state.selectedModel,
                    }, () => {
                        console.log(`FigPal: Saved ${provider} key`);
                        saveBtn.textContent = 'Saved ✅';
                        saveBtn.disabled = true;
                        FP.emit('setup-complete', { provider, model: FP.state.selectedModel });
                        showWelcomeMessage();
                    });
                });
            }
        }, 100);
    }

    // ─── Welcome Message ─────────────────────────────────────────────────
    function showWelcomeMessage() {
        const providerName = FP.ai.PROVIDERS[FP.state.provider]?.name || FP.state.provider;
        FP.chat.addMessage(
            `Hey! I'm your DS Guardian 🛡️ powered by **${providerName}**.\n\n` +
            `I can help you:\n` +
            `- **Analyze** your Figma selections\n` +
            `- **Check** design system compliance\n` +
            `- **Suggest** improvements\n\n` +
            `Select a layer in Figma and ask me anything!\n\n` +
            `_Quick commands: /reset, /clear, /check_`,
            'bot'
        );
    }

    // ─── Init ────────────────────────────────────────────────────────────
    function init() {
        chrome.storage.local.get(['provider', 'apiKey', 'selectedModel'], (result) => {
            if (result.apiKey) {
                FP.state.provider = result.provider || 'gemini';
                FP.state.apiKey = result.apiKey;
                FP.state.selectedModel = result.selectedModel || null;
                showWelcomeMessage();
            } else {
                showSetupPrompt();
            }
        });
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.setup = { init, showSetupPrompt, showWelcomeMessage };
})();
