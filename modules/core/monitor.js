// modules/core/monitor.js
// Proactive design monitoring and drift detection
// Exports: FigPal.monitor = { start, stop, status, check }

(function () {
    'use strict';

    const FP = window.FigPal;

    // Configuration
    const CONFIG = {
        checkInterval: 5000, // Check every 5 seconds
        driftThreshold: 0.1, // 10% difference triggers alert
        autoStart: false     // Don't start automatically
    };

    // State
    let isRunning = false;
    let timer = null;
    let lastCheck = null;
    let baseline = null; // Snapshot of "correct" state
    let ignoredNodes = new Set();

    // ─── CORE MONITORING ─────────────────────────────────────────────────

    /**
     * Start the monitoring service
     */
    function start() {
        if (isRunning) return;

        isRunning = true;

        // Capture baseline of current selection if none exists
        if (!baseline && FP.selection && FP.selection.length > 0) {
            baseline = captureSnapshot(FP.selection);
            FP.chat.addMessage(`👀 **Monitoring Started**\nBaseline captured for ${FP.selection.length} nodes. I'll watch for changes.`, 'bot');
        } else {
            FP.chat.addMessage(`👀 **Monitoring Started**\nWaiting for selection to capture baseline...`, 'bot');
        }

        // Start polling
        timer = setInterval(checkContext, CONFIG.checkInterval);

        FP.emit('monitor:started');
    }

    /**
     * Stop the monitoring service
     */
    function stop() {
        if (!isRunning) return;

        isRunning = false;
        clearInterval(timer);
        timer = null;

        FP.chat.addMessage(`🛑 **Monitoring Stopped**`, 'bot');
        FP.emit('monitor:stopped');
    }

    /**
     * Get current status
     */
    function status() {
        return {
            isRunning,
            lastCheck,
            baselineNodes: baseline ? Object.keys(baseline).length : 0,
            ignoredNodes: ignoredNodes.size
        };
    }

    // ─── DETECTION LOGIC ─────────────────────────────────────────────────

    /**
     * Check current context for drift
     */
    async function checkContext() {
        if (!isRunning) return;

        lastCheck = Date.now();

        if (!baseline) return;

        // In a real plugin, we'd query the nodes by ID. 
        // For the extension context (prototype), we'll assume the selection IS the context for now
        // or check if the selected nodes are the ones we are monitoring.

        if (!FP.selection || FP.selection.length === 0) return;

        // Create a temporary snapshot of current state to compare against baseline
        const currentSnapshot = captureSnapshot(FP.selection);
        if (!currentSnapshot) return;

        const drifts = detectDrift(currentSnapshot, baseline);

        if (drifts.length > 0) {
            // Report Drift
            const driftCount = drifts.length;
            FP.chat.addMessage(
                `⚠️ **Drift Detected!** (${driftCount} changes)\n` +
                drifts.map(d => `- ${d.message}`).join('\n'),
                'bot'
            );

            // Emit event
            FP.emit('monitor:drift', drifts);
        }
    }

    /**
     * Capture a snapshot of nodes for baseline
     */
    /**
     * Capture a snapshot of nodes for baseline
     */
    function captureSnapshot(nodes) {
        if (!window.DiffEngine) {
            console.error('DiffEngine not loaded');
            return null;
        }

        const snapshot = {};
        nodes.forEach(node => {
            snapshot[node.id] = window.DiffEngine.createSnapshot(node);
        });
        return snapshot;
    }

    /**
     * Compare current state to baseline
     */
    /**
     * Compare current state to baseline
     */
    function detectDrift(current, baseline) {
        if (!window.DiffEngine) return [];

        let totalDrift = [];

        // Compare each node in the current selection against its baseline
        for (const [id, currentNode] of Object.entries(current)) {
            if (baseline[id]) {
                const nodeDrift = window.DiffEngine.compare(currentNode, baseline[id]);
                if (nodeDrift.length > 0) {
                    totalDrift = totalDrift.concat(nodeDrift.map(d => ({ ...d, nodeId: id })));
                }
            }
        }

        return totalDrift;
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────

    FP.monitor = {
        start,
        stop,
        status,
        check: checkContext
    };

    // Auto-start if config says so
    if (CONFIG.autoStart) {
        start();
    }

    console.log('👁️ FigPal Monitor Engine Loaded');

})();
