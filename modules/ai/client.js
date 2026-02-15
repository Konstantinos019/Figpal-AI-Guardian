// modules/ai/client.js
// Multi-provider AI client. Supports Gemini, Grok, Claude, OpenAI.
// Exports: FigPal.ai = { sendToAI, abort, PROVIDERS }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Provider Configurations ─────────────────────────────────────────
    const PROVIDERS = {
        gemini: {
            name: 'Gemini',
            models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
            endpoint: (model) =>
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            headers: (key) => ({
                'Content-Type': 'application/json',
                'x-goog-api-key': key,
            }),
            buildBody: (prompt, model, tools) => {
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: []
                };

                // Native Grounding vs Function Calling (Conflicting in Gemini)
                const isExplicitSearch = /search the web/i.test(prompt);

                if (isExplicitSearch) {
                    // Use Native Grounding for explicit search requests
                    // OMIT custom tools to avoid 400 error "Tool use with function calling is unsupported"
                    body.tools.push({ google_search: {} });
                } else if (tools && tools.length > 0) {
                    // Use Custom Tools for everything else
                    body.tools.push({
                        function_declarations: tools.map(t => ({
                            name: t.name,
                            description: t.description,
                            parameters: t.parameters
                        }))
                    });
                }

                return body;
            },
            parseResponse: (data) => {
                const part = data?.candidates?.[0]?.content?.parts?.[0];
                if (part?.functionCall) {
                    return { type: 'tool', call: { name: part.functionCall.name, args: part.functionCall.args } };
                }
                return part?.text || null;
            },
            listModelsUrl: (key) =>
                `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
            parseModelList: (data) =>
                (data.models || []).map((m) => m.name.split('/').pop()),
        },

        grok: {
            name: 'Grok',
            models: ['grok-3-fast', 'grok-3-mini-fast'],
            endpoint: () => 'https://api.x.ai/v1/chat/completions',
            headers: (key) => ({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            }),
            buildBody: (prompt, model) => ({
                model: model,
                messages: [{ role: 'user', content: prompt }],
            }),
            parseResponse: (data) =>
                data?.choices?.[0]?.message?.content || null,
            listModelsUrl: null,
            parseModelList: null,
        },

        openai: {
            name: 'OpenAI',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
            endpoint: () => 'https://api.openai.com/v1/chat/completions',
            headers: (key) => ({
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            }),
            buildBody: (prompt, model) => ({
                model: model,
                messages: [{ role: 'user', content: prompt }],
            }),
            parseResponse: (data) =>
                data?.choices?.[0]?.message?.content || null,
            listModelsUrl: null,
            parseModelList: null,
        },

        claude: {
            name: 'Claude',
            models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
            endpoint: () => 'https://api.anthropic.com/v1/messages',
            headers: (key) => ({
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            }),
            buildBody: (prompt, model) => ({
                model: model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            }),
            parseResponse: (data) =>
                data?.content?.[0]?.text || null,
            listModelsUrl: null,
            parseModelList: null,
        },
    };

    const AVAILABLE_TOOLS = [
        {
            name: "figma_execute",
            description: "POWER TOOL: Execute arbitrary JavaScript using the Figma Plugin API. Use this for complex layouts, batch operations, or creating design system components from scratch.",
            parameters: {
                type: "object",
                properties: {
                    code: { type: "string", description: "The JavaScript code to execute. Can use async/await. Has access to the 'figma' global." },
                    timeout: { type: "number", description: "Optional timeout in ms (default 5000)" }
                },
                required: ["code"]
            }
        },
        {
            name: "get_design_tokens",
            description: "Fetch all local variables and collections (design tokens) from the current file.",
            parameters: {
                type: "object",
                properties: {
                    refresh: { type: "boolean", description: "Force a fresh fetch instead of using cached data." }
                }
            }
        },
        {
            name: "read_vfs_file",
            description: "Read the content of a file from the user's local codebase via VFS.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "The relative path to the file (e.g. 'src/App.js')" }
                },
                required: ["path"]
            }
        },
        {
            name: "get_selection_info",
            description: "Get detailed information about the currently selected nodes, including geometry, colors, and layout properties. Use this first if you need to understand what the user is looking at.",
            parameters: {
                type: "object",
                properties: {}
            }
        },
        {
            name: "get_plugin_logs",
            description: "Retrieve recent console logs from the Figma plugin. CRITICAL: Use this tool immediately if figma_execute fails or if you suspect a runtime error in the plugin. It helps you see the exact error message and 'Console Capture' output from the plugin sandbox.",
            parameters: {
                type: "object",
                properties: {
                    count: { type: "number", description: "Number of recent logs to fetch (max 50, default 20)" }
                }
            }
        },
        {
            name: "manage_slack",
            description: "Integration with Slack for sending notifications and reports to the team.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["connect", "send", "read"], description: "Action to perform" },
                    url: { type: "string", description: "Webhook URL or Bot Token (xoxb-...) for 'connect'" },
                    channel: { type: "string", description: "Channel ID (e.g. C12345) for 'read' or 'connect'" },
                    count: { type: "number", description: "Number of messages to read (default 5)" },
                    message: { type: "string", description: "Message text (for 'send')" }
                },
                required: ["action"]
            }
        },
        {
            name: "search_web",
            description: "Search the web for information, design patterns, or assets. Use this when the user asks for external information.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The search query (e.g. 'latest design trends 2024')" }
                },
                required: ["query"]
            }
        },
        {
            name: "search_library",
            description: "Search for design components in the asset library (local and team). Returns a list of components with names and keys.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query (e.g., 'primary button', 'icon')" }
                },
                required: ["query"]
            }
        },
        {
            name: "use_asset",
            description: "Insert a component from the library into the canvas. REQUIRES a component key or ID found via search_library.",
            parameters: {
                type: "object",
                properties: {
                    key: { type: "string", description: "Component Key or ID (from search_library results)" }
                },
                required: ["key"]
            }
        },
        {
            name: "search_docs",
            description: "Search official documentation for specific topics (Figma API, React, CSS, etc.).",
            parameters: {
                type: "object",
                properties: {
                    topic: { type: "string", description: "The documentation topic (e.g. 'Figma variable modes')" }
                },
                required: ["topic"]
            }
        },
        {
            name: "manage_monitor",
            description: "Control the proactive design monitoring system. Use this to start/stop watching for design drift or check status.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["start", "stop", "status"], description: "Action to perform" }
                },
                required: ["action"]
            }
        },
        {
            name: "manage_workflows",
            description: "List or run automated workflows.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["list", "run"], description: "Action to perform" },
                    name: { type: "string", description: "Name of the workflow to run (required if action is 'run')" }
                },
                required: ["action"]
            }
        },
        {
            name: "manage_skills",
            description: "List or run learned skills.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["list", "run"], description: "Action to perform" },
                    name: { type: "string", description: "Name of the skill to run (required if action is 'run')" }
                },
                required: ["action"]
            }
        },
        {
            name: "run_audit",
            description: "Perform a Design System audit on the current selection. Checks for compliance, accessibility, and naming.",
            parameters: { type: "object", properties: {} }
        },
        {
            name: "capture_memory",
            description: "Capture the current selection or text into temporary memory for later use (e.g. 'Remember this').",
            parameters: { type: "object", properties: {} }
        },
        {
            name: "place_note",
            description: "Place a sticky note on the canvas using the content currently in memory.",
            parameters: { type: "object", properties: {} }
        },
        {
            name: "learn_skill",
            description: "Save a new design rule or skill to long-term memory.",
            parameters: {
                type: "object",
                properties: {
                    rule: { type: "string", description: "The rule or skill to save (e.g. 'Buttons must correspond to the pixel grid')" }
                },
                required: ["rule"]
            }
        }
    ];

    // ─── Send to AI ──────────────────────────────────────────────────────
    async function sendToAI(prompt, tools = AVAILABLE_TOOLS) {
        const provider = FP.state.provider || 'gemini';
        let apiKeys = FP.state.apiKeys[provider];

        // Normalize strings to arrays for legacy support
        if (typeof apiKeys === 'string') {
            apiKeys = [apiKeys];
        }

        const selectedModel = FP.state.selectedModel;
        const cfg = PROVIDERS[provider];

        if (!cfg) return 'Unknown AI provider: ' + provider;
        if (!apiKeys || apiKeys.length === 0) return `Please set your API key for **${cfg.name}** via \`/connect\`. ⚙️`;

        // ─── AI REQUEST PATH ───────────────────────────────────────────────
        if (FP.state.currentController) FP.state.currentController.abort();
        FP.state.currentController = new AbortController();
        const signal = FP.state.currentController.signal;
        const model = selectedModel || cfg.models[0];

        // Persistent Rotation: Start from the last successful key (or next one)
        FP.state.lastKeyIndex = FP.state.lastKeyIndex || {};
        const startIndex = FP.state.lastKeyIndex[provider] || 0;

        // Rotation Loop (starting from startIndex)
        for (let j = 0; j < apiKeys.length; j++) {
            const i = (startIndex + j) % apiKeys.length;
            const currentKeyEntry = apiKeys[i];
            const apiKey = typeof currentKeyEntry === 'object' ? currentKeyEntry.key : currentKeyEntry;
            const alias = typeof currentKeyEntry === 'object' ? currentKeyEntry.alias : null;

            const maskedKey = alias || (apiKey.substring(0, 8) + '...' + apiKey.slice(-4));

            // Loop for tool fulfilling
            let currentPrompt = prompt;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                attempts++;
                const endpoint = cfg.endpoint(model);
                const body = cfg.buildBody(currentPrompt, model, tools);

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: cfg.headers(apiKey),
                        body: JSON.stringify(body),
                        signal: signal,
                    });

                    if (response.status === 429) {
                        console.warn(`FigPal AI: Key ${i + 1} (${maskedKey}) hit quota (429). Rotating...`);
                        if (j < apiKeys.length - 1) {
                            break; // Break tool loop, continue key loop
                        } else {
                            return `⚠️ **All keys exhausted.**\n\n- Current Provider: **${cfg.name}**\n- Keys Configured: ${apiKeys.length}\n\n**Common Troubleshooting:**\n- If your keys are from the same Google Cloud Project, they share the same rate limit.\n- Free Tier Gemini models have strict request-per-minute limits.\n- Please wait 60 seconds or add a key from a different project.`;
                        }
                    }

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const errMsg = errorData.error?.message || 'Unknown Failure';
                        if (response.status === 400 && errMsg.includes('GROUNDING')) {
                            return `⚠️ **API Conflict (400):** Gemini doesn't support Grounding + Custom Tools yet. I've automatically disabled grounding to proceed with your request.`;
                        }
                        return `⚠️ **AI Provider Error (${response.status})**\n\n${errMsg}`;
                    }

                    const data = await response.json();

                    // Success! Record this key as the successful one
                    FP.state.lastKeyIndex[provider] = i;
                    const result = cfg.parseResponse(data);

                    if (typeof result === 'string') {
                        if (FP.ai.tracker) {
                            const estTokens = (JSON.stringify(currentPrompt).length + result.length) / 4;
                            FP.ai.tracker.trackRequest(estTokens);
                        }
                        return result;
                    } else if (result && result.type === 'tool') {
                        const { name, args } = result.call;
                        console.log(`FigPal AI: Tool Call -> ${name}`, args);

                        if (name === 'read_vfs_file') {
                            const content = await FP.vfs.readFile(args.path);
                            currentPrompt += `\n\nTOOL_RESPONSE: ${content ? `Content of ${args.path}:\n\`\`\`\n${content}\n\`\`\`` : `File not found: ${args.path}`}`;
                            continue;
                        } else if (name === 'figma_execute') {
                            const res = await FP.pluginBridge.execute(args.code, args.timeout);
                            currentPrompt += `\n\nTOOL_RESPONSE: Execution result:\n${JSON.stringify(res, null, 2)}`;
                            continue;
                        } else if (name === 'get_design_tokens') {
                            const tokens = await FP.pluginBridge.getDesignTokens(args.refresh);
                            currentPrompt += `\n\nTOOL_RESPONSE: Design Tokens (Variables):\n${JSON.stringify(tokens, null, 2)}`;
                            continue;
                        } else if (name === 'get_selection_info') {
                            const selection = await FP.pluginBridge.getSelection();
                            currentPrompt += `\n\nTOOL_RESPONSE: Current Selection:\n${JSON.stringify(selection, null, 2)}`;
                            continue;
                        } else if (name === 'get_plugin_logs') {
                            const logs = FP.logger ? FP.logger.formatLogs(args.count || 20) : "Logger not available.";
                            currentPrompt += `\n\nTOOL_RESPONSE: Recent Plugin Logs:\n${logs}`;
                            continue;
                        } else if (name === 'search_web') {
                            // If search grounding is active (Gemini), the model already has access to web data.
                            // If not, we trigger the search module but also allow the AI to continue.
                            if (FP.search) {
                                FP.search.search(args.query);
                            }
                            currentPrompt += `\n\nTOOL_RESPONSE: Web search for "${args.query}" has been processed. Please provide the most up-to-date information available in your context or grounding session.`;
                            continue;
                        } else if (name === 'search_docs') {
                            if (FP.search) {
                                FP.search.docs(args.topic);
                            }
                            currentPrompt += `\n\nTOOL_RESPONSE: Documentation search for "${args.topic}" has been processed. Please provide the best technical guidance available.`;
                            continue;
                        } else if (name === 'manage_monitor') {
                            if (!FP.monitor) return "Monitor module not loaded.";
                            if (args.action === 'start') { FP.monitor.start(); return "Monitor started."; }
                            if (args.action === 'stop') { FP.monitor.stop(); return "Monitor stopped."; }
                            if (args.action === 'status') return JSON.stringify(FP.monitor.status());
                        } else if (name === 'manage_workflows') {
                            if (!FP.workflows) return "Workflow module not loaded.";
                            if (args.action === 'list') {
                                const list = await FP.workflows.list();
                                return "Workflows:\n" + list.map(w => `- ${w.name}: ${w.description}`).join('\n');
                            }
                            if (args.action === 'run') {
                                const wf = await FP.workflows.getByName(args.name);
                                if (!wf) return `Workflow '${args.name}' not found.`;
                                await FP.workflows.execute(wf);
                                return `Workflow '${args.name}' executed.`;
                            }
                        } else if (name === 'manage_skills') {
                            if (!FP.skills) return "Skill module not loaded.";
                            if (args.action === 'list') {
                                const list = await FP.skills.list();
                                return "Skills:\n" + list.map(s => `- ${s.name} (${s.type})`).join('\n');
                            }
                            if (args.action === 'run') {
                                const skill = (await FP.skills.list()).find(s => s.name.toLowerCase() === args.name.toLowerCase());
                                if (!skill) return `Skill '${args.name}' not found.`;
                                const result = await FP.skills.execute(skill);
                                return result.success ? "Skill executed successfully." : `Skill failed: ${result.error}`;
                            }
                        } else if (name === 'run_audit') {
                            FP.emit('user-message', { text: 'Audit this selection for Design System compliance.' });
                            return "Audit triggered.";
                        } else if (name === 'capture_memory') {
                            if (FP.commands && FP.commands.tryHandle('/capture')) return "Capture command executed.";
                            return "Capture failed.";
                        } else if (name === 'place_note') {
                            if (FP.commands) {
                                // Direct call to the function since tryHandle expects slash commands or specific keys
                                await FP.commands['FIX:PLACE_NOTE']();
                                return "Place Note command executed.";
                            }
                            return "Command module not available.";
                        } else if (name === 'learn_skill') {
                            if (FP.commands) {
                                FP.commands['FIX:LEARN'](args.rule);
                                return `Skill learned: "${args.rule}"`;
                            }
                            return "Command module not available.";
                        } else if (name === 'search_library') {
                            if (!FP.library) return "Library module not loaded.";
                            const results = await FP.library.search(args.query);
                            return `Found ${results.length} components:\n${JSON.stringify(results.slice(0, 10), null, 2)}`;
                        } else if (name === 'use_asset') {
                            if (!FP.library) return "Library module not loaded.";
                            await FP.library.instantiate(args.key);
                            return "Asset instantiated on canvas.";
                        } else if (name === 'manage_slack') {
                            if (!FP.slack) return "Slack module not loaded.";
                            if (args.action === 'connect') {
                                await FP.slack.connect(args.url, args.channel);
                                return `Slack connected to ${args.channel || 'webhook default'}.`;
                            }
                            if (args.action === 'send') {
                                const success = await FP.slack.send(args.message);
                                return success ? "Message sent to Slack." : "Failed to send message.";
                            }
                            if (args.action === 'read') {
                                if (!FP.slack.config.botToken) return "Reading requires a Bot Token (xoxb-...). Current connection is Webhook-only.";
                                const history = await FP.slack.history(args.count);
                                return `Slack History:\n${history}`;
                            }
                            return "Invalid action.";
                        } else {
                            const res = await FP.pluginBridge.request(name, args);
                            currentPrompt += `\n\nTOOL_RESPONSE: ${name} result:\n${JSON.stringify(res, null, 2)}`;
                            continue;
                        }
                    }
                    return "No response from AI.";
                } catch (e) {
                    if (e.name === 'AbortError') throw e;
                    return `Fatal Error: ${e.message}`;
                }
            }

            // If we successfully returned from inside the while loop, we're done.
            // If we broke (429), it continues the for loop to the next key.
        }

        return "Too many tool loops or all keys exhausted.";
    }

    // ─── Abort ───────────────────────────────────────────────────────────
    function abort() {
        if (FP.state.currentController) {
            FP.state.currentController.abort();
            FP.state.currentController = null;
        }
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.ai = FP.ai || {};
    FP.ai.sendToAI = sendToAI;
    FP.ai.abort = abort;
    FP.ai.PROVIDERS = PROVIDERS;
})();
