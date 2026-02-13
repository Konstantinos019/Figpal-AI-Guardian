// modules/ai/tracker.js
// Tracks AI usage locally to estimate quota consumption.
// Exports: FigPal.tracker = { trackRequest, getUsage, formatUsageMarkdown }
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Constants ───────────────────────────────────────────────────────
    // Based on Google AI Studio Free Tier (Gemini 1.5 Flash / Pro)
    // Adjust as needed or make configurable.
    const LIMITS = {
        RPM: 15,          // Requests per minute
        TPM: 1000000,     // Tokens per minute (conservative estimate)
        RPD: 1500         // Requests per day
    };

    // Storage Keys
    const KEY_USAGE = 'figpal_ai_usage';

    // ─── State ───────────────────────────────────────────────────────────
    let usageState = {
        lastResetMinute: Date.now(),
        lastResetDay: Date.now(),
        rpm: 0,
        tpm: 0,
        rpd: 0
    };

    // Load from storage immediately
    chrome.storage.local.get([KEY_USAGE], (result) => {
        if (result[KEY_USAGE]) {
            usageState = result[KEY_USAGE];
            checkResets(); // Check if time passed while closed
        }
    });

    // ─── Helper: Save State ──────────────────────────────────────────────
    function saveState() {
        chrome.storage.local.set({ [KEY_USAGE]: usageState });
    }

    // ─── Helper: Check & Reset Counters ──────────────────────────────────
    function checkResets() {
        const now = Date.now();
        let changed = false;

        // 1. Minute Reset (RPM / TPM)
        if (now - usageState.lastResetMinute > 60000) {
            usageState.rpm = 0;
            usageState.tpm = 0;
            usageState.lastResetMinute = now;
            changed = true;
        }

        // 2. Daily Reset (RPD)
        // Simple 24h check, or could be calendar day. using 24h rolling for simplicity.
        // Google uses "midnight Pacific time", but rolling 24h is a safe local approximation.
        // Actually, let's try to be closer to "Calendar Day" by just checking date string.
        const lastDate = new Date(usageState.lastResetDay).toDateString();
        const currDate = new Date(now).toDateString();

        if (lastDate !== currDate) {
            usageState.rpd = 0;
            usageState.lastResetDay = now;
            changed = true;
        }

        if (changed) saveState();
    }

    // ─── Public: Track Request ───────────────────────────────────────────
    // Should be called ideally *before* request to fail fast, or *after* to record.
    // We'll call it *after* a successful (or attempted) fetch to verify usage.
    function trackRequest(tokenCount = 0) {
        checkResets();

        usageState.rpm++;
        usageState.rpd++;
        usageState.tpm += tokenCount;

        saveState();

        // Emit for UI updates if we want reactive UI later
        if (FP.emit) FP.emit('usage-updated', getUsage());
    }

    // ─── Public: Get Usage Stats ─────────────────────────────────────────
    function getUsage() {
        checkResets();
        return {
            rpm: usageState.rpm,
            tpm: usageState.tpm,
            rpd: usageState.rpd,
            limits: LIMITS
        };
    }

    // ─── Public: Format Markdown ─────────────────────────────────────────
    function formatUsageMarkdown(title = "Usage Stats") {
        const stats = getUsage();
        const limits = stats.limits;

        // Calculate percentages for colors (optional, but keep simple MD for now)
        return `### ${title}
| Metric | Used | Limit |
| :--- | :--- | :--- |
| **RPM (Min)** | ${stats.rpm} | ${limits.RPM} |
| **TPM (Tokens)** | ${formatNumber(stats.tpm)} | ${formatNumber(limits.TPM)} |
| **RPD (Day)** | ${stats.rpd} | ${limits.RPD} |

*Estimates based on local tracking.*
`;
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.tracker = {
        trackRequest,
        getUsage,
        formatUsageMarkdown,
        LIMITS
    };

    // Alias at FP.ai.tracker if FP.ai exists, otherwise wait
    if (FP.ai) {
        FP.ai.tracker = FP.tracker;
    } else {
        // Simple polling wait if loaded out of order
        const checkAI = setInterval(() => {
            if (FP.ai) {
                FP.ai.tracker = FP.tracker;
                clearInterval(checkAI);
            }
        }, 100);
    }

    console.log('FigPal: Usage tracker initialized.');

})();
