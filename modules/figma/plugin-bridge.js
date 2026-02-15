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
        lastScanTime: 0,
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
                } else if (msg.type === 'response' || msg.type === 'EXECUTE_CODE_RESULT') {
                    // Match request ID (plugin uses requestId, we used to use id)
                    const reqId = msg.requestId || msg.id;
                    const resolve = this.pendingRequests.get(reqId);
                    if (resolve) {
                        if (msg.type === 'EXECUTE_CODE_RESULT') {
                            resolve(msg.success ? { success: true, result: msg.result, analysis: msg.resultAnalysis } : { success: false, error: msg.error });
                        } else {
                            resolve(msg.data);
                        }
                        this.pendingRequests.delete(reqId);
                    }
                } else if (msg.type === 'selection-changed') {
                    // ... (rest is same)
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
                } else if (msg.type === 'CONSOLE_CAPTURE') {
                    // Forward plugin console to extension console for debugging
                    const { level = 'log', message, args = [], timestamp } = msg;
                    const safeLevel = (typeof console[level] === 'function') ? level : 'log';
                    const prefix = `[Figma Plugin ${safeLevel.toUpperCase()}]`;
                    console[safeLevel](prefix, message, ...args);
                    FP.emit('plugin-console', msg);
                } else if (msg.type === 'VARIABLES_DATA') {
                    console.log('FigPal Bridge: Received Design Tokens (variables)');
                    FP.state.designTokens = msg.data;
                    FP.emit('tokens-updated', msg.data);

                    // Resolve any pending request
                    const reqId = msg.requestId || msg.id;
                    if (reqId && this.pendingRequests.has(reqId)) {
                        this.pendingRequests.get(reqId)(msg.data);
                        this.pendingRequests.delete(reqId);
                    }
                }
            });

            // ... (init loop remains same)

            // Proactive handshake attempt & Heartbeat check
            setInterval(() => {
                const now = Date.now();

                // 1. Handshake if not connected
                // Throttle the heavy DOM scan to every 5s if disconnected
                if (!this.isConnected) {
                    if (now - this.lastScanTime > 5000) {
                        this.sendHandshake();
                        this.lastScanTime = now;
                    }
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
            }, 1000); // Check faster (1s) for responsive status, but throttle scan

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
            // Throttle this scan if possible, but here we just execute.
            // The throttling happens in the init loop.
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
            const requestId = ++this.requestId;
            return new Promise((resolve) => {
                this.pendingRequests.set(requestId, resolve);

                // Send 'requestId' to match MCP plugin expectations
                this.sendToPlugin({ source: 'figpal-extension', type, requestId, id: requestId, data });

                setTimeout(() => {
                    if (this.pendingRequests.has(requestId)) {
                        this.pendingRequests.delete(requestId);
                        resolve({ error: 'Request timed out' });
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

        async createChild(parentId, nodeType, properties = {}) {
            if (!this.isConnected) return { success: false, error: 'Plugin not connected' };
            return this.request('CREATE_CHILD_NODE', { parentId, nodeType, properties });
        },

        sendCredentials(credentials) {
            // credentials: { apiKey, provider, model }
            this.sendToPlugin({
                source: 'figpal-extension',
                type: 'set-credentials',
                data: credentials
            });
        },

        async execute(code, timeout = 5000) {
            if (!this.isConnected) return { success: false, error: 'Plugin not connected' };
            const requestId = ++this.requestId;
            return new Promise((resolve) => {
                this.pendingRequests.set(requestId, resolve);
                this.sendToPlugin({
                    source: 'figpal-extension',
                    type: 'EXECUTE_CODE',
                    requestId,   // Important: standard used by MCP plugin
                    id: requestId, // Legacy fallback
                    code,
                    timeout
                });

                setTimeout(() => {
                    if (this.pendingRequests.has(requestId)) {
                        this.pendingRequests.delete(requestId);
                        resolve({ success: false, error: 'Execution timed out' });
                    }
                }, timeout + 500);
            });
        },

        async getDesignTokens(refresh = false) {
            if (!this.isConnected) return null;
            if (!refresh && FP.state.designTokens) return FP.state.designTokens;
            return this.request('GET_VARIABLES');
        }
    };

    bridge.init();
    FP.pluginBridge = bridge;
})();
