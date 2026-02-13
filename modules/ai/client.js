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
        const provider = FP.state.provider || 'gemini';
        const apiKey = FP.state.apiKeys[provider];
        const selectedModel = FP.state.selectedModel;
        const cfg = PROVIDERS[provider];

        if (!cfg) return 'Unknown AI provider: ' + provider;
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
                    const text = cfg.parseResponse(data);
                    if (text) return text;
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
