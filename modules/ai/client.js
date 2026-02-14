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
            models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro'],
            endpoint: (model) =>
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            headers: (key) => ({
                'Content-Type': 'application/json',
                'x-goog-api-key': key,
            }),
            buildBody: (prompt, model, tools) => {
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                };
                if (tools && tools.length > 0) {
                    body.tools = [{
                        functionDeclarations: tools.map(t => ({
                            name: t.name,
                            description: t.description,
                            parameters: t.parameters
                        }))
                    }];
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
            name: "read_vfs_file",
            description: "Read the content of a file from the user's local codebase via VFS.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "The relative path to the file (e.g. 'src/App.js')" }
                },
                required: ["path"]
            }
        }
    ];

    // ─── Send to AI ──────────────────────────────────────────────────────
    async function sendToAI(prompt, tools = AVAILABLE_TOOLS) {
        const provider = FP.state.provider || 'gemini';
        const apiKey = FP.state.apiKeys[provider];
        const selectedModel = FP.state.selectedModel;
        const cfg = PROVIDERS[provider];

        if (!cfg) return 'Unknown AI provider: ' + provider;
        if (!apiKey) return `Please set your API key for **${cfg.name}** via \`/connect\`. ⚙️`;

        // ─── PLUGIN BRAIN PATH ───────────────────────────────────────────────
        if (typeof prompt === 'object' && prompt.isConnected) {
            console.log('FigPal AI: Routing to Plugin Brain 🧠');
            try {
                // We need to pass the provider/model choice too
                const payload = {
                    ...prompt,
                    provider: provider,
                    model: selectedModel || cfg.models[0],
                    apiKey: apiKey // Optional, plugin might have its own
                };

                const result = await FP.pluginBridge.request('ai-request', payload);

                if (result.error) {
                    throw new Error(result.error);
                }

                const responseText = result.text || "";

                return responseText || "No text returned from Brain.";
            } catch (e) {
                console.error('FigPal AI: Plugin Brain failed', e);
                return `Plugin Brain Error: ${e.message}`;
            }
        }

        // ─── LEGACY FETCH PATH ───────────────────────────────────────────────
        if (FP.state.currentController) FP.state.currentController.abort();
        FP.state.currentController = new AbortController();
        const signal = FP.state.currentController.signal;

        const model = selectedModel || cfg.models[0];

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

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    return `AI Error: ${response.status} - ${errorData.error?.message || 'Failed'}`;
                }

                const data = await response.json();
                const result = cfg.parseResponse(data);

                if (typeof result === 'string') {
                    // Track successful usage
                    if (FP.ai.tracker) {
                        const estimatedTokens = (JSON.stringify(currentPrompt).length + result.length) / 4;
                        FP.ai.tracker.trackRequest(estimatedTokens);
                    }
                    return result;
                } else if (result && result.type === 'tool') {
                    const { name, args } = result.call;
                    console.log(`FigPal AI: Tool Call -> ${name}`, args);

                    if (name === 'read_vfs_file') {
                        const content = await FP.vfs.readFile(args.path);
                        if (!content) {
                            currentPrompt += `\n\nTOOL_RESPONSE: File not found: ${args.path}`;
                        } else {
                            currentPrompt += `\n\nTOOL_RESPONSE: Content of ${args.path}:\n\`\`\`\n${content}\n\`\`\``;
                        }
                        continue; // Loop
                    } else {
                        return `I need to use ${name}, but I can only read files right now.`;
                    }
                }
                return "No response from AI.";
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                return `Fatal Error: ${e.message}`;
            }
        }

        return "Too many tool loops. Reached max limit.";
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
