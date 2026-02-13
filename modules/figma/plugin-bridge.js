// modules/figma/plugin-bridge.js
// Handles communication with the companion Figma Plugin.
(function () {
    'use strict';
    const FP = window.FigPal;

    const bridge = {
        isConnected: false,
        pluginWindow: null, // Store reference to talk back
        pendingRequests: new Map(),
        requestId: 0,

        init() {
            window.addEventListener('message', (event) => {
                const msg = event.data;
                if (!msg || msg.source !== 'figpal-plugin') return;

                // Auto-connect if we see a valid message from the plugin
                if (!this.isConnected) {
                    this.isConnected = true;
                    console.log('FigPal Bridge: Connection recovered via traffic 🔌');
                    FP.emit('plugin-status', { connected: true });
                }

                // Capture the plugin's window reference to send messages back
                if (event.source && event.source !== window && !this.pluginWindow) {
                    this.pluginWindow = event.source;
                    console.log('FigPal Bridge: Latched onto plugin source.');
                }

                if (msg.type === 'plugin-ready') {
                    this.isConnected = true;
                    console.log('FigPal Bridge: Plugin signaled ready.');
                    this.sendHandshake();
                    FP.emit('plugin-status', { connected: true });
                } else if (msg.type === 'response') {
                    const resolve = this.pendingRequests.get(msg.id);
                    if (resolve) {
                        resolve(msg.data);
                        this.pendingRequests.delete(msg.id);
                    }
                } else if (msg.type === 'selection-changed') {
                    const selectionData = msg.data;
                    const nodes = selectionData.nodes || (Array.isArray(selectionData) ? selectionData : []);
                    FP.state.pluginSelection = nodes;
                    FP.state.selectionImage = selectionData.image || null;

                    // Sync the global selection ID for write operations
                    if (nodes.length > 0 && nodes[0].id) {
                        FP.state.selectedNodeId = nodes[0].id;
                    }

                    console.log('FigPal Bridge: Captured selection change', nodes.length, 'nodes');

                    FP.emit('selection-updated', selectionData);
                }
            });

            // Proactive handshake attempt
            setInterval(() => {
                if (!this.isConnected) {
                    this.sendHandshake();
                }
            }, 3000);

            console.log('FigPal: Plugin bridge initialized.');
        },

        sendHandshake() {
            this.sendToPlugin({
                source: 'figpal-extension',
                type: 'handshake-ack'
            });
        },

        sendToPlugin(msg) {
            // Priority 1: Direct reference if we already established connection
            if (this.pluginWindow) {
                this.pluginWindow.postMessage(msg, '*');
                return;
            }

            // Priority 2: Deep search for all iframes (Figma scrolls/nests iframes)
            const allIframes = this.findAllIframes(document);
            allIframes.forEach(iframe => {
                try { iframe.contentWindow.postMessage(msg, '*'); } catch (e) { }
            });

            // Priority 3: Global broadcast fallback
            window.postMessage(msg, '*');
        },

        findAllIframes(root, depth = 0) {
            if (depth > 5) return []; // Stop runaway recursion
            let results = Array.from(root.querySelectorAll('iframe'));

            // Check Shadow DOMs (Figma uses them)
            const all = root.querySelectorAll('*');
            for (const el of all) {
                if (el.shadowRoot) {
                    results = results.concat(this.findAllIframes(el.shadowRoot, depth + 1));
                }
            }

            // Recursively search into accessible same-origin iframes
            results.forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        results = results.concat(this.findAllIframes(iframe.contentDocument, depth + 1));
                    }
                } catch (e) { }
            });

            return results;
        },

        request(type, data = {}) {
            const id = ++this.requestId;
            return new Promise((resolve) => {
                this.pendingRequests.set(id, resolve);

                this.sendToPlugin({ source: 'figpal-extension', type, id, data });

                setTimeout(() => {
                    if (this.pendingRequests.has(id)) {
                        this.pendingRequests.delete(id);
                        resolve(null);
                    }
                }, 3000);
            });
        },

        async getSelection() {
            if (!this.isConnected) return null;
            const response = await this.request('get-selection');
            return response?.nodes || null;
        },

        async notify(message) {
            return this.request('notify', { message });
        },

        async updateNode(nodeId, updates) {
            if (!this.isConnected) return { success: false, error: 'Plugin not connected' };
            return this.request('update-node', { nodeId, updates });
        }
    };

    bridge.init();
    FP.pluginBridge = bridge;
})();
