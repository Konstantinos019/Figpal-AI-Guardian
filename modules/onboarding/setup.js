// modules/onboarding/setup.js
// Provider selection, API key input, welcome screen.
// Emits: 'setup-complete' when key is saved.
// Exports: FigPal.setup = { init, showSetupPrompt, showWelcomeMessage, showQuickStartButtons }
(function () {
    'use strict';

    const FP = window.FigPal;



    // Defensive: Ensure utils exist even if module failed to load
    FP.utils = FP.utils || {};
    if (!FP.utils.escapeHTML) {
        console.warn('FigPal: FP.utils.escapeHTML missing, using fallback.');
        FP.utils.escapeHTML = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
    }

    const ICONS = {
        edit: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        delete: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>`,
        check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    };

    // ─── Provider Options ────────────────────────────────────────────────
    function getProviderOptions() {
        if (!FP.ai || !FP.ai.PROVIDERS) {
            console.error('FigPal Setup: FP.ai or PROVIDERS missing', FP.ai);
            return [{ value: 'error', label: 'Error: Module Loading...' }];
        }
        return Object.keys(FP.ai.PROVIDERS).map(key => ({
            value: key,
            label: FP.ai.PROVIDERS[key].name || key,
        }));
    }

    // ─── Setup Prompt ────────────────────────────────────────────────────
    function showSetupPrompt() {
        const providers = getProviderOptions();
        const providerOptionsHtml = providers
            .map(p => `<option value="${p.value}" ${p.value === (FP.state.provider || 'gemini') ? 'selected' : ''}>${p.label}</option>`)
            .join('');

        const setupContent = `
            <div class="figpal-setup">
                <style>
                    .figpal-setup { font-family: Inter, sans-serif; color: #1e1e1e; }
                    .figpal-setup h3 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #0D99FF; display: flex; align-items: center; gap: 6px; }
                    .figpal-setup p { margin: 0 0 12px; font-size: 11px; color: #666; line-height: 1.3; }
                    
                    /* Compact Form Elements */
                    .figpal-setup-select, .figpal-setup-input { 
                        width: 100%; height: 28px; 
                        background: #fff; border: 1px solid #e5e5e5; 
                        border-radius: 4px; color: #1e1e1e; padding: 0 8px; 
                        font-size: 11px; margin-top: 2px;
                        transition: border-color 0.2s, box-shadow 0.2s;
                    }
                    .figpal-setup-select:focus, .figpal-setup-input:focus { 
                        border-color: #0D99FF; box-shadow: 0 0 0 1px #0D99FF; outline: none; 
                    }
                    
                    .figpal-setup label { 
                        font-size: 10px; font-weight: 600; text-transform: uppercase; 
                        letter-spacing: 0.05em; color: #888; 
                    }
                    
                    /* Primary Button */
                    .figpal-setup-btn {
                        width: 100%; height: 28px; background: #0D99FF; border: none; border-radius: 4px; 
                        color: #fff; font-size: 11px; font-weight: 500; cursor: pointer; margin-top: 8px;
                        transition: background 0.2s;
                    }
                    .figpal-setup-btn:hover { background: #007be5; }
                    .figpal-setup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                    
                    /* Key List Area */
                    .figpal-key-list { margin-top: 12px; border-top: 1px solid #f0f0f0; padding-top: 8px; }
                    
                    /* Add Section */
                    .figpal-setup-add-section { 
                        margin-top: 12px; background: #f9f9f9; padding: 10px; border-radius: 6px; border: 1px solid #eee; 
                    }

                    /* Dark Mode Support (injected by higher level, but keeping basic support here in case) */
                    @media (prefers-color-scheme: dark) {
                        .figpal-setup { color: #fff; }
                        .figpal-setup p { color: #aaa; }
                        .figpal-setup-select, .figpal-setup-input { background: #2c2c2c; border-color: #444; color: #fff; }
                        .figpal-setup-add-section { background: #2c2c2c; border-color: #333; }
                        .figpal-key-list { border-color: #333; }
                    }
                </style>
                
                <h3>👋 API Connection</h3>
                <p>Connect your API keys. Keys work for all models.</p>

                <div style="margin-bottom: 8px;">
                    <label>Provider</label>
                    <select id="figpal-setup-provider" class="figpal-setup-select">
                        ${providerOptionsHtml}
                    </select>
                </div>

                <!-- Model selection removed as keys are universal -->

                <div class="figpal-key-list">
                    <!-- Keys will be injected here -->
                </div>

                <div class="figpal-setup-add-section">
                    <label>Add New Key</label>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <input type="password" id="figpal-setup-key" placeholder="Paste API key" class="figpal-setup-input" />
                        <div style="display:flex; gap:6px;">
                            <input type="text" id="figpal-setup-alias" placeholder="Alias (Optional)" class="figpal-setup-input" style="flex:1;" />
                            <button id="figpal-setup-save" class="figpal-setup-btn" style="width: auto; padding: 0 12px; margin-top: 2px;">Add</button>
                        </div>
                    </div>
                </div>
            </div>

        `;

        const { msgDiv } = FP.chat.addMessage('', 'bot', false, true);
        if (!msgDiv) return;

        // Render immediately (no typing animation for forms)
        msgDiv.innerHTML = setupContent;

        // Execute immediately
        (function () {
            const providerSelect = msgDiv.querySelector('#figpal-setup-provider');
            const keyInput = msgDiv.querySelector('#figpal-setup-key');
            const aliasInput = msgDiv.querySelector('#figpal-setup-alias');
            const saveBtn = msgDiv.querySelector('#figpal-setup-save');

            if (!providerSelect || !keyInput || !aliasInput || !saveBtn) {
                console.error('FigPal Setup: One or more elements missing from setupContent', {
                    providerSelect: !!providerSelect,
                    keyInput: !!keyInput,
                    aliasInput: !!aliasInput,
                    saveBtn: !!saveBtn
                });
                return;
            }

            // 1. Suppression: prevent Figma from stealing shortcuts/paste
            [keyInput, aliasInput].forEach(el => {
                if (!el) return;
                el.addEventListener('keydown', (e) => {
                    // ALWAYS stop propagation for our input to prevent Figma from seeing these keys.
                    // interactions.js (capture) now lets everything but clipboard actions through,
                    // so we Shield here in the bubbling phase.
                    e.stopPropagation();
                });
                el.addEventListener('paste', (e) => e.stopPropagation());
                el.addEventListener('contextmenu', (e) => e.stopPropagation());
            });

            // 2. Initial render
            renderKeys(msgDiv, providerSelect.value);

            // 3. Events
            providerSelect.addEventListener('change', () => {
                renderKeys(msgDiv, providerSelect.value);
            });



            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    const provider = providerSelect.value;
                    const key = keyInput.value.trim();
                    const alias = aliasInput.value.trim() || `Key ${Date.now().toString().slice(-4)}`;

                    if (!key) {
                        keyInput.style.borderColor = '#ff4444';
                        setTimeout(() => keyInput.style.borderColor = '', 2000);
                        return;
                    }

                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Saving...';

                    try {
                        const { apiKeys = {} } = await new Promise(r => chrome.storage.sync.get('apiKeys', r));
                        if (!apiKeys[provider]) apiKeys[provider] = [];

                        // Array check/migration
                        let keysArr = apiKeys[provider];
                        if (!Array.isArray(keysArr)) {
                            keysArr = keysArr ? [{ key: keysArr, alias: 'Default' }] : [];
                        }

                        // Duplicate check
                        if (keysArr.some(k => k.key === key)) {
                            alert('This key is already added.');
                            return;
                        }

                        keysArr.push({ key, alias });
                        apiKeys[provider] = keysArr;
                        FP.state.apiKeys = apiKeys;

                        await new Promise(r => chrome.storage.sync.set({ apiKeys, provider }, r));

                        keyInput.value = '';
                        aliasInput.value = '';
                        renderKeys(msgDiv, provider);

                        saveBtn.textContent = '✅ Added';
                        setTimeout(() => saveBtn.textContent = 'Add ✨', 2000);

                        if (keysArr.length === 1) {
                            FP.emit('setup-complete', { provider });
                            showWelcomeMessage();
                        }
                    } catch (err) {
                        console.error('Save failed', err);
                        alert('Error saving key');
                    } finally {
                        saveBtn.disabled = false;
                    }
                });
            }
        })();
    }



    function renderKeys(container, provider) {
        const keyList = container.querySelector('.figpal-key-list');
        if (!keyList) return;

        chrome.storage.sync.get('apiKeys', (data) => {
            let keys = (data.apiKeys && data.apiKeys[provider]) || [];

            // Critical Migration: Ensure all keys are objects and have aliases
            if (!Array.isArray(keys)) {
                keys = keys ? [{ key: keys, alias: 'Default' }] : [];
            }
            // If any item in the array is just a string, convert it
            keys = keys.map((k, i) => {
                if (typeof k === 'string') return { key: k, alias: `Key ${i + 1}` };
                if (!k.alias) return { ...k, alias: `Key ${i + 1}` };
                return k;
            });

            if (keys.length === 0) {
                keyList.innerHTML = '<label>Active Keys</label><p style="opacity:0.5; font-size:11px; margin: 8px 0 0;">No keys found.</p>';
                return;
            }

            // Using styles defined in showSetupPrompt ("figpal-setup" scope)
            // Background: #f9f9f9 (light gray for items)
            // Text: #1e1e1e (dark gray)
            // Border: #eee
            // Icons: #666 (default), #0D99FF (save), #ff4444 (delete)

            keyList.innerHTML = '<label>Active Keys</label>' + keys.map((k, i) => `
                <div class="figpal-key-item" data-index="${i}" style="display:flex; align-items:center; justify-content:space-between; background:#f9f9f9; padding:6px 10px; border-radius:4px; margin-top:6px; border:1px solid #eee;">
                    <div class="figpal-key-info" style="flex:1; margin-right:8px; overflow:hidden;">
                        <div class="info-view" style="display:flex; flex-direction:column;">
                            <span class="view-alias" style="font-size:11px; font-weight:600; color:#1e1e1e; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${FP.utils.escapeHTML(k.alias)}</span>
                            <span style="font-size:10px; color:#888; font-family:monospace;">••••${FP.utils.escapeHTML(k.key.slice(-4))}</span>
                        </div>
                        <div class="edit-view" style="display:none; flex-direction:column; gap:4px;">
                            <input type="text" class="edit-alias-input" value="${FP.utils.escapeHTML(k.alias)}" style="font-size:11px; background:#fff; border:1px solid #e5e5e5; color:#1e1e1e; padding:2px 6px; border-radius:3px;" />
                            <input type="password" class="edit-key-input" value="${FP.utils.escapeHTML(k.key)}" style="font-size:11px; background:#fff; border:1px solid #e5e5e5; color:#1e1e1e; padding:2px 6px; border-radius:3px;" />
                        </div>
                    </div>
                    <div style="display:flex; gap:2px; flex-shrink:0;">
                        <button class="edit-btn" style="background:none; border:none; color:#888; cursor:pointer; padding:4px; border-radius:3px; transition:background 0.2s;">
                            ${ICONS.edit || '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'}
                        </button>
                        <button class="save-btn" style="display:none; background:none; border:none; color:#0D99FF; cursor:pointer; padding:4px; border-radius:3px; transition:background 0.2s;">
                            ${ICONS.check || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>'}
                        </button>
                        <button class="delete-btn" style="background:none; border:none; color:#ff4444; cursor:pointer; padding:4px; border-radius:3px; transition:background 0.2s;">
                            ${ICONS.delete || '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'}
                        </button>
                    </div>
                </div>
            `).join('');

            // Bind key item actions
            keyList.querySelectorAll('.figpal-key-item').forEach(item => {
                const idx = parseInt(item.dataset.index);
                const infoView = item.querySelector('.info-view');
                const editView = item.querySelector('.edit-view');
                const editBtn = item.querySelector('.edit-btn');
                const saveBtn = item.querySelector('.save-btn');
                const deleteBtn = item.querySelector('.delete-btn');

                const aliasInp = item.querySelector('.edit-alias-input');
                const keyInp = item.querySelector('.edit-key-input');

                // Bind suppression even for dynamic sub-inputs
                [aliasInp, keyInp].forEach(inp => {
                    inp.addEventListener('keydown', (e) => {
                        e.stopPropagation();
                    });
                    inp.addEventListener('paste', (e) => e.stopPropagation());
                    inp.addEventListener('contextmenu', (e) => e.stopPropagation());
                });

                // Add hover effect for buttons
                [editBtn, saveBtn, deleteBtn].forEach(btn => {
                    btn.onmouseenter = () => btn.style.background = 'rgba(0,0,0,0.05)';
                    btn.onmouseleave = () => btn.style.background = 'none';
                });

                editBtn.onclick = () => {
                    infoView.style.display = 'none';
                    editView.style.display = 'flex';
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'block';
                    aliasInp.focus();
                };

                saveBtn.onclick = async () => {
                    const newAlias = aliasInp.value.trim() || `Key ${idx + 1}`;
                    const newKey = keyInp.value.trim();
                    if (!newKey) return;

                    keys[idx] = { key: newKey, alias: newAlias };
                    const { apiKeys = {} } = await new Promise(r => chrome.storage.sync.get('apiKeys', r));
                    apiKeys[provider] = keys;
                    await new Promise(r => chrome.storage.sync.set({ apiKeys }, r));
                    renderKeys(container, provider);
                };

                deleteBtn.onclick = async () => {
                    if (!confirm('Remove this key?')) return;
                    keys.splice(idx, 1);
                    const { apiKeys = {} } = await new Promise(r => chrome.storage.sync.get('apiKeys', r));
                    apiKeys[provider] = keys;
                    await new Promise(r => chrome.storage.sync.set({ apiKeys }, r));
                    renderKeys(container, provider);
                };
            });
        });
    }

    // ─── Welcome Message ─────────────────────────────────────────────────
    function showWelcomeMessage() {
        const providerName = FP.ai.PROVIDERS[FP.state.provider]?.name || FP.state.provider;
        const isPluginConnected = FP.pluginBridge && FP.pluginBridge.isConnected;
        const palName = (FP.state.activePal && FP.state.activePal.name) ? FP.state.activePal.name : "FigBot";

        if (isPluginConnected) {
            // Simple message when plugin is connected
            FP.chat.addMessage(
                `Hey! I'm **${palName}** 🛡️ (powered by **${providerName}**).\n\n` +
                `I am connected to your Figma! Select any layer to start.\n\n` +
                `Type **/help** to see available commands.`,
                'bot'
            );
        } else {
            // Clear warning and instructions when plugin is not connected
            FP.chat.addMessage(
                `Hey! I'm **${palName}** 🛡️ (powered by **${providerName}**).\n\n` +
                `⚠️ **Plugin Required:** To use FigPal, you need to run the **FigPal Bridge** plugin in Figma.\n\n` +
                `**To Connect:**\n` +
                `1. Press \`Cmd + /\`in Figma\n` +
                `2. Type \`FigPal Bridge\`\n` +
                `3. Press Enter\n\n` +
                `I will auto-connect instantly! ⚡\n\n` +
                `Type **/help** to see available commands.`,
                'bot'
            );
        }

        showQuickStartButtons();
    }

    // ─── Quick Start Buttons ─────────────────────────────────────────────
    function showQuickStartButtons() {
        // Removed non-functional buttons
        // Users should use /help to discover commands
    }

    // ─── Init ────────────────────────────────────────────────────────────
    function init() {
        chrome.storage.sync.get(['apiKeys', 'provider', 'selectedModel', 'skills'], (syncRes) => {
            chrome.storage.local.get(['apiKeys', 'provider', 'selectedModel', 'skills'], (localRes) => {
                FP.state.apiKeys = syncRes.apiKeys || localRes.apiKeys || {};
                FP.state.provider = syncRes.provider || localRes.provider || 'gemini';
                FP.state.selectedModel = syncRes.selectedModel || localRes.selectedModel || null;
                FP.state.skills = syncRes.skills || localRes.skills || [];

                console.log('FigPal Setup: State Restored', { provider: FP.state.provider });
                FP.emit('setup-complete', { provider: FP.state.provider });

                if (FP.state.apiKeys[FP.state.provider]) {
                    showWelcomeMessage();
                } else {
                    showSetupPrompt();
                }
            });
        });

        // Listen for status changes
        FP.on('plugin-status', (status) => {
            if (status.connected) {
                const content = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
                if (content && content.children.length <= 1) showQuickStartButtons();
            }
        });
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.setup = { init, showSetupPrompt, showWelcomeMessage, showQuickStartButtons };
})();
