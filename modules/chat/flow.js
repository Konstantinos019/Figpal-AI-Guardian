// modules/chat/flow.js
// Chat flow orchestrator: user msg → commands → context → AI → render.
// Listens: 'user-message' event
// Exports: FigPal.flow = { handleUserMessage }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Handle User Message ─────────────────────────────────────────────
    async function handleUserMessage(text, specificResponse) {
        // 1. Try slash commands first
        if (FP.commands.tryHandle(text)) return;

        // 2. Add user message to chat
        FP.chat.addMessage(text, 'user');
        FP.state.chatHistory.push({ role: 'user', text: text });

        // 3. Show thinking indicator
        FP.emit('ai-thinking', true);
        const { msgDiv, avatar } = FP.chat.addMessage('Thinking...', 'bot', true);

        try {
            // 4. Get Figma context (plugin-first, REST fallback)
            let context = null;

            if (FP.pluginBridge && FP.pluginBridge.isConnected()) {
                try {
                    context = await FP.pluginBridge.getSelection();
                } catch (e) {
                    console.warn('FigPal Flow: Plugin bridge failed, trying REST API', e);
                }
            }

            // REST API fallback
            if (!context && FP.state.fileKey && FP.state.selectedNodeId) {
                const pat = await new Promise((resolve) =>
                    chrome.storage.local.get(['figmaPat'], (r) => resolve(r.figmaPat))
                );
                if (pat) {
                    const node = await FP.figma.fetchNode(FP.state.fileKey, FP.state.selectedNodeId, pat);
                    if (node?.document) {
                        context = FP.figma.simplify(node.document);
                    }
                }
            }

            // 5. Warn if context is very large
            if (context) {
                const contextSize = JSON.stringify(context).length;
                if (contextSize > 100000) {
                    console.warn(`FigPal Flow: Context is large (${Math.round(contextSize / 1024)}KB)`);
                }
            }

            // 6. Build prompt and call AI
            const prompt = FP.ai.buildPrompt(text, context, FP.state.chatHistory);
            const response = specificResponse || await FP.ai.sendToAI(prompt);

            // 7. Render response
            if (msgDiv) {
                msgDiv.classList.remove('thinking');
                msgDiv.innerHTML = FP.chat.parseMarkdown(response);

                // Swap avatar back to default
                if (avatar) {
                    avatar.src = FP.state.sprites.default;
                }

                // Bind action buttons in the response
                msgDiv.querySelectorAll('.figpal-action-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const eventName = e.target.dataset.event;
                        console.log('Action Clicked:', eventName);
                        e.target.disabled = true;
                        e.target.textContent = 'Sent';
                        e.target.style.opacity = '0.7';
                        handleUserMessage(`[Action Confirmed: ${eventName}]`, `Action ${eventName} confirmed.`);
                    });
                });
            }

            // 8. Save to history
            FP.state.chatHistory.push({ role: 'model', text: response });

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('FigPal Flow: Request aborted');
                if (msgDiv) {
                    msgDiv.classList.remove('thinking');
                    msgDiv.textContent = '(Request cancelled)';
                }
                return;
            }
            console.error('FigPal Flow: Error', err);
            if (msgDiv) {
                msgDiv.classList.remove('thinking');
                msgDiv.textContent = '❌ Error: ' + err.message;
            }
        } finally {
            FP.emit('ai-thinking', false);
        }
    }

    // ─── Listen for events ───────────────────────────────────────────────
    FP.on('user-message', (data) => {
        handleUserMessage(data.text, data.specificResponse);
    });

    // ─── Export ──────────────────────────────────────────────────────────
    FP.flow = { handleUserMessage };
})();
