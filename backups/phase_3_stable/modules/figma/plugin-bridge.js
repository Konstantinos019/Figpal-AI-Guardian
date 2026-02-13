// modules/figma/plugin-bridge.js
// Handles communication with the companion Figma Plugin.
(function () {
    'use strict';
    const FP = window.FigPal;

    const bridge = {
        isConnected: false,
        pluginWindow: null, // Store reference to talk back
        pendingRequests: new Map(),
        lastHeartbeat: 0,
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

                // Always update heartbeat on ANY valid message from plugin
                this.lastHeartbeat = Date.now();

                // Capture the plugin's window reference to send messages back
                if (event.source && event.source !== window && !this.pluginWindow) {
                    this.pluginWindow = event.source;
                    // Only log latching once to avoid spam
                    // console.log('FigPal Bridge: Latched onto plugin source.');
                }

                if (msg.type === 'pong') {
                    // Just a heartbeat response, logic above handled timestamp update
                    return;
                } else if (msg.type === 'plugin-ready') {
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
                } else if (msg.type === 'request-credentials') {
                    console.log('FigPal Bridge: Plugin requested credentials.');
                    FP.emit('credentials-requested');
                } else if (msg.type === 'auth-success') {
                    console.log('FigPal Bridge: Plugin authenticated.');
                    FP.emit('auth-success');
                }
            });

            // Proactive handshake attempt & Heartbeat check
            setInterval(() => {
                const now = Date.now();

                // 1. Handshake if not connected
                if (!this.isConnected) {
                    this.sendHandshake();
                }

                // 2. Heartbeat Check
                // If we were connected, but haven't heard from plugin in > 5s, assume disconnected
                if (this.isConnected && (now - this.lastHeartbeat > 5000)) {
                    console.warn('FigPal Bridge: Heartbeat lost (timeout). Marking disconnected.');
                    this.isConnected = false;
                    this.pluginWindow = null; // Reset reference
                    FP.emit('plugin-status', { connected: false });
                }

                // 3. Send Ping (if we think we are connected)
                if (this.isConnected) {
                    this.sendToPlugin({ source: 'figpal-extension', type: 'ping' });
                }
            }, 2000); // Run every 2s

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
            if (depth > 8) return []; // Increased depth for UI3
            let results = [];

            try {
                // Standard iframes
                results = Array.from(root.querySelectorAll('iframe'));

                // Shadow DOMs
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let node;
                while (node = walker.nextNode()) {
                    if (node.shadowRoot) {
                        results = results.concat(this.findAllIframes(node.shadowRoot, depth + 1));
                    }
                }
            } catch (e) {
                // Ignore DOM access errors
            }

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
                        resolve({ error: 'Request timed out' }); // Return error object instead of null for better debugging
                    }
                }, 30000); // 30s timeout for AI/Image ops
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
        },

        sendCredentials(credentials) {
            // credentials: { apiKey, provider, model }
            this.sendToPlugin({
                source: 'figpal-extension',
                type: 'set-credentials',
                data: credentials
            });
        }
    };

    bridge.init();
    FP.pluginBridge = bridge;
})();
