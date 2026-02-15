// modules/chat/flow.js
// Chat flow orchestrator: user msg → commands → context → AI → render.
// Listens: 'user-message' event
// Exports: FigPal.flow = { handleUserMessage }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Handle User Message ─────────────────────────────────────────────
    async function handleUserMessage(text, specificResponse) {
        // 0. Handle command creation definition phase
        if (FP.state.awaitingCommandDef) {
            const cmdName = FP.state.awaitingCommandDef;
            FP.commands.tryHandle(`FIX:SAVE_CUSTOM_CMD|${cmdName}`, text);
            return;
        }

        // 1. Try slash commands first
        if (FP.commands.tryHandle(text)) return;

        // 🛡️ Slash Shield: Block unknown commands from reaching AI
        if (text.startsWith('/')) {
            const cmd = text.split(' ')[0];
            FP.chat.addMessage(`⚠️ **Unknown Command:** \`${cmd}\`\n\nWould you like to create this command? If so, tell me what it should do!\n\n[[Action:Create]] [Create ${cmd}:FIX:START_CREATE_CMD|${cmd}]`, 'bot');
            return;
        }

        // 2. Add user message to chat
        FP.chat.addMessage(text, 'user');
        FP.state.chatHistory.push({ role: 'user', text: text });

        // 3. Show thinking indicator
        FP.emit('ai-thinking', true);
        const { msgDiv, avatar } = FP.chat.addMessage('Thinking...', 'bot', true);

        try {
            // 4. Get Figma context (Plugin Proactive → Plugin Request → REST Fallback)
            let context = null;
            let isConnected = !!(FP.pluginBridge && FP.pluginBridge.isConnected);
            console.log('FigPal Flow: Starting context acquisition cycle... (Connected:', isConnected, ')');

            if (isConnected) {
                try {
                    console.log('FigPal Flow: Requesting fresh selection fetch from Bridge...');
                    context = await FP.pluginBridge.getSelection();
                    if (context && context.length > 0) {
                        FP.state.selectedNodeId = context[0].id;
                        console.log('FigPal Flow: Syncing selectedNodeId from fresh Bridge fetch:', FP.state.selectedNodeId);
                    }
                    console.log('FigPal Flow: Fresh fetch successful ✅');
                } catch (e) {
                    console.warn('FigPal Flow: Plugin bridge fresh fetch failed, falling back to cache...', e);
                    // Fallback to cache if request fails
                    if (FP.state.pluginSelection && FP.state.pluginSelection.length > 0) {
                        context = FP.state.pluginSelection;
                    }
                }
            } else {
                console.log('FigPal Flow: Plugin Bridge not connected ⚠️');
            }

            // Priority 3: REST API fallback if no plugin connection or plugin failed
            if (!context && FP.state.fileKey && FP.state.selectedNodeId) {
                console.log('FigPal Flow: Attempting REST API fallback for node:', FP.state.selectedNodeId);
                const pat = await new Promise((resolve) =>
                    chrome.storage.local.get(['figmaPat'], (r) => resolve(r.figmaPat))
                );
                if (pat) {
                    const node = await FP.figma.fetchNode(FP.state.fileKey, FP.state.selectedNodeId, pat);
                    if (node?.document) {
                        context = FP.figma.simplify(node.document);
                        if (context && context.id) {
                            FP.state.selectedNodeId = context.id;
                            console.log('FigPal Flow: Syncing selectedNodeId from REST fallback:', context.id);
                        }
                        console.log('FigPal Flow: REST Fallback successful ✅');
                    }
                } else {
                    console.log('FigPal Flow: No Figma PAT for REST fallback.');
                }
            }

            // ⚠️ If all context sources failed, interrupt and ask nicely
            if (!context && isConnected) {
                // Plugin is "connected" but returned nothing? Weird, but okay.
                console.warn('FigPal Flow: Connected but context empty.');
            } else if (!context && !isConnected && !FP.state.fileKey) {
                // Total failure to see anything
                FP.chat.appendMessage('assistant',
                    `I can't see the canvas! 🙈 \n\nPlease launch the **FigPal Plugin** in Figma so I can see what you're working on.`,
                    [{ label: 'How to Launch? 🚀', action: 'help:launch_plugin' }]
                );
                return; // STOP here.
            }

            // 5. Final check
            if (!context) {
                // If we got here, we are proceeding with empty context (e.g. general questions)
                // But if isConnected was true, we likely have a different issue.
                if (isConnected) console.warn('FigPal Flow: Proceeding with empty context despite connection.');
            }

            // 6. Build prompt and call AI (Unified Extension Pathway)
            console.log('FigPal Flow: Building prompt for Extension Brain...');

            let response;
            if (specificResponse) {
                response = specificResponse;
            } else {
                // Unified: Always build a string prompt and send to our internal fetch client
                const prompt = FP.ai.buildPrompt(text, context, FP.state.chatHistory, isConnected);
                response = await FP.ai.sendToAI(prompt);
            }

            // 7. Render response
            if (msgDiv) {
                msgDiv.classList.remove('thinking');
                msgDiv.innerHTML = FP.chat.parseMarkdown(response);

                // Swap avatar back to default
                if (avatar) {
                    avatar.src = FP.state.sprites.default;
                }

                // Bind action buttons in the response correctly
                FP.chat.bindActions(msgDiv);
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
