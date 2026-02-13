// plugin/code.js
// Figma Plugin Backend
figma.showUI(__html__, { width: 240, height: 80, title: "FigPal Guardian Bridge" });

figma.ui.onmessage = async (msg) => {
    // msg structure: { pluginMessage: { type, id, data } }
    const { type, id, data } = msg;

    if (type === 'get-selection') {
        const selection = figma.currentPage.selection;
        console.log(`FigPal: Processing selection (${selection.length} nodes requested)`);

        // Slice the root selection too! Only take top 50 nodes.
        // This prevents hangs on "Select All" actions.
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
        const selection = figma.currentPage.selection;

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

    if (type === 'close') {
        figma.closePlugin();
    }
};

// ─── Selection Streaming ─────────────────────────────────────────────

figma.on('selectionchange', () => {
    // Send raw selection change to UI thread, which handles throttling
    figma.ui.postMessage({ type: 'selection-change-triggered' });
});


/**
 * Simplifies a Figma node for transmission.
 * EXTREMELY AGGRESSIVE: No children by default unless depth=0. 
 * This prevents the "load the whole page" lag.
 */
function simplifyNode(node, depth = 0) {
    const obj = {
        id: node.id,
        name: node.name,
        type: node.type,
    };

    try {
        // ─── Auto Layout ───
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
                distribute: node.primaryAxisSizingMode // FIXED, HUG, FILL
            };
        }

        // Only take immediate children for the root selection, and capped at 10.
        // This avoids deep page-crawling which hangs the UI.
        if (depth === 0 && 'children' in node) {
            obj.children = node.children.slice(0, 10).map(c => ({
                id: c.id,
                name: c.name,
                type: c.type
            }));
            if (node.children.length > 10) obj.childCount = node.children.length;
        }

        // ─── Design Tokens (Styles & Variables) ───
        if ('fillStyleId' in node && node.fillStyleId) obj.fillStyleId = node.fillStyleId;
        if ('strokeStyleId' in node && node.strokeStyleId) obj.strokeStyleId = node.strokeStyleId;
        if ('textStyleId' in node && node.textStyleId) obj.textStyleId = node.textStyleId;
        if ('effectStyleId' in node && node.effectStyleId) obj.effectStyleId = node.effectStyleId;

        // NEW: Variable Bindings (Figma's modern tokens)
        if ('variableBindings' in node) {
            obj.variableBindings = node.variableBindings;
        }

        // ─── Component Properties (Props & Variants) ───
        if (node.type === 'INSTANCE' && 'componentProperties' in node) {
            obj.componentProperties = node.componentProperties;
        }

        // ─── Typography (for Text Nodes) ───
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

        // ─── Visuals ───
        if ('cornerRadius' in node) obj.cornerRadius = node.cornerRadius;
        if ('cornerSmoothing' in node) obj.cornerSmoothing = node.cornerSmoothing;

        // ─── Fills & Colors ───
        if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
            obj.hasFill = true;
            // Extract hex colors for solid fills so the AI can "see"
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

        // ─── Responsiveness ───
        if ('constraints' in node) {
            obj.constraints = node.constraints; // {horizontal: "MIN"|"CENTER"|..., vertical: ...}
        }
        if (depth === 0) {
            // ─── Content Extraction (Text) ───
            const allText = extractText(node);
            if (allText.length > 0) {
                obj.extractedText = allText.substring(0, 10000); // Limit to 10k chars
                obj.hasTextContent = true;
            }

            // ─── Media Extraction (Images, Videos, Links) ───
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

/**
 * recursively extracts media definitions
 */
function extractMedia(node) {
    const media = { images: [], videos: [], links: [] };

    // 1. Check for Fills (Images/Videos)
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

    // 2. Check for Hyperlinks (Text nodes or explicit property)
    // Note: Figma's API for links varies. checking generic property + text content.
    // 'hyperlink' property exists on nodes in newer API versions
    // @ts-ignore
    if (node.hyperlink && node.hyperlink.type === 'URL') {
        // @ts-ignore
        media.links.push({ id: node.id, url: node.hyperlink.value });
    }

    // 3. Recurse
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

/**
 * Recursively extracts text from a node and its children.
 * @param {SceneNode} node 
 * @returns {string}
 */
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
