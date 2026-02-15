/*
 * FigPal Slack Integration
 * 
 * Enables team notifications and collaboration via Slack API.
 * Supports Webhooks (write-only) and Bot Tokens (read/write).
 */

(function () {
    const Slack = {
        config: {
            webhookUrl: null, // Legacy / Simple output
            botToken: null,   // For reading history & advanced writing
            channel: null,
            username: "FigPal AI"
        },

        /*
         * Initialize Slack module
         */
        async init() {
            // Load config from storage
            const stored = await FP.storage.get('slack_config');
            if (stored) {
                this.config = { ...this.config, ...stored };
            }
            const mode = this.config.botToken ? "Bot API" : (this.config.webhookUrl ? "Webhook" : "Disconnected");
            console.log(`💬 Slack Integration Loaded (${mode})`);
        },

        /*
         * Configure Slack Connection
         * Supports both Webhook URL (string starting with https) or Bot Token (xoxb-...)
         */
        async connect(credentials, channel = null) {
            if (credentials.startsWith('xoxb-')) {
                this.config.botToken = credentials;
                this.config.webhookUrl = null; // Prefer token if provided
            } else if (credentials.startsWith('https://')) {
                this.config.webhookUrl = credentials;
                // Keep existing token if any? usually exclusive for simplicity
            } else {
                return "❌ Invalid credentials. Provide a Webhook URL (https://...) or Bot Token (xoxb-...)";
            }

            if (channel) this.config.channel = channel;

            await FP.storage.set('slack_config', this.config);
            return `✅ Slack connected via ${this.config.botToken ? 'Bot Token' : 'Webhook'} to ${channel || 'default channel'}`;
        },

        /*
         * Send a message to Slack
         */
        async send(text, attachments = []) {
            // 1. Try Bot API (Preferred)
            if (this.config.botToken && this.config.channel) {
                try {
                    const response = await fetch('https://slack.com/api/chat.postMessage', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.config.botToken}`
                        },
                        body: JSON.stringify({
                            channel: this.config.channel,
                            text: text,
                            attachments: attachments
                        })
                    });
                    const data = await response.json();
                    return data.ok;
                } catch (e) {
                    console.error("Slack API Send Failed:", e);
                }
            }

            // 2. Fallback to Webhook
            if (this.config.webhookUrl) {
                try {
                    const payload = {
                        text: text,
                        username: this.config.username,
                        icon_emoji: ":shield:",
                        channel: this.config.channel,
                        attachments: attachments
                    };
                    const response = await fetch(this.config.webhookUrl, {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    return response.ok;
                } catch (e) {
                    console.error("Slack Webhook Failed:", e);
                    return false;
                }
            }

            console.warn("Slack not configured");
            return false;
        },

        /*
         * Read Channel History (Requires Bot Token)
         */
        async history(count = 5) {
            if (!this.config.botToken) {
                return "❌ Reading history requires a Bot Token (xoxb-...). Current connection is Webhook-only.";
            }

            if (!this.config.channel) {
                return "❌ No channel configured. Please set a channel ID (e.g., C12345).";
            }

            try {
                // If channel is a name (#general), we need to resolve it to ID usually.
                // But chat.postMessage works with names, conversations.history MUST have ID.
                // We'll try to use the configured channel as ID. 
                // A robust implementation would resolve name->id list, but for now expect ID if token used.

                const response = await fetch(`https://slack.com/api/conversations.history?channel=${this.config.channel}&limit=${count}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.config.botToken}`
                    }
                });

                const data = await response.json();
                if (!data.ok) {
                    return `❌ Slack API Error: ${data.error}`;
                }

                return data.messages.map(m => `[${new Date(m.ts * 1000).toLocaleTimeString()}] ${m.user}: ${m.text}`).join('\n');
            } catch (e) {
                console.error("Slack History Failed:", e);
                return `❌ Connection failed: ${e.message}`;
            }
        },

        /*
         * Send an audit report
         */
        async sendAudit(report) {
            const attachment = {
                color: "#ff9900", // Orange for warning, Green for pass
                title: "Design Audit Report",
                text: report,
                footer: "FigPal AI Guardian"
            };
            return await this.send("🛡️ **New Design Audit**", [attachment]);
        }
    };

    // Expose
    window.FP = window.FP || {};
    FP.slack = Slack;

    // Auto-init
    setTimeout(() => FP.slack.init(), 1000);

})();
