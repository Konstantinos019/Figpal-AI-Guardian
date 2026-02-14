// modules/core/vfs.js
// Virtual File System for FigPal
// Handles Browser File System Access API + IndexedDB Persistence
// Exports: FigPal.vfs = { pickFolder, restore, search, getFile, listFiles }

(function () {
    'use strict';

    const FP = window.FigPal;
    const DB_NAME = 'FigPal_VFS';
    const STORE_NAME = 'handles';
    const KEY_ROOT = 'project_root';

    // ─── STATE ───────────────────────────────────────────────────────────
    let rootHandle = null;
    let fileCache = new Map(); // path -> content
    let isScanning = false;

    // ─── INDEXED DB HELPERS ──────────────────────────────────────────────
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(STORE_NAME);
            };
        });
    }

    async function saveHandle(handle) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(handle, KEY_ROOT);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function loadHandle() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(KEY_ROOT);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    // ─── CORE LOGIC ──────────────────────────────────────────────────────

    /**
     * Trigger browser directory picker
     */
    async function pickFolder() {
        try {
            rootHandle = await window.showDirectoryPicker({
                id: 'figpal-project-root',
                mode: 'read'
            });

            await saveHandle(rootHandle);
            await scanProject();
            return { success: true, name: rootHandle.name };
        } catch (e) {
            console.error('VFS: Pick cancelled or failed', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Restore from DB (Requires user gesture usually)
     */
    async function restore() {
        try {
            const handle = await loadHandle();
            if (!handle) return { success: false, reason: 'no_handle' };

            // Verify permissions
            const opts = { mode: 'read' };
            if ((await handle.queryPermission(opts)) === 'granted') {
                rootHandle = handle;
                scanProject(); // Background scan
                return { success: true, name: handle.name, status: 'granted' };
            }

            // Need verification
            if ((await handle.requestPermission(opts)) === 'granted') {
                rootHandle = handle;
                scanProject();
                return { success: true, name: handle.name, status: 'granted' };
            }

            return { success: false, reason: 'denied', name: handle.name };
        } catch (e) {
            console.error('VFS: Restore failed', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Recursively scan directory and load text files into memory
     */
    async function scanProject() {
        if (!rootHandle) return;
        if (isScanning) return;

        isScanning = true;
        fileCache.clear();
        FP.chat.addMessage(`📂 **Scanning ${rootHandle.name}...**`, 'bot');

        let count = 0;
        const MAX_FILES = 2000;
        const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.ds_store']);
        const TEXT_EXTS = new Set([
            'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md', 'txt', 'svg', 'xml', 'yml', 'yaml', 'py', 'rb', 'go', 'java', 'c', 'cpp', 'h'
        ]);

        async function walk(dirHandle, path = '') {
            if (count > MAX_FILES) return;

            for await (const entry of dirHandle.values()) {
                if (count > MAX_FILES) break;

                const relativePath = path ? `${path}/${entry.name}` : entry.name;

                if (entry.kind === 'directory') {
                    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
                    await walk(entry, relativePath);
                } else if (entry.kind === 'file') {
                    const ext = entry.name.split('.').pop().toLowerCase();
                    if (TEXT_EXTS.has(ext)) {
                        try {
                            const file = await entry.getFile();
                            if (file.size < 1024 * 500) { // Skip > 500KB
                                const text = await file.text();
                                fileCache.set(relativePath, text);
                                count++;
                            }
                        } catch (e) {
                            console.warn(`VFS: Failed to read ${relativePath}`, e);
                        }
                    }
                }
            }
        }

        try {
            await walk(rootHandle);
            FP.chat.addMessage(`✅ **Scan Complete**\nLoaded ${count} files into memory.\nI can now answer questions about your code!`, 'bot');
        } catch (e) {
            FP.chat.addMessage(`❌ **Scan Failed**\n${e.message}`, 'bot');
        } finally {
            isScanning = false;
        }
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────

    function getFile(path) {
        return fileCache.get(path) || null;
    }

    function search(query) {
        if (!query) return [];
        const results = [];
        const q = query.toLowerCase();

        for (const [path, content] of fileCache.entries()) {
            if (path.toLowerCase().includes(q)) {
                results.push({ path, score: 10 }); // higher score for filename match
            }
        }
        return results.slice(0, 20); // Top 20
    }

    function listFiles() {
        return Array.from(fileCache.keys());
    }

    function getContextSummary() {
        const files = listFiles();
        if (files.length === 0) return null;

        const sample = files.slice(0, 10).join(', ');
        return `Files Loaded: ${files.length}\nSample: ${sample}${files.length > 10 ? '...' : ''}`;
    }

    // Export using namespace
    FP.vfs = {
        pickFolder,
        restore,
        getFile,
        search,
        listFiles,
        getContextSummary,
        get isScanning() { return isScanning; },
        get rootName() { return rootHandle ? rootHandle.name : null }
    };

    // Auto-attempt restore on load
    setTimeout(async () => {
        const handle = await loadHandle();
        if (handle) {
            FP.chat.addMessage(
                `📁 **Found Previous Project: ${handle.name}**\n` +
                `Click the button below to verify access and reload it.`,
                'bot'
            );
            // We can't auto-restore permissions without gesture usually, 
            // so we wait for user to click a "Verify" button or run /connect again.
            // Actually, let's inject a specialized pill for this.
            const msgDiv = document.querySelector('.figpal-chat-content');
            if (msgDiv) {
                const btn = document.createElement('button');
                btn.className = 'figpal-quick-action-btn';
                btn.textContent = `🔓 Verify Access to "${handle.name}"`;
                btn.onclick = () => FP.vfs.restore();
                // This assumes a quick actions container exists or we append it.
                // Ideally we use FP.chat.addMessage with actions, but let's stick to the flow.
            }
        }
    }, 1000);

    console.log('FigPal: VFS Module Loaded');
})();
