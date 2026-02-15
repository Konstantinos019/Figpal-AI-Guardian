// modules/chat/commands.js
// Slash command handlers: /reset, /clear, /check.
// Returns true if input was a command (so flow.js skips AI).
// Exports: FigPal.commands = { tryHandle }
(function () {
    'use strict';

    const FP = window.FigPal;

    const COMMANDS = {
        '/reset': function () {
            try {
                FP.chat.addMessage('🔄 Resetting all settings...', 'bot');
                chrome.storage.local.clear(() => {
                    setTimeout(() => location.reload(), 500);
                });
            } catch (err) {
                console.error('Command /reset failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/clear': function () {
            try {
                FP.state.chatHistory = [];
                FP.state.skills = [];
                const content = FP.state.elements.chatBubble?.querySelector('.figpal-chat-content');
                if (content) content.innerHTML = '';
                FP.chat.addMessage('🧹 Chat history cleared.', 'bot');
            } catch (err) {
                console.error('Command /clear failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/check': function () {
            try {
                const isPlugin = (FP.pluginBridge && FP.pluginBridge.isConnected);
                FP.chat.addMessage(`**Diagnosis:**\n- Provider: ${FP.state.provider}\n- Model: ${FP.state.selectedModel || 'Default'}\n- Bridge: ${isPlugin ? 'Connected ✅' : 'Disconnected ❌'}\n- Context: ${FP.state.selectedNodeId ? 'Node selected' : 'No selection'}`, 'bot');
            } catch (err) {
                console.error('Command /check failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/quota': function () {
            try {
                if (FP.ai && FP.ai.tracker) {
                    FP.chat.addMessage(FP.ai.tracker.formatUsageMarkdown('Gemini Quota Tracker'), 'bot');
                } else {
                    FP.chat.addMessage('⏳ Tracker initializing... try again in a moment.', 'bot');
                }
            } catch (err) {
                console.error('Command /quota failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/keys': function () {
            try {
                if (FP.setup && FP.setup.showSetupPrompt) {
                    FP.setup.showSetupPrompt();
                } else {
                    throw new Error('Setup module not loaded.');
                }
            } catch (err) {
                console.error('Command /keys failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/connect': async function (arg) {
            try {
                // Two modes: /connect agent OR /connect codebase
                // Also handle 'keys' as a synonym for agent
                if (arg && /agent|key|api/i.test(arg)) {
                    // Connect Agent (API Key Setup)
                    if (FP.setup && FP.setup.showSetupPrompt) {
                        FP.setup.showSetupPrompt();
                    } else {
                        throw new Error('Setup module not loaded.');
                    }
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
                FP.chat.addMessage(`🔗 **Connect**\n\nUsage:\n• \`/connect agent\` - Setup your AI provider keys\n• \`/connect codebase\` - Link local project files`, 'bot');
            } catch (err) {
                console.error('Command /connect failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/plugin': function () {
            try {
                FP.chat.addMessage('🔌 **Bridge Instructions**\n\n1. Open Figma\n2. Run "FigPal Bridge" plugin\n3. Selection will sync automatically!', 'bot');
            } catch (err) {
                console.error('Command /plugin failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/vfs': async function () {
            try {
                // Show VFS connection status
                if (FP.vfs && FP.vfs.isConnected && FP.vfs.isConnected()) {
                    const status = FP.vfs.getStatus ? FP.vfs.getStatus() : { name: 'Connected', fileCount: 'Unknown' };
                    FP.chat.addMessage(`📁 **VFS Connected**\n\nCodebase: \`${status.name}\`\nFiles: ${status.fileCount || 'Unknown'}\n\nUse \`/open\` to read files!`, 'bot');
                } else {
                    FP.chat.addMessage('📁 **VFS Not Connected**\n\nUse \`/connect codebase\` to link your project files.', 'bot');
                }
            } catch (err) {
                console.error('Command /vfs failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/open': async function (arg) {
            try {
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
            } catch (err) {
                console.error('Command /open failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/console': async function () {
            try {
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
            } catch (err) {
                console.error('Command /console failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/workflow': async function (arg) {
            try {
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
            } catch (err) {
                console.error('Command /workflow failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/skill': async function (arg) {
            try {
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
                    if (skill) {
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
            } catch (err) {
                console.error('Command /skill failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        // 'FIX:LAUNCH_BRIDGE' & 'LAUNCH_BRIDGE' are button callbacks
        // We map them to the same logic as /plugin
        'FIX:LAUNCH_BRIDGE': function () {
            COMMANDS['/plugin']();
        },

        'LAUNCH_BRIDGE': function () {
            COMMANDS['/plugin']();
        },

        '/audit': function () {
            try {
                // Trigger audit via flow
                FP.emit('user-message', { text: 'Audit this selection for Design System compliance.' });
            } catch (err) {
                console.error('Command /audit failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        'FIX:AUDIT': function () {
            COMMANDS['/audit']();
        },
        'AUDIT': function () {
            COMMANDS['/audit']();
        },

        'FIX:LEARN': function (arg) {
            try {
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
            } catch (err) {
                console.error('Command FIX:LEARN failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        'FIX:PLACE': function (arg) {
            try {
                // Triggered by button: [Place Template:FIX:PLACE|{nodeId}]
                if (!arg) return;
                const nodeId = arg.trim();

                if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                    FP.pluginBridge.send('instantiate-component', { nodeId });
                } else {
                    FP.chat.addMessage('🔌 **Plugin Disconnected**\n\nI need the FigPal Bridge to place components.', 'bot');
                }
            } catch (err) {
                console.error('Command FIX:PLACE failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        'FIX:SHOW_MEDIA': async function (arg) {
            try {
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
            } catch (err) {
                console.error('Command FIX:SHOW_MEDIA failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/learn': function () {
            try {
                // This is a catch-all to explain how to use it
                FP.chat.addMessage('📘 **Knowledge Training**\n\nTo teach me something, type: `/learn [your documentation here]`\n\n*Example:* `/learn Buttons must always have a 4px corner radius.`', 'bot');
            } catch (err) {
                console.error('Command /learn failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/capture': function () {
            try {
                const selection = FP.state.pluginSelection || [];
                if (selection.length === 0) {
                    FP.chat.addMessage('⚠️ Select something first to capture it!', 'bot');
                    return;
                }

                const firstNode = selection[0];
                const textNode = selection.find(n => n.type === 'TEXT');

                // Structured Memory: Store full JSON for reconstruction
                FP.state.memory = {
                    node: firstNode, // The full JSON snapshot
                    text: textNode ? textNode.characters : null,
                    sourceId: firstNode.id,
                    sourceName: firstNode.name,
                    timestamp: Date.now()
                };

                if (textNode) {
                    FP.chat.addMessage(`🧠 **Captured!** I've remembered this text and its style:\n\n*"${textNode.characters.substring(0, 100)}..."*\n\nMove to where you want it and say "recreate it" or "Place it"!`, 'bot');
                } else {
                    FP.chat.addMessage(`🧠 **Component Saved.** I'm remembering the full structure of [${firstNode.type}:${firstNode.name}].\n\nI can now "recreate" this exactly as it is elsewhere!`, 'bot');
                }
            } catch (err) {
                console.error('Command /capture failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        'FIX:PLACE_NOTE': async function () {
            try {
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
            } catch (err) {
                console.error('Command FIX:PLACE_NOTE failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        'FIX:CHAT_CMD': function (arg) {
            try {
                // Allows buttons to trigger slash commands
                // Example: [Connect agent:FIX:CHAT_CMD|/connect agent]
                if (!arg) return;
                const cmd = arg.trim();
                if (cmd.startsWith('/')) {
                    tryHandle(cmd);
                }
            } catch (err) {
                console.error('Command FIX:CHAT_CMD failed:', err);
            }
        },

        '/export': function () {
            try {
                const data = JSON.stringify(FP.state.skills || [], null, 2);
                FP.chat.addMessage(`💾 **Exporting Skills**\n\nCopy this JSON to backup or move to another PC:\n\n\`\`\`json\n${data}\n\`\`\``, 'bot');
            } catch (err) {
                console.error('Command /export failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/import': function () {
            try {
                FP.chat.addMessage('📥 **Importing Skills**\n\nType: `/import [JSON_ARRAY]`\n\n*Example:* `/import ["Rule 1", "Rule 2"]`', 'bot');
            } catch (err) {
                console.error('Command /import failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        'y': function () {
            try {
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
            } catch (err) {
                console.error('Command y failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/help': function () {
            try {
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
            } catch (err) {
                console.error('Command /help failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/monitor': function (arg) {
            try {
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
            } catch (err) {
                console.error('Command /monitor failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/search': function (arg) {
            try {
                if (FP.search) {
                    FP.search.search(arg);
                } else {
                    FP.chat.addMessage('⚠️ Search engine not loaded.', 'error');
                }
            } catch (err) {
                console.error('Command /search failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/docs': function (arg) {
            try {
                if (FP.search) {
                    FP.search.docs(arg);
                } else {
                    FP.chat.addMessage('⚠️ Search engine not loaded.', 'error');
                }
            } catch (err) {
                console.error('Command /docs failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/create': async function (arg) {
            try {
                if (!arg) {
                    FP.chat.addMessage('🎨 **Create Shapes & Frames**\n\nUsage: `/create <description>`\nExample: `/create a red circle inside a blue frame`', 'bot');
                    return;
                }

                if (!FP.pluginBridge.isConnected) {
                    FP.chat.addMessage('🔌 **Plugin Disconnected**\n\nConnect the Bridge to create items in Figma.', 'bot');
                    return;
                }

                FP.chat.addMessage(`🎨 **Designing:** "${arg}"...`, 'bot');

                // Construct prompt for AI
                const prompt = `Generate valid JavaScript code using the Figma Plugin API to create the following: "${arg}".
 Context:
 - Use \`figma.createRectangle()\`, \`figma.createFrame()\`, etc.
 - Set properties like \`x\`, \`y\`, \`fills\`, \`resize()\`.
 - If creating multiple items, layout them nicely.
 - If "selection" is mentioned, use \`figma.currentPage.selection\`.
 - WRAP the code in an async function if using await (e.g., loading fonts).
 - DO NOT wrap in markdown blocks. Return ONLY code.
 - Ends with \`figma.currentPage.selection = [nodes...]\` to select created items.
 - Return the CODE ONLY.`;

                FP.emit('user-message', { text: prompt });
                FP.chat.addMessage('💡 **Tip:** Copy the generated code and run it with `/exec <code_block>` (clean up backticks first!)', 'bot');
            } catch (err) {
                console.error('Command /create failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
            }
        },

        '/exec': async function (arg) {
            try {
                if (!arg) {
                    FP.chat.addMessage('💻 **Execute Code**\n\nUsage: `/exec figma.createRectangle()`', 'bot');
                    return;
                }

                if (!FP.pluginBridge.isConnected) {
                    FP.chat.addMessage('🔌 **Plugin Disconnected**', 'bot');
                    return;
                }

                FP.chat.addMessage('⚡ Executing...', 'bot');
                const result = await FP.pluginBridge.execute(arg);

                if (result.success) {
                    FP.chat.addMessage('✅ **Success**', 'bot');
                } else {
                    FP.chat.addMessage(`❌ **Error:** ${result.error}`, 'bot');
                }
            } catch (err) {
                console.error('Command /exec failed:', err);
                FP.chat.addMessage(`❌ **Command Failed**\n${err.message}`, 'bot');
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
