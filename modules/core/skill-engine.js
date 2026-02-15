// modules/core/skill-engine.js
// Structured skill management and execution
// Exports: FigPal.skills = { list, get, execute, create, update, delete, import, export, registerTrigger }

(function () {
    'use strict';

    const FP = window.FigPal;

    const DB_NAME = 'FigPal_Skills';
    const STORE_NAME = 'skills';

    // ─── INDEXED DB HELPERS ──────────────────────────────────────────────
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('tags', 'tags', { multiEntry: true });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // ─── SKILL EXECUTION ─────────────────────────────────────────────────
    async function executeSkill(skill, context = {}) {
        const fullContext = {
            selection: FP.state.pluginSelection || [],
            vfsConnected: !!(FP.vfs && FP.vfs.rootName),
            fileKey: FP.state.fileKey,
            ...context
        };

        if (skill.type === 'prompt') {
            // Render template with variables
            let prompt = skill.template;

            // Interpolate variables
            for (const [key, config] of Object.entries(skill.variables || {})) {
                const value = context[key] !== undefined ? context[key] : config.default;
                prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
            }

            // Send to AI
            FP.emit('user-message', { text: prompt });
            return { success: true, type: 'prompt', prompt };

        } else if (skill.type === 'function') {
            // Execute JavaScript function
            try {
                // Create isolated function context
                const func = new Function('context', skill.code + '\nreturn execute(context);');
                const result = await func(fullContext);
                return { success: true, type: 'function', result };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        return { success: false, error: 'Unknown skill type' };
    }

    // ─── SKILL VALIDATION ────────────────────────────────────────────────
    function validateSkill(skill) {
        if (!skill.id) throw new Error('Skill must have an id');
        if (!skill.name) throw new Error('Skill must have a name');
        if (!skill.type) throw new Error('Skill must have a type');
        if (!['prompt', 'function'].includes(skill.type)) {
            throw new Error('Skill type must be "prompt" or "function"');
        }
        if (skill.type === 'prompt' && !skill.template) {
            throw new Error('Prompt skills must have a template');
        }
        if (skill.type === 'function' && !skill.code) {
            throw new Error('Function skills must have code');
        }
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────

    async function list(filters = {}) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                let results = request.result;

                // Apply filters
                if (filters.category) {
                    results = results.filter(s => s.category === filters.category);
                }
                if (filters.type) {
                    results = results.filter(s => s.type === filters.type);
                }
                if (filters.tag) {
                    results = results.filter(s => s.tags && s.tags.includes(filters.tag));
                }

                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function get(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function create(skill) {
        validateSkill(skill);

        // Add metadata
        skill.createdAt = skill.createdAt || Date.now();
        skill.version = skill.version || '1.0.0';

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(skill);
            request.onsuccess = () => resolve(skill);
            request.onerror = () => reject(request.error);
        });
    }

    async function update(id, updates) {
        const existing = await get(id);
        if (!existing) throw new Error('Skill not found');

        const updated = { ...existing, ...updates, id }; // Preserve ID
        validateSkill(updated);

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(updated);
            request.onsuccess = () => resolve(updated);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteSkill(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function importSkill(file) {
        const text = await file.text();
        const skill = JSON.parse(text);
        return await create(skill);
    }

    async function exportSkill(id) {
        const skill = await get(id);
        if (!skill) throw new Error('Skill not found');

        const json = JSON.stringify(skill, null, 2);
        return new Blob([json], { type: 'application/json' });
    }

    // ─── LEGACY SKILL MIGRATION ──────────────────────────────────────────
    async function migrateLegacySkills() {
        const oldSkills = FP.state.skills || [];
        if (oldSkills.length === 0) return { migrated: 0 };

        let count = 0;
        for (let i = 0; i < oldSkills.length; i++) {
            const text = oldSkills[i];
            const skill = {
                id: `legacy-${Date.now()}-${i}`,
                name: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                type: 'prompt',
                category: 'legacy',
                tags: ['migrated'],
                description: text,
                template: text,
                variables: {},
                trigger: 'manual',
                createdAt: Date.now(),
                version: '1.0.0'
            };

            try {
                await create(skill);
                count++;
            } catch (err) {
                console.warn('Failed to migrate skill:', err);
            }
        }

        // Clear old skills
        FP.state.skills = [];
        chrome.storage.sync.set({ skills: [] });

        return { migrated: count };
    }

    // ─── AUTO-TRIGGER SYSTEM ─────────────────────────────────────────────
    const triggers = new Map(); // skillId -> trigger config

    function registerTrigger(skillId, trigger) {
        triggers.set(skillId, trigger);
    }

    function unregisterTrigger(skillId) {
        triggers.delete(skillId);
    }

    // Listen for selection changes
    FP.on('selection-changed', async (data) => {
        for (const [skillId, trigger] of triggers.entries()) {
            if (trigger.event === 'selection-change') {
                const skill = await get(skillId);
                if (!skill) continue;

                // Check conditions
                if (trigger.conditions) {
                    const selection = data.selection || [];
                    if (selection.length === 0) continue;

                    const node = selection[0];
                    if (trigger.conditions.nodeType && node.type !== trigger.conditions.nodeType) continue;
                    if (trigger.conditions.nodeName && !trigger.conditions.nodeName.test(node.name)) continue;
                }

                // Execute skill
                executeSkill(skill);
            }
        }
    });

    // ─── EXPORT ──────────────────────────────────────────────────────────
    FP.skills = {
        list,
        get,
        execute: executeSkill,
        create,
        update,
        delete: deleteSkill,
        import: importSkill,
        export: exportSkill,
        registerTrigger,
        unregisterTrigger,
        migrateLegacySkills
    };

    // Auto-migrate on load
    setTimeout(async () => {
        const oldSkills = FP.state.skills || [];
        if (oldSkills.length > 0 && typeof oldSkills[0] === 'string') {
            const result = await migrateLegacySkills();
            if (result.migrated > 0) {
                // Migration happens silently - user can check with /skill list
                console.log(`FigPal: Migrated ${result.migrated} legacy skills`);
            }
        }
    }, 2000);

    console.log('FigPal: Skill Engine Loaded');
})();
