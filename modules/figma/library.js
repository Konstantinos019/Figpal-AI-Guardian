/*
 * FigPal Asset Library Bridge
 * 
 * Provides access to local and team library assets.
 * Allows the AI to search, preview, and instantiate components.
 */

(function () {
    const Library = {
        // Cache for component data
        cache: {
            components: [],
            lastUpdated: 0,
            TTL: 60000 // 1 minute
        },

        /*
         * Scan the current document for all available components.
         * Returns an array of simplified component objects.
         */
        async scan() {
            if (Date.now() - this.cache.lastUpdated < this.cache.TTL && this.cache.components.length > 0) {
                return this.cache.components;
            }

            // Find local components
            // Note: In non-UI context, we rely on pluginBridge to execute this in the main thread
            // But since this module is loaded in the UI context (iframe), we must ask the main thread.
            // However, this module structure implies it runs in the UI context and uses FP.pluginBridge.

            // We'll use FP.pluginBridge.execute to run the scan in the main thread
            // because `figma` global is not available here.

            const script = `
                const components = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
                return components.map(c => ({
                    id: c.id,
                    key: c.key,
                    name: c.name,
                    description: c.description || "",
                    type: c.type,
                    remote: c.remote
                }));
            `;

            try {
                const result = await FP.pluginBridge.execute(script);
                this.cache.components = result || [];
                this.cache.lastUpdated = Date.now();
                return this.cache.components;
            } catch (e) {
                console.error("Library scan failed:", e);
                return [];
            }
        },

        /*
         * Search for components by query string.
         */
        async search(query) {
            const all = await this.scan();
            if (!query) return all;

            const q = query.toLowerCase();
            return all.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q)
            );
        },

        /*
         * Instantiate a component by key or ID.
         */
        async instantiate(keyOrId, position = { x: 0, y: 0 }) {
            // Determine if it's a key (usually 32+ chars) or ID (usually "123:456")
            // Figma keys are alphanumeric, IDs have colons.

            const script = `
                const keyOrId = "${keyOrId}";
                let node;

                // Try by ID first (local)
                if (keyOrId.includes(':')) {
                    node = figma.getNodeById(keyOrId);
                }
                
                // If not found or it's a key, try import (async)
                if (!node) {
                    try {
                        // This imports the component (if remote) or finds it (if local)
                        // Note: importComponentByKeyAsync needs a catch block
                        node = await figma.importComponentByKeyAsync(keyOrId).catch(() => null);
                    } catch (e) { /* ignore */ }
                }

                if (node) {
                    const instance = node.createInstance();
                    instance.x = ${position.x};
                    instance.y = ${position.y};
                    
                    // Center in viewport if no position provided effectively? 
                    // For now, place at center of current view
                    const center = figma.viewport.center;
                    instance.x = center.x + ${position.x};
                    instance.y = center.y + ${position.y};

                    figma.currentPage.selection = [instance];
                    return { success: true, id: instance.id, name: instance.name };
                }
                
                return { success: false, error: "Component not found" };
            `;

            return await FP.pluginBridge.execute(script);
        },

        /*
         * Get usage stats (mock for now, or scan instances)
         */
        async getUsage(keyOrId) {
            // TODO: Implement instance counting scan
            return { count: 0 };
        }
    };

    // Expose
    window.FP = window.FP || {};
    FP.library = Library;

    console.log("📚 FigPal Asset Library Bridge Loaded");
})();
