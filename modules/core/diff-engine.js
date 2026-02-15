/**
 * FigPal Diff Engine
 * 
 * Responsible for comparing Figma nodes against:
 * 1. Previous versions (Drift Detection)
 * 2. Code standards (Linting) - Future
 * 3. External assets - Future
 */

const DiffEngine = {
    /**
     * Compare a node against a baseline snapshot
     * @param {Object} currentNode - The live Figma node object
     * @param {Object} baseline - The saved snapshot of the node
     * @returns {Array} - List of differences found
     */
    compare(currentNode, baseline) {
        if (!currentNode || !baseline) return [];

        const diffs = [];
        const nodeId = currentNode.id;
        const nodeName = currentNode.name;

        // 1. Check Metadata
        if (currentNode.name !== baseline.name) {
            diffs.push({
                type: 'meta',
                property: 'name',
                oldValue: baseline.name,
                newValue: currentNode.name,
                message: `Name changed from "${baseline.name}" to "${currentNode.name}"`
            });
        }

        // 2. Check Geometry (Round to 2 decimal places to avoid float precision issues)
        const round = (num) => Math.round(num * 100) / 100;

        if (round(currentNode.width) !== round(baseline.width)) {
            diffs.push({
                type: 'geometry',
                property: 'width',
                oldValue: baseline.width,
                newValue: currentNode.width,
                message: `Width changed: ${round(baseline.width)} -> ${round(currentNode.width)}`
            });
        }

        if (round(currentNode.height) !== round(baseline.height)) {
            diffs.push({
                type: 'geometry',
                property: 'height',
                oldValue: baseline.height,
                newValue: currentNode.height,
                message: `Height changed: ${round(baseline.height)} -> ${round(currentNode.height)}`
            });
        }

        if (round(currentNode.x) !== round(baseline.x)) {
            diffs.push({
                type: 'geometry',
                property: 'x',
                oldValue: baseline.x,
                newValue: currentNode.x,
                message: `X Position changed: ${round(baseline.x)} -> ${round(currentNode.x)}`
            });
        }

        if (round(currentNode.y) !== round(baseline.y)) {
            diffs.push({
                type: 'geometry',
                property: 'y',
                oldValue: baseline.y,
                newValue: currentNode.y,
                message: `Y Position changed: ${round(baseline.y)} -> ${round(currentNode.y)}`
            });
        }

        // 3. Check Visuals (Fills)
        // Simple check: compare length and hex values of the first fill
        // Deep comparison would require iterating all fills
        if (JSON.stringify(currentNode.fills) !== JSON.stringify(baseline.fills)) {
            diffs.push({
                type: 'style',
                property: 'fills',
                oldValue: '...',
                newValue: '...',
                message: `Fill/Color style has changed.`
            });
        }

        // 4. Check Visuals (Strokes)
        if (JSON.stringify(currentNode.strokes) !== JSON.stringify(baseline.strokes)) {
            diffs.push({
                type: 'style',
                property: 'strokes',
                oldValue: '...',
                newValue: '...',
                message: `Stroke/Border style has changed.`
            });
        }

        if (currentNode.strokeWeight !== baseline.strokeWeight) {
            diffs.push({
                type: 'style',
                property: 'strokeWeight',
                oldValue: baseline.strokeWeight,
                newValue: currentNode.strokeWeight,
                message: `Border width changed: ${baseline.strokeWeight} -> ${currentNode.strokeWeight}`
            });
        }

        // 5. Check Content (Text)
        if (currentNode.type === 'TEXT' && baseline.type === 'TEXT') {
            if (currentNode.characters !== baseline.characters) {
                diffs.push({
                    type: 'content',
                    property: 'characters',
                    oldValue: baseline.characters,
                    newValue: currentNode.characters,
                    message: `Text content changed.`
                });
            }
        }

        return diffs;
    },

    /**
     * Create a snapshot of a node to use as a baseline
     * @param {Object} node - Figma node
     * @returns {Object} - Serializable snapshot
     */
    createSnapshot(node) {
        if (!node) return null;

        // We only extract properties we care about tracking
        // This avoids circular references and massive objects
        const snapshot = {
            id: node.id,
            name: node.name,
            type: node.type,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            visible: node.visible,
            opacity: node.opacity,
            fills: node.fills ? JSON.parse(JSON.stringify(node.fills)) : [],
            strokes: node.strokes ? JSON.parse(JSON.stringify(node.strokes)) : [],
            strokeWeight: node.strokeWeight,
            effects: node.effects ? JSON.parse(JSON.stringify(node.effects)) : []
        };

        if (node.type === 'TEXT') {
            snapshot.characters = node.characters;
        }

        return snapshot;
    }
};

// Export for usage
if (typeof window !== 'undefined') {
    window.DiffEngine = DiffEngine;
}
