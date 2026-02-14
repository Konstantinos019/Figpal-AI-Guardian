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
            buildBody: (prompt) => ({
                contents: [{ parts: [{ text: prompt }] }],
            }),
            parseResponse: (data) =>
                data?.candidates?.[0]?.content?.parts?.[0]?.text || null,
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

    // ─── Send to AI ──────────────────────────────────────────────────────
    async function sendToAI(prompt) {
        // Inject VFS Context (if applicable)
        if (FP.vfs && FP.vfs.rootName) {
            const summary = FP.vfs.getContextSummary();
            if (summary) {
                const contextMsg = `\n\nCONTEXT: The user has loaded a local codebase (${FP.vfs.rootName}).\n${summary}\n\nTo read a file, ask the user to read it, or use the \`read_file\` tool if available.`;

                if (typeof prompt === 'string') {
                    prompt += contextMsg;
                } else if (typeof prompt === 'object' && prompt.messages) {
                    // For object prompts (Plugin Brain or Structured), append to last user message
                    const lastMsg = prompt.messages[prompt.messages.length - 1];
                    if (lastMsg && lastMsg.role === 'user') {
                        lastMsg.content += contextMsg;
                    }
                }
            }
        }

        const provider = FP.state.provider || 'gemini';
        const apiKey = FP.state.apiKeys[provider];
        const selectedModel = FP.state.selectedModel;
        const cfg = PROVIDERS[provider];

        if (!cfg) return 'Unknown AI provider: ' + provider;
        if (!apiKey) return `Please set your API key for **${cfg.name}** via \`/connect\`. ⚙️`;

        if (!cfg) return 'Unknown AI provider: ' + provider;

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

                // Detection for 429 from Plugin Brain (propagated error text)
                if (responseText.includes('Error 429') || responseText.includes('Quota Exceeded')) {
                    const tracker = FP.ai.tracker;
                    if (tracker) {
                        return `### 🛑 Quota Exceeded\n\nYou've hit the provider's rate limits.\n\n${tracker.formatUsageMarkdown('Current Usage Estimates')}\n\n*Please wait a minute for stats to reset.*`;
                    }
                }

                // Track successful usage
                if (FP.ai.tracker && !responseText.startsWith('Error:')) {
                    const estimatedTokens = (JSON.stringify(prompt).length + responseText.length) / 4;
                    FP.ai.tracker.trackRequest(estimatedTokens);
                }

                return responseText || "No text returned from Brain.";
            } catch (e) {
                console.error('FigPal AI: Plugin Brain failed', e);
                return `Plugin Brain Error: ${e.message}`;
            }
        }

        // ─── LEGACY FETCH PATH ───────────────────────────────────────────────
        if (!apiKey) return `Please set your API key for **${cfg.name}** via \`/connect\`. ⚙️`;

        // Abort any in-flight request
        if (FP.state.currentController) FP.state.currentController.abort();
        FP.state.currentController = new AbortController();
        const signal = FP.state.currentController.signal;

        const model = selectedModel || cfg.models[0];

        // Try multiple endpoints for Gemini (v1beta then v1)
        const endpoints = provider === 'gemini'
            ? [
                cfg.endpoint(model),
                `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
            ]
            : [cfg.endpoint(model)];

        for (const endpoint of endpoints) {
            console.log(`FigPal AI: Trying ${provider}/${model} via ${endpoint}...`);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: cfg.headers(apiKey),
                    body: JSON.stringify(cfg.buildBody(prompt, model)),
                    signal: signal,
                });

                if (response.ok) {
                    const data = await response.json();

                    // Track successful usage (estimate tokens based on chars / 4)
                    if (FP.ai.tracker) {
                        const estimatedTokens = (JSON.stringify(prompt).length + JSON.stringify(data).length) / 4;
                        FP.ai.tracker.trackRequest(estimatedTokens);
                    }

                    const text = cfg.parseResponse(data);
                    if (text) return text;
                } else if (response.status === 429) {
                    const tracker = FP.ai.tracker;
                    if (tracker) {
                        // Count this attempt (it consumed a request slot)
                        tracker.trackRequest(0);

                        const stats = tracker.getUsage();
                        const isLow = (stats.rpm < 5) && (stats.rpd < 100); // Check if local counts match typical server limits

                        let mismatchMsg = "";
                        if (isLow) {
                            mismatchMsg = `\n\n> ⚠️ **Note:** Your local counters are low, but Google's server blocked the request. This usually happens if:\n> - You used the API on another device/tab\n> - You recently reloaded the extension (resetting local stats)`;
                        }

                        return `### 🛑 Quota Exceeded\n\nYou've hit the provider's rate limits.\n\n${tracker.formatUsageMarkdown('Current Usage Estimates')}${mismatchMsg}\n\n*Please wait a minute for stats to reset.*`;
                    } else {
                        return `### 🛑 Quota Exceeded\n\nYou've hit the AI provider's rate limits. Please wait a minute and try again.`;
                    }
                } else if (response.status === 404) {
                    console.warn(`FigPal AI: ${model} not found, trying next endpoint...`);
                    continue;
                } else {
                    const errorBody = await response.json().catch(() => ({}));
                    console.error(`FigPal AI: Error (${model})`, response.status, errorBody);
                    return `AI Error: ${response.status} - ${errorBody.error?.message || 'Check your key via /reset'}`;
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    console.log('FigPal AI: Request aborted.');
                    throw e;
                }
                console.error(`FigPal AI: Fatal error with ${model}`, e);
            }
        }

        return `Sorry, ${cfg.name} returned errors for all endpoints. Check your API key or try /check.`;
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
