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

        '/quota': function () {
            if (FP.ai.tracker) {
                FP.chat.addMessage(FP.ai.tracker.formatUsageMarkdown('Gemini Quota Tracker'), 'bot');
            } else {
                FP.chat.addMessage('⏳ Tracker initializing... try again in a moment.', 'bot');
            }
        },

        '/connect': async function (arg) {
            // Two modes: /connect agent OR /connect codebase
            if (arg && /agent|key|api/i.test(arg)) {
                // Connect Agent (API Key Setup)
                FP.setup.showSetupPrompt();
                return;
            }

            if (arg && /codebase|code|vfs/i.test(arg)) {
                // Connect Codebase (VFS)
                const result = await FP.vfs.pickFolder();
                if (result.success) {
                    FP.chat.addMessage(`🔗 **Connected!**\n\nI've loaded your codebase: \`${result.name}\`.\nI can now read your files directly!`, 'bot');
                } else {
                    FP.chat.addMessage(`❌ **Connection Failed**\n${result.error || 'Pick cancelled.'}`, 'bot');
                }
                return;
            }

            // No argument or unrecognized - show usage
            FP.chat.addMessage(`🔗 **Connect**\n\nUsage:\n• \`/connect agent\` - Setup your AI provider (Gemini, OpenAI, etc.)\n• \`/connect codebase\` - Link local project files for AI to read`, 'bot');
        },

        '/plugin': function () {
            FP.chat.addMessage('🔌 **Bridge Instructions**\n\n1. Open Figma\n2. Run "FigPal Bridge" plugin\n3. Selection will sync automatically!', 'bot');
        },

        '/agent': function () {
            // Alias for /connect agent
            FP.setup.showSetupPrompt();
        },

        '/vfs': async function () {
            // Show VFS connection status
            if (FP.vfs && FP.vfs.isConnected && FP.vfs.isConnected()) {
                const status = FP.vfs.getStatus ? FP.vfs.getStatus() : { name: 'Connected', fileCount: 'Unknown' };
                FP.chat.addMessage(`📁 **VFS Connected**\n\nCodebase: \`${status.name}\`\nFiles: ${status.fileCount || 'Unknown'}\n\nUse \`/open\` to read files!`, 'bot');
            } else {
                FP.chat.addMessage('📁 **VFS Not Connected**\n\nUse \`/connect codebase\` to link your project files.', 'bot');
            }
        },

        '/open': async function (arg) {
            // Open file picker to read local file
            if (!arg) {
                if (FP.vfs && FP.vfs.pickFile) {
                    const result = await FP.vfs.pickFile();
                    if (result.success) {
                        FP.chat.addMessage(`📄 **File Content**\n\nFile: \`${result.name}\`\n\n\`\`\`\n${result.content}\n\`\`\``, 'bot');
                    } else {
                        FP.chat.addMessage(`❌ **Failed to Read File**\n${result.error || 'Pick cancelled.'}`, 'bot');
                    }
                } else {
                    FP.chat.addMessage('⚠️ **VFS Not Available**\n\nConnect your codebase first with \`/connect codebase\`.', 'bot');
                }
            } else {
                // If arg provided, try to read that specific file path
                FP.chat.addMessage('📄 **File Path Reading**\n\nDirect path reading coming soon! For now, use \`/open\` without arguments to pick a file.', 'bot');
            }
        },

        '/console': async function () {
            // Show plugin console logs
            if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                const logs = await FP.pluginBridge.request('get-console-logs');
                if (logs && logs.length > 0) {
                    const formatted = logs.map(l => `[${l.level}] ${l.message}`).join('\n');
                    FP.chat.addMessage(`🖥️ **Plugin Console**\n\n\`\`\`\n${formatted}\n\`\`\``, 'bot');
                } else {
                    FP.chat.addMessage('🖥️ **Plugin Console**\n\nNo logs available.', 'bot');
                }
            } else {
                FP.chat.addMessage('🔌 **Plugin Disconnected**\n\nConnect the Bridge to view console logs.', 'bot');
            }
        },

        '/workflow': async function (arg) {
            if (!FP.workflows) {
                FP.chat.addMessage('⚠️ **Workflow Engine Not Loaded**\n\nThe workflow system is initializing...', 'bot');
                return;
            }

            const parts = arg ? arg.trim().split(/\s+/) : [];
            const subcommand = parts[0]?.toLowerCase();
            const rest = parts.slice(1).join(' ');

            if (!subcommand || subcommand === 'list') {
                // List all workflows
                const workflows = await FP.workflows.list();
                if (workflows.length === 0) {
                    FP.chat.addMessage('📋 **No Workflows**\n\nCreate one with `/workflow create`', 'bot');
                } else {
                    const list = workflows.map(w => `• **${w.name}** - ${w.description || 'No description'}`).join('\n');
                    FP.chat.addMessage(`📋 **Available Workflows**\n\n${list}\n\nRun with \`/workflow run [name]\``, 'bot');
                }
            } else if (subcommand === 'run') {
                // Execute a workflow
                const name = rest.trim();
                if (!name) {
                    FP.chat.addMessage('❌ **Usage:** `/workflow run [name]`', 'bot');
                    return;
                }

                const workflow = await FP.workflows.getByName(name);
                if (!workflow) {
                    FP.chat.addMessage(`❌ **Workflow Not Found:** "${name}"`, 'bot');
                    return;
                }

                await FP.workflows.execute(workflow);
            } else if (subcommand === 'create') {
                // Create new workflow - delegate to AI
                FP.chat.addMessage('🔧 **Creating Workflow**\n\nDescribe the workflow you want to create, and I\'ll help you build it!', 'bot');
                FP.emit('user-message', { text: 'Help me create a new workflow. Ask me what steps it should include.' });
            } else if (subcommand === 'delete') {
                const name = rest.trim();
                if (!name) {
                    FP.chat.addMessage('❌ **Usage:** `/workflow delete [name]`', 'bot');
                    return;
                }

                const workflow = await FP.workflows.getByName(name);
                if (workflow) {
                    await FP.workflows.delete(workflow.id);
                    FP.chat.addMessage(`✅ **Deleted:** "${name}"`, 'bot');
                } else {
                    FP.chat.addMessage(`❌ **Not Found:** "${name}"`, 'bot');
                }
            } else {
                FP.chat.addMessage('📋 **Workflow Commands**\n\n• `/workflow list` - Show all workflows\n• `/workflow run [name]` - Execute a workflow\n• `/workflow create` - Create new workflow\n• `/workflow delete [name]` - Remove workflow', 'bot');
            }
        },

        '/skill': async function (arg) {
            if (!FP.skills) {
                FP.chat.addMessage('⚠️ **Skill Engine Not Loaded**\n\nThe skill system is initializing...', 'bot');
                return;
            }

            const parts = arg ? arg.trim().split(/\s+/) : [];
            const subcommand = parts[0]?.toLowerCase();
            const rest = parts.slice(1).join(' ');

            if (!subcommand || subcommand === 'list') {
                // List all skills
                const skills = await FP.skills.list();
                if (skills.length === 0) {
                    FP.chat.addMessage('🧠 **No Skills**\n\nCreate one with `/skill create`', 'bot');
                } else {
                    const list = skills.map(s => `• **${s.name}** (${s.type}) - ${s.description || 'No description'}`).join('\n');
                    FP.chat.addMessage(`🧠 **Available Skills**\n\n${list}\n\nRun with \`/skill run [name]\``, 'bot');
                }
            } else if (subcommand === 'run') {
                // Execute a skill
                const name = rest.trim();
                if (!name) {
                    FP.chat.addMessage('❌ **Usage:** `/skill run [name]`', 'bot');
                    return;
                }

                const skills = await FP.skills.list();
                const skill = skills.find(s => s.name.toLowerCase() === name.toLowerCase());
                if (!skill) {
                    FP.chat.addMessage(`❌ **Skill Not Found:** "${name}"`, 'bot');
                    return;
                }

                const result = await FP.skills.execute(skill);
                if (result.success) {
                    FP.chat.addMessage(`✅ **Skill Executed:** "${name}"`, 'bot');
                } else {
                    FP.chat.addMessage(`❌ **Execution Failed:** ${result.error}`, 'bot');
                }
            } else if (subcommand === 'create') {
                // Create new skill - delegate to AI
                FP.chat.addMessage('🧠 **Creating Skill**\n\nDescribe the skill you want to create, and I\'ll help you build it!', 'bot');
                FP.emit('user-message', { text: 'Help me create a new skill. Ask me what it should do.' });
            } else if (subcommand === 'delete') {
                const name = rest.trim();
                if (!name) {
                    FP.chat.addMessage('❌ **Usage:** `/skill delete [name]`', 'bot');
                    return;
                }

                const skills = await FP.skills.list();
                const skill = skills.find(s => s.name.toLowerCase() === name.toLowerCase());
                if (skill) {
                    await FP.skills.delete(skill.id);
                    FP.chat.addMessage(`✅ **Deleted:** "${name}"`, 'bot');
                } else {
                    FP.chat.addMessage(`❌ **Not Found:** "${name}"`, 'bot');
                }
            } else {
                FP.chat.addMessage('🧠 **Skill Commands**\n\n• `/skill list` - Show all skills\n• `/skill run [name]` - Execute a skill\n• `/skill create` - Create new skill\n• `/skill delete [name]` - Remove skill', 'bot');
            }
        },

        '/commands': function () {
            // Alias for /help
            COMMANDS['/help']();
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
            // Action: Show instructions for manual connection
            FP.chat.addMessage('🔌 **Connect Bridge**\n\nI cannot open plugins directly (Figma security).\n\n**To Connect:**\n1. Press `Cmd + /` in Figma\n2. Type `FigPal Bridge`\n3. Press Enter\n\nI will auto-connect instantly! ⚡', 'bot');
        },

        'LAUNCH_BRIDGE': function () {
            // Alias for button events
            FP.commands['FIX:LAUNCH_BRIDGE']();
        },

        'FIX:LEARN': function (arg) {
            // Triggered by button: [Save Skill:FIX:LEARN|The Rule Text]
            if (!arg) return;

            // Re-use the existing logic by simulating /learn
            const skill = arg.trim();
            if (skill) {
                FP.state.skills = FP.state.skills || [];
                if (!FP.state.skills.includes(skill)) {
                    FP.state.skills.push(skill);
                    chrome.storage.sync.set({ skills: FP.state.skills });
                    FP.chat.addMessage(`🧠 **Skill Saved!**\n\nI've added this to my brain:\n*"${skill}"*`, 'bot');
                } else {
                    FP.chat.addMessage(`🧠 **I Know That!**\n\nThat skill is already in my memory.`, 'bot');
                }
            }
        },

        'FIX:PLACE': function (arg) {
            // Triggered by button: [Place Template:FIX:PLACE|{nodeId}]
            if (!arg) return;
            const nodeId = arg.trim();

            if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                FP.pluginBridge.send('instantiate-component', { nodeId });
            } else {
                FP.chat.addMessage('🔌 **Plugin Disconnected**\n\nI need the FigPal Bridge to place components.', 'bot');
            }
        },

        'FIX:SHOW_MEDIA': async function (arg) {
            // Triggered by button: [Show Image:FIX:SHOW_MEDIA|{nodeId}]
            if (!arg) return;
            const nodeId = arg.trim();

            if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                FP.chat.addMessage(`🖼️ **Retrieving Media...**`, 'bot');
                const result = await FP.pluginBridge.request('show-media', { nodeId });

                if (result?.success && result.image) {
                    // Display the image in chat
                    const imgHtml = `<img src="${result.image}" style="max-width:100%; border-radius:8px; margin-top:8px; border:1px solid rgba(255,255,255,0.1);">`;
                    FP.chat.addMessage(`**Media: ${result.name}**<br>${imgHtml}`, 'bot');
                } else {
                    FP.chat.addMessage('❌ Failed to retrieve media. It might be too large or deleted.', 'bot');
                }
            } else {
                FP.chat.addMessage('🔌 **Plugin Disconnected**\n\nI need the Bridge to see images.', 'bot');
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
            FP.chat.addMessage(
                '💡 **Partner Commands** 🚀\n\n' +
                '**Quick Actions:**\n' +
                '- `y` - Auto-confirm last suggestion\n' +
                '- `/audit` - Quick design system check\n' +
                '- `/capture` - Remember selection or text\n\n' +
                '**Learning:**\n' +
                '- `/learn [text]` - Teach me a rule\n' +
                '- `/export` - Backup your skills\n' +
                '- `/import [json]` - Restore skills\n\n' +
                '**System:**\n' +
                '- `/check` - System diagnosis\n' +
                '- `/quota` - Usage tracking\n' +
                '- `/connect agent` - Setup AI provider\n' +
                '- `/connect codebase` - Link local files\n' +
                '- `/plugin` - Bridge instructions\n' +
                '- `/clear` - Clear chat history\n' +
                '- `/reset` - Full reload',
                'bot'
            );
        },

        '/monitor': function (arg) {
            const action = arg ? arg.trim().toLowerCase() : 'status';

            if (!FP.monitor) {
                FP.chat.addMessage('⚠️ Monitor engine not loaded.', 'error');
                return;
            }

            switch (action) {
                case 'start':
                    FP.monitor.start();
                    break;
                case 'stop':
                    FP.monitor.stop();
                    break;
                case 'status':
                    const s = FP.monitor.status();
                    FP.chat.addMessage(
                        `👁️ **Monitor Status**\n` +
                        `- Active: ${s.isRunning ? '✅' : '❌'}\n` +
                        `- Baseline Nodes: ${s.baselineNodes}\n` +
                        `- Last Check: ${s.lastCheck ? new Date(s.lastCheck).toLocaleTimeString() : 'Never'}`,
                        'bot'
                    );
                    break;
                default:
                    FP.chat.addMessage('Usage: /monitor <start|stop|status>', 'error');
            }
        },

        '/search': function (arg) {
            if (FP.search) {
                FP.search.search(arg);
            } else {
                FP.chat.addMessage('⚠️ Search engine not loaded.', 'error');
            }
        },

        '/docs': function (arg) {
            if (FP.search) {
                FP.search.docs(arg);
            } else {
                FP.chat.addMessage('⚠️ Search engine not loaded.', 'error');
            }
        },
    };

    /**
     * Try to handle input as a slash command.
     * @param {string} text - User input or command key
     * @param {string} [arg] - Optional argument for the command
     * @returns {boolean} true if it was a command (skip AI)
     */
    function tryHandle(text, arg) {
        if (!text) return false;
        const input = text.trim();
        const lower = input.toLowerCase();

        // Parse command and argument if not already separated
        let command = input;
        let commandArg = arg;

        // If arg is not provided, try to parse it from the input
        if (!commandArg && input.includes(' ')) {
            const parts = input.split(' ');
            command = parts[0];
            commandArg = parts.slice(1).join(' ');
        }

        const commandLower = command.toLowerCase();

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
                if (!FP.state.skills.includes(skill)) {
                    FP.state.skills.push(skill);
                    chrome.storage.sync.set({ skills: FP.state.skills });
                    FP.chat.addMessage(`🧠 **Skill Saved!**\n\nI've added this to my brain:\n*"${skill}"*`, 'bot');
                } else {
                    FP.chat.addMessage(`🧠 **I Know That!**\n\nThat skill is already in my memory.`, 'bot');
                }
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

        // 3. Handle standard commands (with or without arguments)
        if (COMMANDS[commandLower]) {
            COMMANDS[commandLower](commandArg);
            return true;
        }

        // 4. Handle action confirm passthroughs (buttons)
        // Check for direct match first (case-insensitive) in COMMANDS
        const directCmd = Object.keys(COMMANDS).find(k => k.toLowerCase() === lower);
        if (directCmd) {
            COMMANDS[directCmd](arg); // Pass arg if present
            return true;
        }

        if (lower.startsWith('fix:')) {
            // Fallback: If it's a FIX:AUDIT that wasn't caught above
            const cmd = Object.keys(COMMANDS).find(k => k.toLowerCase() === lower);
            if (cmd) {
                COMMANDS[cmd](arg);
                return true;
            }
        }

        return false;
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.commands = { tryHandle };
})();
