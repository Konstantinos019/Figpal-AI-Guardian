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
            const content = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
            if (content) content.innerHTML = '';
            FP.chat.addMessage('🧹 Chat history cleared.', 'bot');
        },

        '/check': function () {
            const status = [];
            status.push(`**Provider:** ${FP.state.provider}`);
            status.push(`**Model:** ${FP.state.selectedModel || 'default'}`);
            status.push(`**API Key:** ${FP.state.apiKey ? '✅ Set' : '❌ Not set'}`);
            status.push(`**File Key:** ${FP.state.fileKey || 'none'}`);
            status.push(`**Selected Node:** ${FP.state.selectedNodeId || 'none'}`);
            status.push(`**Chat History:** ${FP.state.chatHistory.length} messages`);
            status.push(`**Plugin Connected:** ${FP.pluginBridge?.isConnected() ? '✅' : '❌'}`);
            FP.chat.addMessage('🔍 **System Status**\n\n' + status.join('\n'), 'bot');
        },

        '/help': function () {
            FP.chat.addMessage(
                '📖 **Available Commands**\n\n' +
                '- `/check` — Show system status\n' +
                '- `/clear` — Clear chat history\n' +
                '- `/reset` — Reset all settings\n' +
                '- `/help` — Show this help',
                'bot'
            );
        },
    };

    /**
     * Try to handle input as a slash command.
     * @param {string} text - User input
     * @returns {boolean} true if it was a command (skip AI)
     */
    function tryHandle(text) {
        const cmd = text.trim().toLowerCase();
        if (COMMANDS[cmd]) {
            COMMANDS[cmd]();
            return true;
        }
        return false;
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.commands = { tryHandle };
})();
