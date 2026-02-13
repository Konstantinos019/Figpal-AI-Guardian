// modules/figma/data.js
// Figma node fetching (REST API) and tree simplification.
// Will be replaced by plugin-bridge.js when Figma Plugin is active.
// Exports: FigPal.figma = { fetchNode, simplify }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Fetch Node via REST API ─────────────────────────────────────────
    async function fetchNode(fileKey, nodeId, pat) {
        if (!fileKey || !nodeId || !pat) return null;
        try {
            const response = await fetch(
                `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`,
                { headers: { 'X-Figma-Token': pat } }
            );
            if (!response.ok) {
                console.error('FigPal Figma: API Error', response.status);
                return null;
            }
            const data = await response.json();
            return data.nodes[nodeId];
        } catch (e) {
            console.error('FigPal Figma: Network error', e);
            return null;
        }
    }

    // ─── Simplify Node Tree ──────────────────────────────────────────────
    function simplify(node) {
        if (!node) return null;

        const simplified = {
            id: node.id,
            name: node.name,
            type: node.type,
        };

        // Text content
        if (node.characters) simplified.text = node.characters;

        // Style properties (summarized)
        if (node.fills && node.fills.length > 0) simplified.hasFills = true;
        if (node.strokes && node.strokes.length > 0) simplified.hasStrokes = true;
        if (node.effects && node.effects.length > 0) simplified.hasEffects = true;

        // Layout properties
        if (node.layoutMode) simplified.layoutMode = node.layoutMode;
        if (node.primaryAxisSizingMode) simplified.primaryAxisSizingMode = node.primaryAxisSizingMode;
        if (node.counterAxisSizingMode) simplified.counterAxisSizingMode = node.counterAxisSizingMode;

        // Children recursion
        if (node.children) {
            simplified.childrenCount = node.children.length;
            simplified.children = node.children.map(simplify);
        }

        return simplified;
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.figma = FP.figma || {};
    FP.figma.fetchNode = fetchNode;
    FP.figma.simplify = simplify;
})();
