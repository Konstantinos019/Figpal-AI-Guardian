// plugin/code.js
// Figma Plugin Backend
figma.showUI(__html__, { width: 240, height: 80, title: "FigPal Guardian Bridge" });

// ─── GLOBALS ─────────────────────────────────────────────────────────

// Stores credentials in memory so they persist while the plugin is open.
const MEMORY = {
    apiKey: null,
    provider: 'openai', // Default
    model: 'gpt-4o'
};

const TOOLS = [
    {
        name: "rename_node",
        description: "Rename the currently selected node specifically.",
        parameters: {
            type: "object",
            properties: {
                id: { type: "string", description: "The ID of the node to rename (optional, defaults to selection)" },
                name: { type: "string", description: "The new name for the layer" }
            },
            required: ["name"]
        }
    },
    {
        name: "change_fill_color",
        description: "Change the fill color of the selected node. Uses Hex code.",
        parameters: {
            type: "object",
            properties: {
                hex: { type: "string", description: "Hex color code (e.g. #FF0000)" }
            },
            required: ["hex"]
        }
    },
    {
        name: "create_rectangle",
        description: "Create a new rectangle on the canvas.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the rectangle" },
                width: { type: "number", description: "Width in pixels" },
                height: { type: "number", description: "Height in pixels" },
                color: { type: "string", description: "Hex color (optional)" }
            },
            required: ["width", "height"]
        }
    },
    {
        name: "get_selection_info",
        description: "Get detailed information about the currently selected nodes.",
        parameters: {
            type: "object",
            properties: {}
        }
    }
];

const PROVIDERS = {
    gemini: {
        endpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: (key) => ({ 'Content-Type': 'application/json' }),
        url: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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
        url: () => 'https://api.openai.com/v1/chat/completions',
        body: (system, history, msg, tools) => ({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: system },
                ...history.map(h => ({ role: h.role, content: h.text })),
                { role: 'user', content: msg }
            ],
            tools: tools ? tools.map(t => ({ type: 'function', function: t })) : undefined
        })
    },
    grok: {
        endpoint: () => 'https://api.x.ai/v1/chat/completions',
        headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
        url: () => 'https://api.x.ai/v1/chat/completions',
        body: (system, history, msg, tools) => ({
            model: 'grok-beta',
            messages: [
                { role: 'system', content: system },
                ...history.map(h => ({ role: h.role, content: h.text })),
                { role: 'user', content: msg }
            ],
            tools: tools ? tools.map(t => ({ type: 'function', function: t })) : undefined
        })
    },
    claude: {
        endpoint: () => 'https://api.anthropic.com/v1/messages',
        headers: (key) => ({
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        }),
        url: () => 'https://api.anthropic.com/v1/messages',
        body: (system, history, msg, tools) => ({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 4096,
            system: system,
            messages: [
                ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
                { role: 'user', content: msg }
            ],
            tools: tools ? tools.map(t => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters
            })) : undefined
        })
    }
};

// ─── ENTRY POINT ─────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
    // msg structure: { pluginMessage: { type, id, data } }
    const { type, id, data } = msg;

    // ─── Handshake & Auth ───
    if (type === 'check-auth') {
        if (MEMORY.apiKey) {
            figma.ui.postMessage({ type: 'auth-success', id });
        } else {
            figma.ui.postMessage({ type: 'request-credentials', id });
        }
    }

    if (type === 'set-credentials') {
        const { apiKey, provider, model } = data;
        if (apiKey) MEMORY.apiKey = apiKey;
        if (provider) MEMORY.provider = provider;
        if (model) MEMORY.model = model;

        console.log('FigPal Plugin: Credentials updated in memory.');
        figma.ui.postMessage({ type: 'auth-success', id });
    }

    if (type === 'get-selection') {
        const selection = figma.currentPage.selection;
        console.log(`FigPal: Processing selection (${selection.length} nodes requested)`);

        // Slice the root selection too! Only take top 50 nodes.
        const simplified = selection.slice(0, 50).map(n => simplifyNode(n));

        console.log(`FigPal: Selection processed (${simplified.length} nodes captured)`);

        let imageData = null;
        if (selection.length > 0) {
            try {
                // Export the first selected node as a small PNG
                const bytes = await selection[0].exportAsync({
                    format: 'PNG',
                    constraint: { type: 'SCALE', value: 1 }
                });
                // Convert to base64 for easy transport to extension
                imageData = `data:image/png;base64,${figma.base64Encode(bytes)}`;
            } catch (e) {
                console.warn('FigPal: Failed to export selection image', e);
            }
        }

        const dataResponse = {
            nodes: simplified,
            image: imageData
        };

        // If this was an automated stream, use that type. Otherwise use generic 'response'.
        const responseType = id === 'auto-stream' ? 'selection-changed' : 'response';
        figma.ui.postMessage({ type: responseType, id, data: dataResponse });
    }

    if (type === 'notify') {
        figma.notify(data.message || 'FigPal notification');
    }

    if (type === 'get-file-info') {
        figma.ui.postMessage({
            type: 'response',
            id,
            data: {
                name: figma.root.name,
                fileKey: figma.fileKey
            }
        });
    }

    if (type === 'instantiate-component') {
        const { nodeId } = data;
        const node = figma.getNodeById(nodeId);

        if (!node) {
            figma.ui.postMessage({ type: 'response', id, data: { success: false, error: 'Component not found. It might be in another file.' } });
            return;
        }

        if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
            figma.ui.postMessage({ type: 'response', id, data: { success: false, error: 'Selected node is not a component.' } });
            return;
        }

        try {
            let instance;
            if (node.type === 'COMPONENT_SET') {
                instance = node.defaultVariant.createInstance();
            } else {
                instance = node.createInstance();
            }

            console.log(`FigPal Plugin: Created instance of ${instance.name} from ID ${nodeId}`);

            // Position in center of viewport
            const { x, y, width, height } = figma.viewport.bounds;
            instance.x = x + width / 2 - instance.width / 2;
            instance.y = y + height / 2 - instance.height / 2;

            figma.currentPage.appendChild(instance);
            figma.currentPage.selection = [instance];
            figma.notify(`✨ Added instance of ${node.name}`);

            figma.ui.postMessage({ type: 'response', id, data: { success: true } });
        } catch (err) {
            figma.ui.postMessage({ type: 'response', id, data: { success: false, error: err.message } });
        }
    }

    if (type === 'create-annotation') {
        const { text, title } = data;

        try {
            // 1. Create the container frame
            const frame = figma.createFrame();
            frame.name = `Annotation: ${title || 'Note'}`;
            frame.layoutMode = "VERTICAL";
            frame.paddingTop = 16;
            frame.paddingBottom = 16;
            frame.paddingLeft = 16;
            frame.paddingRight = 16;
            frame.itemSpacing = 8;
            frame.fills = [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.7 } }]; // Sticky Note Yellow
            frame.cornerRadius = 8;
            frame.effects = [{
                type: 'DROP_SHADOW',
                color: { r: 0, g: 0, b: 0, a: 0.1 },
                offset: { x: 0, y: 4 },
                radius: 12,
                visible: true,
                blendMode: 'NORMAL'
            }];

            // 2. Add Title (if exists)
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });
            if (title) {
                const titleNode = figma.createText();
                titleNode.fontName = { family: "Inter", style: "Bold" };
                titleNode.characters = title.toUpperCase();
                titleNode.fontSize = 11;
                titleNode.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.3, b: 0 } }];
                frame.appendChild(titleNode);
            }

            // 3. Add Content Text
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            const textNode = figma.createText();
            textNode.characters = text || "New Annotation";
            textNode.fontSize = 14;
            textNode.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.1, b: 0 } }];
            frame.appendChild(textNode);

            // 4. Position it
            const viewport = figma.viewport.center;
            frame.x = viewport.x;
            frame.y = viewport.y;

            figma.currentPage.appendChild(frame);
            figma.currentPage.selection = [frame];
            figma.viewport.scrollAndZoomIntoView([frame]);

            figma.ui.postMessage({ type: 'response', id, data: { success: true, nodeId: frame.id } });
            figma.notify("✨ Annotation Created!");
        } catch (err) {
            console.error('FigPal Plugin: Create error', err);
            figma.ui.postMessage({ type: 'response', id, data: { success: false, error: err.message } });
        }
    }

    if (type === 'update-node') {
        const { nodeId, updates } = data;
        console.log(`FigPal Plugin: Received update request for ${nodeId}`, updates);
        const node = figma.getNodeById(nodeId);

        if (!node) {
            figma.ui.postMessage({ type: 'response', id, data: { success: false, error: 'Node not found' } });
            return;
        }

        try {
            // Handle Renaming
            if (updates.name) node.name = updates.name;

            // Handle Text Updates (Requires font loading)
            if (node.type === 'TEXT' && updates.characters) {
                await Promise.all(
                    node.getRangeAllFontNames(0, node.characters.length)
                        .map(figma.loadFontAsync)
                );
                node.characters = updates.characters;
            }

            // Handle Basic Style/Fill Updates
            if (updates.fills && 'fills' in node) {
                node.fills = updates.fills;
            }

            figma.ui.postMessage({ type: 'response', id, data: { success: true } });
        } catch (err) {
            console.error('FigPal Plugin: Update error', err);
            figma.ui.postMessage({ type: 'response', id, data: { success: false, error: err.message } });
        }
    }

    if (type === 'ai-request') {
        // Use provided credentials OR fallback to memory
        const { text, history, systemPrompt } = data;
        const provider = data.provider || MEMORY.provider;
        const apiKey = data.apiKey || MEMORY.apiKey;
        const model = data.model || MEMORY.model;

        if (!apiKey) {
            figma.ui.postMessage({ type: 'ai-response', id, data: { error: "Missing API Key. Please authorize." } });
            figma.ui.postMessage({ type: 'request-credentials', id }); // Trigger re-auth
            return;
        }

        try {
            // 1. Gather Context (if not already provided in text/system)
            // The extension might fail to send context, so let's grab it here to be safe.
            const currentSelection = figma.currentPage.selection;
            let contextPrompt = "";

            if (currentSelection.length > 0) {
                const simplifiedDocs = currentSelection.slice(0, 10).map(n => simplifyNode(n));
                const contextStr = JSON.stringify(simplifiedDocs, null, 2);
                const truncated = contextStr.length > 30000 ? contextStr.substring(0, 30000) + "... [truncated]" : contextStr;
                contextPrompt = `\n\n### 🔴 LIVE FIGMA CONTEXT (Plugin Acquired):\n\`\`\`json\n${truncated}\n\`\`\``;
            }

            // 2. Ask AI
            const result = await askAI({
                provider,
                apiKey,
                model,
                history,
                systemPrompt,
                userMessage: text + contextPrompt, // Append context!
                tools: TOOLS.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }))
            });

            // 2. Handle Tool Calls Loop (The "Agentic Loop")
            if (result.functionCall) {
                const { name, args } = result.functionCall;
                console.log(`FigPal Agent: Tool Call -> ${name}`, args);

                // Execute the tool locally
                const toolResult = await executeTool(name, args);

                // For now, just return the result to the UI
                figma.ui.postMessage({
                    type: 'ai-response',
                    id,
                    data: {
                        text: `Executed ${name}: ${toolResult}`,
                        toolUsed: name
                    }
                });
            } else {
                // Just text response
                figma.ui.postMessage({ type: 'ai-response', id, data: { text: result.text } });
            }

        } catch (e) {
            figma.ui.postMessage({ type: 'ai-response', id, data: { error: e.message } });
        }
    }

    if (type === 'close') {
        figma.closePlugin();
    }
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────

async function executeTool(name, args) {
    if (name === 'rename_node') {
        const node = args.id ? figma.getNodeById(args.id) : figma.currentPage.selection[0];
        if (node) {
            node.name = args.name;
            return `Renamed node to "${args.name}"`;
        }
        return "Node not found";
    }
    if (name === 'change_fill_color') {
        const node = figma.currentPage.selection[0];
        if (node && 'fills' in node) {
            // Hex to RGB conversion
            const hex = args.hex.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            node.fills = [{ type: 'SOLID', color: { r, g, b } }];
            return `Changed color to ${args.hex}`;
        }
        return "No node selected or node does not support fills";
    }
    if (name === 'create_rectangle') {
        const rect = figma.createRectangle();
        rect.name = args.name || "Rectangle";
        rect.resize(args.width, args.height);
        if (args.color) {
            const hex = args.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            rect.fills = [{ type: 'SOLID', color: { r, g, b } }];
        }
        figma.currentPage.appendChild(rect);
        rect.x = figma.viewport.center.x;
        rect.y = figma.viewport.center.y;
        figma.currentPage.selection = [rect];
        return `Created rectangle "${rect.name}"`;
    }
    return "Unknown tool";
}

async function askAI({ provider, apiKey, model, history, systemPrompt, userMessage, tools }) {
    if (!PROVIDERS[provider]) throw new Error(`Unknown provider: ${provider}`);

    const cfg = PROVIDERS[provider];
    let url = cfg.url ? cfg.url(model, apiKey) : cfg.endpoint(model);
    let headers = cfg.headers(apiKey);

    if (provider === 'gemini') {
        headers = { 'Content-Type': 'application/json' };
    }

    console.log(`FigPal Brain: Thinking... (${provider}/${model})`);

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(cfg.body(systemPrompt, history, userMessage, tools))
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`AI Error ${response.status}: ${err}`);
    }

    const data = await response.json();

    if (provider === 'gemini') {
        // Safe access replacing ?.
        const candidate = data.candidates && data.candidates[0];
        const parts = candidate && candidate.content && candidate.content.parts;
        const part = parts && parts[0];

        const content = part && part.text;
        const functionCall = part && part.functionCall;
        return { text: content, functionCall };
    }

    if (provider === 'openai') {
        const choice = data.choices && data.choices[0];
        const message = choice && choice.message;

        const content = message && message.content;
        const toolCalls = message && message.tool_calls;
        const functionCall = toolCalls ? { name: toolCalls[0].function.name, args: JSON.parse(toolCalls[0].function.arguments) } : null;
        return { text: content, functionCall };
    }

    if (provider === 'grok') {
        const choice = data.choices && data.choices[0];
        const message = choice && choice.message;

        const content = message && message.content;
        const toolCalls = message && message.tool_calls;
        const functionCall = toolCalls ? { name: toolCalls[0].function.name, args: JSON.parse(toolCalls[0].function.arguments) } : null;
        return { text: content, functionCall };
    }

    if (provider === 'claude') {
        const contentBlock = data.content && data.content.find(c => c.type === 'text');
        const toolBlock = data.content && data.content.find(c => c.type === 'tool_use');

        const text = contentBlock ? contentBlock.text : null;
        const functionCall = toolBlock ? { name: toolBlock.name, args: toolBlock.input } : null;
        return { text, functionCall };
    }
}

// ─── Selection Streaming ─────────────────────────────────────────────

figma.on('selectionchange', () => {
    // Send raw selection change to UI thread, which handles throttling
    figma.ui.postMessage({ type: 'selection-change-triggered' });
});


// ─── UTILS ───────────────────────────────────────────────────────────

function simplifyNode(node, depth = 0) {
    const obj = {
        id: node.id,
        name: node.name,
        type: node.type,
    };

    try {
        if ('layoutMode' in node && node.layoutMode !== 'NONE') {
            obj.autoLayout = {
                mode: node.layoutMode,
                padding: {
                    top: node.paddingTop,
                    right: node.paddingRight,
                    bottom: node.paddingBottom,
                    left: node.paddingLeft
                },
                spacing: node.itemSpacing,
                align: {
                    primary: node.primaryAxisAlignItems,
                    counter: node.counterAxisAlignItems
                },
                distribute: node.primaryAxisSizingMode
            };
        }

        if (depth === 0 && 'children' in node) {
            obj.children = node.children.slice(0, 10).map(c => ({
                id: c.id,
                name: c.name,
                type: c.type
            }));
            if (node.children.length > 10) obj.childCount = node.children.length;
        }

        if ('fillStyleId' in node && node.fillStyleId) obj.fillStyleId = node.fillStyleId;
        if ('strokeStyleId' in node && node.strokeStyleId) obj.strokeStyleId = node.strokeStyleId;
        if ('textStyleId' in node && node.textStyleId) obj.textStyleId = node.textStyleId;
        if ('effectStyleId' in node && node.effectStyleId) obj.effectStyleId = node.effectStyleId;

        if ('variableBindings' in node) {
            obj.variableBindings = node.variableBindings;
        }

        if (node.type === 'INSTANCE' && 'componentProperties' in node) {
            obj.componentProperties = node.componentProperties;
        }

        if (node.type === 'TEXT') {
            obj.characters = node.characters;
            obj.typography = {
                fontSize: node.fontSize,
                fontWeight: node.fontWeight,
                fontName: node.fontName,
                letterSpacing: node.letterSpacing,
                lineHeight: node.lineHeight
            };
        }

        if ('cornerRadius' in node) obj.cornerRadius = node.cornerRadius;
        if ('cornerSmoothing' in node) obj.cornerSmoothing = node.cornerSmoothing;

        if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
            obj.hasFill = true;
            obj.fills = node.fills.map(paint => {
                if (paint.type === 'SOLID') {
                    const { r, g, b } = paint.color;
                    const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0').toUpperCase();
                    return {
                        type: 'SOLID',
                        hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
                        opacity: typeof paint.opacity === 'number' ? paint.opacity : 1
                    };
                }
                return { type: paint.type };
            });
        }

        if ('absoluteBoundingBox' in node) {
            obj.bounds = node.absoluteBoundingBox;
        }

        if ('constraints' in node) {
            obj.constraints = node.constraints;
        }
        if (depth === 0) {
            const allText = extractText(node);
            if (allText.length > 0) {
                obj.extractedText = allText.substring(0, 10000);
                obj.hasTextContent = true;
            }

            const media = extractMedia(node);
            if (media.images.length > 0) obj.extractedImages = media.images;
            if (media.videos.length > 0) obj.extractedVideos = media.videos;
            if (media.links.length > 0) obj.extractedLinks = media.links;
        }
    } catch (e) {
        // Silently fail for protected properties
    }

    return obj;
}

function extractMedia(node) {
    const media = { images: [], videos: [], links: [] };

    if ('fills' in node && Array.isArray(node.fills)) {
        for (const paint of node.fills) {
            if (paint.type === 'IMAGE') {
                media.images.push({ id: node.id, name: node.name, paintId: paint.imageHash });
            }
            if (paint.type === 'VIDEO') {
                media.videos.push({ id: node.id, name: node.name, paintId: paint.videoHash });
            }
        }
    }

    // @ts-ignore
    if (node.hyperlink && node.hyperlink.type === 'URL') {
        // @ts-ignore
        media.links.push({ id: node.id, url: node.hyperlink.value });
    }

    if ('children' in node) {
        for (const child of node.children) {
            const childMedia = extractMedia(child);
            media.images.push(...childMedia.images);
            media.videos.push(...childMedia.videos);
            media.links.push(...childMedia.links);
        }
    }

    return media;
}

function extractText(node) {
    let text = '';
    if (node.type === 'TEXT') {
        text += node.characters + '\n';
    }
    if ('children' in node) {
        for (const child of node.children) {
            text += extractText(child);
        }
    }
    return text;
}
