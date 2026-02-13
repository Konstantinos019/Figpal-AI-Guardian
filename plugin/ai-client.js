// plugin/ai-client.js
// The "Brain" running inside the Figma Plugin Sandbox.
// Capable of direct fetch() to LLMs if Figma environment allows it.

const PROVIDERS = {
    gemini: {
        endpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: (key) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': key }),
        body: (system, history, msg, tools) => ({
            contents: [
                ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] })),
                { role: 'user', parts: [{ text: msg }] }
            ],
            systemInstruction: { parts: [{ text: system }] },
            tools: tools ? [{ function_declarations: tools }] : undefined
        })
    },
    openai: {
        endpoint: () => 'https://api.openai.com/v1/chat/completions',
        headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
        body: (system, history, msg, tools) => ({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: system },
                ...history.map(h => ({ role: h.role, content: h.text })),
                { role: 'user', content: msg }
            ],
            tools: tools ? tools.map(t => ({ type: 'function', function: t })) : undefined
        })
    }
};

export async function askAI({ provider, apiKey, model, history, systemPrompt, userMessage, tools }) {
    if (!PROVIDERS[provider]) throw new Error(`Unknown provider: ${provider}`);

    const cfg = PROVIDERS[provider];
    const url = cfg.endpoint(model);

    console.log(`FigPal Brain: Thinking... (${provider}/${model})`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: cfg.headers(apiKey),
            body: JSON.stringify(cfg.body(systemPrompt, history, userMessage, tools))
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`AI Error ${response.status}: ${err}`);
        }

        const data = await response.json();

        // Normalize Response
        if (provider === 'gemini') {
            const candidate = data.candidates?.[0];
            const content = candidate?.content?.parts?.[0]?.text;
            const functionCall = candidate?.content?.parts?.[0]?.functionCall;
            return { text: content, functionCall };
        }

        if (provider === 'openai') {
            const choice = data.choices?.[0];
            const content = choice?.message?.content;
            const toolCalls = choice?.message?.tool_calls;
            // Map OpenAI tool_calls to generic functionCall format (single for now)
            const functionCall = toolCalls ? { name: toolCalls[0].function.name, args: JSON.parse(toolCalls[0].function.arguments) } : null;
            return { text: content, functionCall };
        }

    } catch (e) {
        console.error('FigPal Brain Error:', e);
        return { text: `Error: ${e.message}` };
    }
}
