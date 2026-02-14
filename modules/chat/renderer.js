// modules/chat/renderer.js
// Markdown parsing, message rendering, entity chips, action cards.
// Exports: FigPal.chat = { addMessage, parseMarkdown, ICONS, bindActions }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Icons for entity chips ──────────────────────────────────────────
    const ICONS = {
        FRAME: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1H9C10.1046 1 11 1.89543 11 3V9C11 10.1046 10.1046 11 9 11H3C1.89543 11 1 10.1046 1 9V3C1 1.89543 1.89543 1 3 1ZM3 0C1.34315 0 0 1.34315 0 3V9C0 10.6569 1.34315 12 3 12H9C10.6569 12 12 10.6569 12 9V3C12 1.34315 10.6569 0 9 0H3Z" fill="#888"/></svg>',
        COMPONENT: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1L3.5 3.5L6 6L8.5 3.5L6 1Z" stroke="#7B61FF"/><path d="M1 6L3.5 3.5L6 6L3.5 8.5L1 6Z" stroke="#7B61FF"/><path d="M11 6L8.5 3.5L6 6L8.5 8.5L11 6Z" stroke="#7B61FF"/><path d="M6 11L3.5 8.5L6 6L8.5 8.5L6 11Z" stroke="#7B61FF"/></svg>',
        INSTANCE: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1L3.5 3.5L6 6L8.5 3.5L6 1Z" stroke="#7B61FF"/><path d="M1 6L3.5 3.5L6 6L3.5 8.5L1 6Z" stroke="#7B61FF"/><path d="M11 6L8.5 3.5L6 6L8.5 8.5L11 6Z" stroke="#7B61FF"/><path d="M6 11L3.5 8.5L6 6L8.5 8.5L6 11Z" stroke="#7B61FF"/></svg>',
        TEXT: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 2H4.5V10H2.5V11H9.5V10H7.5V2H9.5V1H2.5V2Z" fill="#888"/></svg>',
        IMAGE: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="10" height="8" rx="1" stroke="#888"/><circle cx="4" cy="4.5" r="1.5" fill="#888"/><path d="M11 7.5L8 4.5L3 9.5H11V7.5Z" fill="#888"/></svg>'
    };

    // ─── Markdown Parser ─────────────────────────────────────────────────
    function parseMarkdown(text) {
        if (!text) return '';
        let html = text;

        // 1. Entity Chips: [Type:Name]
        html = html.replace(/\[(Frame|Component|Instance|Text|Image|Section|Group):([^\]]+)\]/g, (match, type, name) => {
            const upperType = type.toUpperCase();
            const icon = ICONS[upperType] || ICONS.FRAME;
            return `<span class="figpal-chip type-${type.toLowerCase()}">${icon} ${name.trim()}</span>`;
        });

        // 2. Action Cards: [[Action:Title]] ... [Btn1:Event1] [Btn2:Event2]
        html = html.replace(/\[\[Action:([^\]]+)\]\]([\s\S]*?)((?:\[[^\[\]]+:[^\]]+\]\s*)+)/g, (match, title, desc, buttons) => {
            const buttonHtml = buttons.replace(/\[([^\[\]]+?):([^\]]+)\]/g, (btnMatch, btnLabel, eventName) => {
                return `<button class="figpal-action-btn" data-event="${eventName.trim()}">${btnLabel.trim()}</button>`;
            });

            return `
          <div class="figpal-action-card">
            <div class="action-title">${title.trim()}</div>
            <div class="action-desc">${desc.trim().replace(/\n/g, '<br>')}</div>
            <div class="action-buttons">${buttonHtml}</div>
          </div>
        `;
        });

        // 3. Quick Action Pills: ((Label:Event))
        html = html.replace(/\(\(([^)]+?):([^)]+)\)\)/g, (match, label, event) => {
            return `<button class="figpal-pill" data-event="${event.trim()}">${label.trim()}</button>`;
        });

        // 3. Standard Markdown
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/(<br>){3,}/g, '<br><br>');

        return html;
    }

    // ─── Bind Action Buttons ─────────────────────────────────────────────
    function bindActions(container) {
        if (!container) return;

        // 1. Action Card Buttons
        container.querySelectorAll('.figpal-action-btn').forEach(btn => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = "true";
            btn.addEventListener('click', (e) => handleActionEvent(e));
        });

        // 2. Quick Action Pills
        container.querySelectorAll('.figpal-pill').forEach(pill => {
            if (pill.dataset.bound) return;
            pill.dataset.bound = "true";
            pill.addEventListener('click', (e) => {
                const text = (e.target.dataset.event || e.target.textContent).trim();
                FP.emit('user-message', { text });
                e.target.classList.add('figpal-pill-selected');
            });
        });
    }

    async function handleActionEvent(e) {
        const eventName = (e.target.dataset.event || "").trim();
        console.log('FigPal Actions: Logic Start for', eventName);

        e.target.disabled = true;
        e.target.textContent = 'Executing...';

        // ─── Native Execution Logic ───
        const isFix = eventName.startsWith('FIX:');
        const cleanEvent = isFix ? eventName.substring(4) : eventName;

        if (isFix) {
            console.log('FigPal Actions: Routing to NATIVE', cleanEvent);

            // Priority 2: Native Node Updates (RENAME/CONTENT/FILL)
            const [type, data] = cleanEvent.split('|');

            // Priority 1: Check commands.js (for things like LAUNCH_BRIDGE or AUDIT or LEARN)
            // Re-construct the command key to see if it exists (e.g. "FIX:LEARN")
            const cmdKey = `FIX:${type}`;
            if (FP.commands && FP.commands.tryHandle(cmdKey, data)) {
                e.target.textContent = 'Triggered 🚀';
                e.target.style.background = '#22C55E';
                e.target.style.color = 'white';
                return;
            }

            const nodeId = FP.state.selectedNodeId;

            if (nodeId && FP.pluginBridge?.isConnected) {
                let updates = {};
                if (type === 'RENAME') updates.name = data;
                if (type === 'CONTENT') updates.characters = data;
                if (type === 'FILL') {
                    const fills = hexToFills(data);
                    if (fills) updates.fills = fills;
                }

                if (updates.name || updates.characters || updates.fills) {
                    try {
                        const result = await FP.pluginBridge.updateNode(nodeId, updates);
                        if (result?.success) {
                            e.target.textContent = 'Applied ✅';
                            e.target.style.background = '#22C55E';
                            e.target.style.color = 'white';
                            return;
                        } else {
                            e.target.textContent = 'Failed';
                            e.target.style.background = '#EF4444';
                            e.target.style.color = 'white';
                            return;
                        }
                    } catch (err) {
                        console.error('Action Error:', err);
                        e.target.textContent = 'Error';
                        e.target.style.background = '#EF4444';
                        e.target.style.color = 'white';
                        return;
                    }
                }
            } else if (type === 'RENAME' || type === 'CONTENT' || type === 'FILL') {
                // If it's a native fix but we are missing context/bridge
                e.target.textContent = 'No Context';
                e.target.style.background = '#F97316';
                e.target.style.color = 'white';
                return;
            }
        }

        // Default fallback
        e.target.textContent = 'Sent';
        e.target.style.opacity = '0.7';
        FP.emit('user-message', {
            text: `[Action Confirmed: ${eventName}]`,
            specificResponse: `Action ${eventName} confirmed.`
        });
    }

    // --- Helpers ---
    function hexToFills(hex) {
        if (!hex) return null;
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        if (cleanHex.length !== 6) return null;

        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

        return [{
            type: 'SOLID',
            color: { r, g, b }
        }];
    }

    // ─── Message Renderer ────────────────────────────────────────────────
    function addMessage(text, sender, isThinking = false, isHtml = false) {
        const chatBubble = FP.state.elements.chatBubble;
        if (!chatBubble) return { row: null, msgDiv: null, avatar: null };

        const contentArea = chatBubble.querySelector('.figpal-chat-content');
        const row = document.createElement('div');
        row.classList.add('figpal-message-row', sender);

        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.className = 'figpal-avatar bot-avatar';

            // Use layered rendering
            if (FP.sprite?.assemble) {
                avatar.innerHTML = FP.sprite.assemble(FP.state.activePal || {});
            }

            row.appendChild(avatar);
        }

        const msgDiv = document.createElement('div');
        msgDiv.classList.add('figpal-message', sender);
        if (isThinking) msgDiv.classList.add('thinking');

        if (sender === 'bot' && !isThinking && !isHtml) {
            // Organic Typing Effect
            typeText(msgDiv, text, () => {
                bindActions(msgDiv);
                processDynamicContent(msgDiv);
            });
        } else if (isHtml) {
            msgDiv.innerHTML = text;
            if (sender === 'bot') processDynamicContent(msgDiv);
        } else {
            msgDiv.textContent = text;
        }

        row.appendChild(msgDiv);
        contentArea.appendChild(row);
        contentArea.scrollTop = contentArea.scrollHeight;
        return { row, msgDiv, avatar: row.querySelector('.figpal-avatar') };
    }

    // ─── Dynamic Content Processor ───
    async function processDynamicContent(container) {
        if (!container) return;

        // Find all {{IMAGE:id}} patterns in text nodes
        // Since we already set innerHTML, they are text.
        // We need to replace them with placeholder elements first.

        // Strategy: Regex replace on innerHTML (risky but effective for this specific pattern)
        // Only target {{IMAGE:...}} that isn't already inside a tag
        const html = container.innerHTML;
        const imageRegex = /\{\{IMAGE:([^}]+)\}\}/g;

        if (!imageRegex.test(html)) return;

        // Replace with placeholders
        container.innerHTML = html.replace(imageRegex, (match, nodeId) => {
            return `<div class="figpal-image-loader" data-node-id="${nodeId.trim()}" style="
                width: 100%; height: 100px; 
                background: rgba(255,255,255,0.05); 
                border-radius: 8px; 
                display: flex; align-items: center; justify-content: center;
                margin: 8px 0; font-size: 12px; color: #888;">
                Loading Image...
            </div>`;
        });

        // Re-bind actions (since we nuked innerHTML)
        bindActions(container);

        // Now fetch images
        const loaders = container.querySelectorAll('.figpal-image-loader');
        for (const loader of loaders) {
            const nodeId = loader.dataset.nodeId;
            if (!nodeId) continue;

            if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                try {
                    const result = await FP.pluginBridge.request('show-media', { nodeId });
                    if (result?.success && result.image) {
                        const img = document.createElement('img');
                        img.src = result.image;
                        img.style.maxWidth = '100%';
                        img.style.borderRadius = '8px';
                        img.style.marginTop = '8px';
                        img.style.border = '1px solid rgba(255,255,255,0.1)';
                        img.alt = result.name || 'Figma Image';

                        // Swap loader
                        loader.replaceWith(img);

                        // Scroll to bottom just in case
                        const contentArea = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
                        if (contentArea) contentArea.scrollTop = contentArea.scrollHeight;
                    } else {
                        loader.textContent = '❌ Image not found';
                    }
                } catch (e) {
                    loader.textContent = '❌ Error loading image';
                }
            } else {
                loader.textContent = '🔌 Connect Bridge to view';
            }
        }
    }

    // ─── Typing Effect ───
    function typeText(container, text, onComplete) {
        // Calculate dynamic speed
        // Short (0-50 chars) -> Slow (30-50ms)
        // Medium (50-200) -> Medium (15-25ms)
        // Long (200+) -> Fast (5-10ms)
        const length = text.length;
        let delay = 20;
        if (length < 50) delay = 40;
        else if (length > 200) delay = 8;
        else if (length > 500) delay = 4;

        let index = 0;
        // Optimization: Type by words for smoother markdown rendering, or small chunks
        // Typing strictly by char can break MD syntax like ** temporarily causing flash
        // Taking a hybrid approach: fast char typing

        function type() {
            if (index < length) {
                // Add a random variance to make it "organic" (+- 5ms)
                const variance = Math.random() * 10 - 5;

                // Grab next chunk (1-3 chars to speed up execution loop)
                const chunkJson = Math.min(length - index, 3);
                index += chunkJson;

                const currentStr = text.substring(0, index);
                const html = parseMarkdown(currentStr + (index < length ? '▍' : '')); // Cursor effect
                container.innerHTML = html;

                // Auto-scroll while typing
                const contentArea = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
                if (contentArea) contentArea.scrollTop = contentArea.scrollHeight;

                setTimeout(type, Math.max(2, delay + variance));
            } else {
                // Final render without cursor
                container.innerHTML = parseMarkdown(text);
                if (onComplete) onComplete();
            }
        }
        type();
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.chat = FP.chat || {};
    FP.chat.parseMarkdown = parseMarkdown;
    FP.chat.addMessage = addMessage;
    FP.chat.bindActions = bindActions;
    FP.chat.ICONS = ICONS;
})();
