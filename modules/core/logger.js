// modules/core/logger.js
// Buffers console logs captured from the Figma Plugin for debugging and AI context.
(function () {
    'use strict';
    const FP = window.FigPal;

    const logger = {
        logs: [],
        MAX_LOGS: 100,

        init() {
            FP.on('plugin-console', (msg) => {
                this.addLog(msg);
            });
            console.log('FigPal: Console Logger initialized and listening. 📝');
        },

        addLog(msg) {
            const { level, message, args, timestamp } = msg;
            this.logs.push({
                level,
                message,
                args,
                timestamp: timestamp || Date.now()
            });

            // Maintain circular buffer
            if (this.logs.length > this.MAX_LOGS) {
                this.logs.shift();
            }
        },

        getRecentLogs(count = 20) {
            return this.logs.slice(-count);
        },

        clear() {
            this.logs = [];
        },

        formatLogs(count = 10) {
            const recent = this.getRecentLogs(count);
            if (recent.length === 0) return "No recent plugin logs.";

            return recent.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
            }).join('\n');
        }
    };

    logger.init();
    FP.logger = logger;
})();
