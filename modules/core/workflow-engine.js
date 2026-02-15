// modules/core/workflow-engine.js
// Dynamic workflow loading and execution engine
// Exports: FigPal.workflows = { list, get, execute, create, update, delete, import, export }

(function () {
    'use strict';

    const FP = window.FigPal;

    const DB_NAME = 'FigPal_Workflows';
    const STORE_NAME = 'workflows';

    // ─── INDEXED DB HELPERS ──────────────────────────────────────────────
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
                    store.createIndex('tags', 'tags', { multiEntry: true });
                    store.createIndex('category', 'category', { unique: false });
                }
            };
        });
    }

    // ─── YAML PARSER (Simple) ────────────────────────────────────────────
    function parseYAML(yamlStr) {
        const result = {};
        const lines = yamlStr.split('\n');
        let currentKey = null;
        let currentArray = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Array item
            if (trimmed.startsWith('- ')) {
                if (currentArray) {
                    currentArray.push(trimmed.substring(2).trim());
                }
                continue;
            }

            // Key-value pair
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();

                if (value === '') {
                    // Start of array or object
                    currentKey = key;
                    currentArray = [];
                    result[key] = currentArray;
                } else if (value === 'true') {
                    result[key] = true;
                } else if (value === 'false') {
                    result[key] = false;
                } else if (!isNaN(value)) {
                    result[key] = Number(value);
                } else {
                    result[key] = value;
                }
            }
        }

        return result;
    }

    // ─── WORKFLOW PARSER ─────────────────────────────────────────────────
    function parseWorkflow(markdown) {
        // Extract frontmatter
        const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            throw new Error('Workflow must have YAML frontmatter');
        }

        const frontmatter = parseYAML(frontmatterMatch[1]);
        const content = markdown.substring(frontmatterMatch[0].length).trim();

        // Parse steps from markdown
        const steps = [];
        const stepMatches = content.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm);

        let currentStep = null;
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const stepMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);

            if (stepMatch) {
                if (currentStep) {
                    steps.push(currentStep);
                }
                currentStep = {
                    number: parseInt(stepMatch[1]),
                    name: stepMatch[2].trim(),
                    actions: [],
                    turbo: false
                };
            } else if (currentStep) {
                const trimmed = line.trim();
                if (trimmed === '// turbo') {
                    currentStep.turbo = true;
                } else if (trimmed.startsWith('- ')) {
                    currentStep.actions.push(trimmed.substring(2).trim());
                }
            }
        }

        if (currentStep) {
            steps.push(currentStep);
        }

        return {
            ...frontmatter,
            steps
        };
    }

    // ─── WORKFLOW EXECUTION ──────────────────────────────────────────────
    async function executeWorkflow(workflow, inputs = {}) {
        // Only log if chat is ready
        if (FP.chat && FP.chat.addMessage) {
            FP.chat.addMessage(`🔄 **Executing Workflow: ${workflow.name}**\n\nStarting...`, 'bot');
        }

        const context = {
            inputs,
            outputs: {},
            figmaSelection: FP.state.pluginSelection || [],
            vfsConnected: !!(FP.vfs && FP.vfs.rootName)
        };

        for (const step of workflow.steps) {
            if (FP.chat && FP.chat.addMessage) {
                FP.chat.addMessage(`**Step ${step.number}: ${step.name}**`, 'bot');
            }

            for (const action of step.actions) {
                try {
                    await executeAction(action, context);
                } catch (err) {
                    if (FP.chat && FP.chat.addMessage) {
                        FP.chat.addMessage(`❌ **Error in step ${step.number}:** ${err.message}`, 'bot');
                    }
                    return { success: false, error: err.message, step: step.number };
                }
            }
        }

        if (FP.chat && FP.chat.addMessage) {
            FP.chat.addMessage(`✅ **Workflow Complete!**`, 'bot');
        }
        return { success: true, outputs: context.outputs };
    }

    async function executeAction(action, context) {
        // Variable interpolation
        const interpolated = action.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context.inputs[key] || context.outputs[key] || match;
        });

        // Parse action type
        if (interpolated.startsWith('Get Figma selection')) {
            if (FP.pluginBridge && FP.pluginBridge.isConnected) {
                context.outputs.figmaSelection = await FP.pluginBridge.getSelection();
            } else {
                throw new Error('Plugin bridge not connected');
            }
        } else if (interpolated.startsWith('Search VFS for')) {
            const match = interpolated.match(/Search VFS for (.+)/);
            if (match && FP.vfs) {
                const query = match[1].trim();
                context.outputs.vfsResults = FP.vfs.search(query);
            }
        } else if (interpolated.startsWith('Load component code')) {
            // Placeholder for loading code
            context.outputs.componentCode = '// Code loaded';
        } else if (interpolated.startsWith('Extract Figma properties')) {
            // Placeholder for property extraction
            context.outputs.figmaProps = {};
        } else if (interpolated.startsWith('Parse component props')) {
            // Placeholder for code parsing
            context.outputs.codeProps = {};
        } else if (interpolated.startsWith('Generate comparison table')) {
            // Placeholder for comparison
            context.outputs.comparisonTable = '| Property | Figma | Code |\n|---|---|---|\n';
        } else if (interpolated.startsWith('Create markdown report')) {
            // Placeholder for report generation
            context.outputs.report = '# Audit Report\n\nReport content...';
        }

        // Default: treat as AI prompt
        if (!context.outputs.report) {
            // Could trigger AI here for complex actions
        }
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────

    async function list() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function get(name) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(name);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function create(definition) {
        const workflow = typeof definition === 'string'
            ? parseWorkflow(definition)
            : definition;

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(workflow);
            request.onsuccess = () => resolve(workflow);
            request.onerror = () => reject(request.error);
        });
    }

    async function update(name, definition) {
        const workflow = typeof definition === 'string'
            ? parseWorkflow(definition)
            : definition;

        workflow.name = name; // Ensure name matches

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(workflow);
            request.onsuccess = () => resolve(workflow);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteWorkflow(name) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(name);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function importWorkflow(file) {
        const text = await file.text();
        return await create(text);
    }

    async function exportWorkflow(name) {
        const workflow = await get(name);
        if (!workflow) throw new Error('Workflow not found');

        // Convert back to markdown format
        let markdown = `---\n`;
        markdown += `name: ${workflow.name}\n`;
        markdown += `description: ${workflow.description}\n`;
        if (workflow.version) markdown += `version: ${workflow.version}\n`;
        if (workflow.tags) markdown += `tags: [${workflow.tags.join(', ')}]\n`;
        markdown += `---\n\n`;

        markdown += `# Steps\n\n`;
        for (const step of workflow.steps) {
            markdown += `## ${step.number}. ${step.name}\n`;
            if (step.turbo) markdown += `// turbo\n`;
            for (const action of step.actions) {
                markdown += `- ${action}\n`;
            }
            markdown += `\n`;
        }

        return new Blob([markdown], { type: 'text/markdown' });
    }

    // ─── EXPORT ──────────────────────────────────────────────────────────
    FP.workflows = {
        list,
        get,
        execute: executeWorkflow,
        create,
        update,
        delete: deleteWorkflow,
        import: importWorkflow,
        export: exportWorkflow
    };

    console.log('FigPal: Workflow Engine Loaded');
})();
