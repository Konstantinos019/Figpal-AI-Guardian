// modules/chat/commands.js
// Slash command handlers: /reset, /clear, /check.
// Returns true if input was a command (so flow.js skips AI).
// Exports: FigPal.commands = { tryHandle }
(function () {
    'use strict';

    const FP = window.FigPal;

    const COMMANDS = {
        '/reset': function () {
            FP.chat.addMessage('🔄 Resetting all settings...', 'bot');
            chrome.storage.local.clear(() => {
                setTimeout(() => location.reload(), 500);
            });
        },

        '/clear': function () {
            FP.state.chatHistory = [];
            FP.state.skills = [];
            const content = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
            if (content) content.innerHTML = '';
            FP.chat.addMessage('🧹 Chat history cleared.', 'bot');
        },

        '/check': function () {
            const isPlugin = (FP.pluginBridge && FP.pluginBridge.isConnected);
            FP.chat.addMessage(`**Diagnosis:**\n- Provider: ${FP.state.provider}\n- Model: ${FP.state.selectedModel || 'Default'}\n- Bridge: ${isPlugin ? 'Connected ✅' : 'Disconnected ❌'}\n- Context: ${FP.state.selectedNodeId ? 'Node selected' : 'No selection'}`, 'bot');
        },

        '/connect': function () {
            FP.setup.showSetupPrompt();
        },

        '/plugin': function () {
            FP.chat.addMessage('🔌 **Bridge Instructions**\n\n1. Open Figma\n2. Run "FigPal Bridge" plugin\n3. Selection will sync automatically!', 'bot');
        },

        '/audit': function () {
            // Trigger audit via flow
            FP.emit('user-message', { text: 'Audit this selection for Design System compliance.' });
        },

        'FIX:AUDIT': function () {
            // Trigger audit via button
            FP.emit('user-message', { text: 'Audit this selection for Design System compliance.' });
        },
        'AUDIT': function () {
            // Alias for button events
            FP.emit('user-message', { text: 'Audit this selection for Design System compliance.' });
        },

        'FIX:LAUNCH_BRIDGE': function () {
            // Trigger plugin automation
            if (FP.figma.launchPlugin) {
                FP.figma.launchPlugin();
            } else {
                FP.chat.addMessage('❌ Automation module not loaded.', 'bot');
            }
        },
        'LAUNCH_BRIDGE': function () {
            // Alias for button events
            if (FP.figma.launchPlugin) {
                FP.figma.launchPlugin();
            } else {
                FP.chat.addMessage('❌ Automation module not loaded.', 'bot');
            }
        },

        '/learn': function () {
            // This is a catch-all to explain how to use it
            FP.chat.addMessage('📘 **Knowledge Training**\n\nTo teach me something, type: `/learn [your documentation here]`\n\n*Example:* `/learn Buttons must always have a 4px corner radius.`', 'bot');
        },

        '/capture': function () {
            const selection = FP.state.pluginSelection || [];
            const textNode = selection.find(n => n.type === 'TEXT');

            if (textNode) {
                FP.state.memory = {
                    text: textNode.characters,
                    sourceId: textNode.id,
                    sourceName: textNode.name
                };
                FP.chat.addMessage(`🧠 **Captured!** I've remembered this text: \n\n*"${textNode.characters.substring(0, 100)}..."*\n\nMove to where you want the note and say "Place it"!`, 'bot');
            } else if (selection.length > 0) {
                FP.state.memory = {
                    text: `Audit of ${selection[0].name}`,
                    sourceId: selection[0].id
                };
                FP.chat.addMessage(`🧠 **Context Saved.** I'm remembering [${selection[0].type}:${selection[0].name}].`, 'bot');
            } else {
                FP.chat.addMessage('⚠️ Select something first to capture it!', 'bot');
            }
        },

        'FIX:PLACE_NOTE': async function () {
            if (!FP.state.memory) {
                FP.chat.addMessage('⚠️ Nothing in memory! Select a node and use `/capture` first.', 'bot');
                return;
            }

            if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                const result = await FP.pluginBridge.request('create-annotation', {
                    text: FP.state.memory.text,
                    title: `From: ${FP.state.memory.sourceName || 'Audit'}`
                });

                if (result?.success) {
                    FP.chat.addMessage('✨ **Annotation Placed!** Anything else?', 'bot');
                } else {
                    FP.chat.addMessage('❌ Failed to place note.', 'bot');
                }
            } else {
                FP.chat.addMessage('🔌 Bridge disconnected.', 'bot');
            }
        },

        '/export': function () {
            const data = JSON.stringify(FP.state.skills || [], null, 2);
            FP.chat.addMessage(`💾 **Exporting Skills**\n\nCopy this JSON to backup or move to another PC:\n\n\`\`\`json\n${data}\n\`\`\``, 'bot');
        },

        '/import': function () {
            FP.chat.addMessage('📥 **Importing Skills**\n\nType: `/import [JSON_ARRAY]`\n\n*Example:* `/import ["Rule 1", "Rule 2"]`', 'bot');
        },

        'y': function () {
            // Find the last message with buttons/pills and click the first one
            const content = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
            if (!content) return;

            const lastBotMsg = Array.from(content.querySelectorAll('.figpal-message.bot')).pop();
            if (lastBotMsg) {
                const firstAction = lastBotMsg.querySelector('.figpal-action-btn, .figpal-pill');
                if (firstAction && !firstAction.disabled) {
                    firstAction.click();
                } else if (!firstAction) {
                    FP.chat.addMessage('Nothing to confirm right now! ✨', 'bot');
                }
            }
        },

        '/help': function () {
            FP.chat.addMessage(' Partner Commands 🚀\n\n- `y` : Auto-confirm last suggestion\n- `/learn [text]` : Teach me logic\n- `/audit` : Quick check\n- `/clear` : Clear chat\n- `/reset` : Full reload', 'bot');
        },
    };

    /**
     * Try to handle input as a slash command.
     * @param {string} text - User input
     * @returns {boolean} true if it was a command (skip AI)
     */
    function tryHandle(text) {
        if (!text) return false;
        const input = text.trim();
        const lower = input.toLowerCase();

        // 1. Handle binary 'y' confirm
        if (lower === 'y') {
            COMMANDS['y']();
            return true;
        }

        // 2. Handle commands with parameters
        if (lower.startsWith('/learn ')) {
            const skill = input.substring(7).trim();
            if (skill) {
                FP.state.skills = FP.state.skills || [];
                FP.state.skills.push(skill);
                chrome.storage.sync.set({ skills: FP.state.skills }, () => {
                    if (chrome.runtime.lastError) {
                        chrome.storage.local.set({ skills: FP.state.skills });
                    }
                });
                FP.chat.addMessage(`🧠 **Skill Learned!**\n\nI will now remember this across all your devices:\n\n*"${skill}"*`, 'bot');
            } else {
                COMMANDS['/learn']();
            }
            return true;
        }

        if (lower.startsWith('/import ')) {
            const jsonStr = input.substring(8).trim();
            try {
                const imported = JSON.parse(jsonStr);
                if (Array.isArray(imported)) {
                    FP.state.skills = imported;
                    chrome.storage.sync.set({ skills: imported });
                    FP.chat.addMessage(`✅ **Success!** Imported and synced **${imported.length}** skills.`, 'bot');
                } else {
                    FP.chat.addMessage('❌ **Error:** Input must be a JSON array of strings.', 'bot');
                }
            } catch (e) {
                FP.chat.addMessage('❌ **Error:** Invalid JSON.', 'bot');
            }
            return true;
        }

        // 2. Handle simple commands
        if (COMMANDS[lower]) {
            COMMANDS[lower]();
            return true;
        }

        // 3. Handle action confirm passthroughs (buttons)
        if (lower.startsWith('fix:')) {
            // If it's a FIX:AUDIT or similar that matches a command
            const cmd = Object.keys(COMMANDS).find(k => k.toLowerCase() === lower);
            if (cmd) {
                COMMANDS[cmd]();
                return true;
            }
        }

        return false;
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.commands = { tryHandle };
})();
