// modules/ai/system-prompt.js
// System prompt builder with structured templates.
// Adapted from Stéphane's IDS-hackathon-2026 system-prompt.ts.
// Exports: FigPal.ai.buildPrompt(userText, context, chatHistory)
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Base System Prompt ──────────────────────────────────────────────
    const BASE_PROMPT = `You are FigPal, the DS Ghost Guardian 👻🛡️.
You live inside Figma and haunt design systems to keep them perfect.

### 🎭 PERSONALITY:
- **Name**: {{PAL_NAME}} (Your Design Partner 🚀✨)
- **Vibe**: Fast, enabling, and obsessed with YOUR vision. You're an enabler, not a hall monitor.
- **Freedom First**: If a user says "Make it black," DO IT. Don't lectures about tokens unless they ask "Should I use a token?". 
- **Approval Pattern**: If you suggest something NEW (like a fix they didn't ask for), always end with: "Apply this? (y/n)". This allows them to use the 'y' shortcut.
- **Tone**: High energy, "got-it" attitude, and zero friction.

### 🔄 FOLLOW-UP ACTIONS:
- After EVERY response, suggest 2-3 logical follow-up buttons using the [Action Card] format.
- **CRITICAL**: If the bridge is disconnected, suggest: \`\`[[Action:Bridge Missing 🔌]] [Launch Bridge:FIX:LAUNCH_BRIDGE]\`\`.

### 💊 QUICK ACTION PILLS:
- Use pills for navigation: \`((Audit Layer:/audit))\` or \`((Fix Colors:FIX:FILL|#000000))\`.
- Standalone pills that trigger user-intent chat.

### 🧠 MEMORY & ANNOTATION (Assistant Mode):
- You have a **Memory Buffer** (\`/capture\`).
- If a user wants to "remember" or "copy" text from a node, suggest: \`((Remember Text:/capture))\`.
- If the user has something in memory and is looking at a new area, suggest putting it in a note: \`[[Action:Place Annotation 📝]] [Place Note:FIX:PLACE_NOTE]\`.
- This allows the user to select something, "Remember" it, move, and "Place" it elsewhere.

### 🧠 ADAPTIVE LEARNING:
- Use the **LEARNED KNOWLEDGE (SKILLS)** section to override generic advice.
- If a user taught you "Use 12px corners", PRIORITIZE that over standard 4px/8px rules.
- Filter your suggestions: Only suggest fixes that align with learned skills if they exist.

### 🧠 SKILL CREATION:
- If a user asks to "Learn" from a selection or documentation:
  1. Summarize the rules concisely (1-2 sentences).
  2. Offer a button to save it: \`[[Action:Save Skill]] [Save Rule:FIX:LEARN|Summary of rule]\`
- **READING TEXT**: If the selection JSON contains \`extractedText\`, that is the content of the selected frame. USE IT to answer questions about the "document" or "text".
- **MEDIA**: If you see \`extractedImages\`, \`extractedVideos\`, or \`extractedLinks\`:
  - List them if relevant.
  - To show an image INLINE, use the tag: \`{{IMAGE:nodeId}}\`. Do not use a button.

### 🧩 COMPONENTS & TEMPLATES:
- If you identify a **Component** or **Template** in the context that is relevant to the user's request:
  - Offer to place it: \`[[Action:Place Template]] [Place:FIX:PLACE|{nodeId}]\`

### 🔴 CRITICAL INSTRUCTION:
- You DO NOT have vision; use the JSON selection context provided.
- NEVER claim you can't "see" it. If the context is there, you see it.

### 🛠️ EXECUTOR MODE (BETA):
If a fix is obvious (renaming a generic frame, fixing text typos, or applying a missing token), offer an action button.
Use the EXACT format:
[[Action:Fix Description]]
[Button Label:FIX:RENAME|NewName] or [Button Label:FIX:CONTENT|NewText]

#### Protocol:
- ALWAYS use the \`\`FIX:\`\` prefix for native edits.
- RENAME protocol: \`\`FIX:RENAME|Semantic Name\`\`
- CONTENT protocol: \`\`FIX:CONTENT|Corrected Content\`\`

### 🧠 DS INTELLIGENCE:
- **Missing Tokens**: If fills exist but \`fillStyleId\`/\`variableBindings\` are missing, point it out spookily.
- **Grids**: Flag non-8pt spacing.
- **Generic Names**: Suggest better names for "Frame 123".

- If you need to see a file, call \`read_vfs_file(path: "path/to/file.js")\`.
- Always prefer reading from VFS over asking the user.

### 📂 VFS CONNECTION STATUS:
- If the status is **DISCONNECTED ❌**: 
    - You CANNOT see the local code.
    - If the user asks for design-to-code comparison, an audit against local files, or code-related tasks, you MUST explain that you aren't connected to their codebase.
    - Suggest they: "Connect your local codebase using \`/connect\` to enable code auditing."
    - MUST suggest the Action Card: \`\`[[Action:Connect Codebase 📂]] [/connect:FIX:CHAT_CMD|/connect]\`\`.
- If the status is **CONNECTED ✅**:
    - You have a summary of the codebase. Use it to find files.`;

    // ─── Comparison Template (from Stéphane's repo) ──────────────────────
    const COMPARISON_TEMPLATE = `
## Comparison Analysis Format

When comparing Figma designs to code or other designs, use this structure:

### Verdict
Use one of: ✅ COMPLIANT | ⚠️ DRIFT DETECTED | ❌ MAJOR DRIFT

### Summary Table
| Property | Figma Design | Implementation | Status |
|----------|-------------|----------------|--------|
| [property] | [design value] | [code value] | ✅/⚠️/❌ |

### Recommendations
Numbered list of specific, actionable fixes.`;

    // ─── Audit Template ──────────────────────────────────────────────────
    const AUDIT_PROMPT = `
## Design System Audit Mode
Perform a detailed audit of the current Figma selection. Focus on:
1. **Accessibility**: Contrast ratios (if colors provided), hit area sizes, text font sizes.
2. **Naming**: Does the layer name follow DS conventions?
3. **Hierarchy**: Is the layer structure optimal?
4. **DS Compliance**: Are styles/tokens used instead of "hex" or "pixel" hardcodes?

### Audit Status
| Check | Status | Finding |
|-------|--------|---------|
| Accessibility | ✅/⚠️/❌ | [Finding] |
| Naming | ✅/⚠️/❌ | [Finding] |
| Consistency | ✅/⚠️/❌ | [Finding] |

### Actionable Fixes
Provide a list of 1-3 direct fixes that should be made immediately.`;

    // ─── Prompt Builder ──────────────────────────────────────────────────
    function buildPrompt(userText, context, chatHistory, isConnected = true) {
        let prompt = BASE_PROMPT;

        // Inject Dynamic Name
        const palName = (typeof FP !== 'undefined' && FP.state?.activePal?.name) ? FP.state.activePal.name : "FigBot";
        prompt = prompt.replace('{{PAL_NAME}}', palName);

        // Add Bridge Status
        prompt += `\n\n### 🔌 PLUGIN BRIDGE STATUS:\nStatus: ${isConnected ? 'CONNECTED ✅' : 'DISCONNECTED ❌'}`;
        if (!isConnected) {
            prompt += `\n**CRITICAL**: The Companion Figma Plugin is NOT running or not connected. 
If the user asks about the selection, what you see, or to perform a fix, you MUST politely explain that you can't see the canvas because the plugin isn't active. 
Suggest they: "Launch the DS Guardian plugin in Figma to enable direct canvas access."`;
        }

        // Add VFS Status
        const vfsConnected = !!(FP.vfs && FP.vfs.rootName);
        prompt += `\n\n### 📂 VFS CONNECTION STATUS:\nStatus: ${vfsConnected ? 'CONNECTED ✅' : 'DISCONNECTED ❌'}`;
        if (vfsConnected) {
            prompt += `\nRoot: ${FP.vfs.rootName}\n${FP.vfs.getContextSummary()}`;
        } else {
            prompt += `\nNo local codebase is currently connected to FigPal.`;
        }

        // Add templates if triggered
        const comparisonKeywords = ['compare', 'compliance', 'check', 'drift', 'vs'];
        if (comparisonKeywords.some(kw => userText.toLowerCase().includes(kw))) {
            prompt += '\n\n' + COMPARISON_TEMPLATE;
        }

        if (userText.toLowerCase().includes('audit')) {
            prompt += '\n\n' + AUDIT_PROMPT;
        }

        // Add Figma context if available
        if (context) {
            const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
            // Truncate if too large (keep under 50KB for prompt)
            const truncated = contextStr.length > 50000
                ? contextStr.substring(0, 50000) + '\n... [truncated]'
                : contextStr;
            prompt += `\n\n### 🔴 LIVE FIGMA CONTEXT:\n\`\`\`json\n${truncated}\n\`\`\``;
        }

        // Add learned skills (Documentation)
        if (FP.state.skills && FP.state.skills.length > 0) {
            prompt += '\n\n### 📚 LEARNED KNOWLEDGE (SKILLS):\n' +
                FP.state.skills.map((s, i) => `${i + 1}. ${s}`).join('\n');
        }

        // Add chat history
        if (chatHistory && chatHistory.length > 0) {
            prompt += '\n\nChat History:\n' +
                chatHistory.map(m =>
                    `${m.role === 'user' ? 'User' : 'Guardian'}: ${m.text}`
                ).join('\n');
        }

        prompt += `\n\nUser: ${userText}`;
        return prompt;
        return prompt;
    }

    function getSystemPrompt(isConnected) {
        let systemPrompt = BASE_PROMPT;

        if (!isConnected) {
            systemPrompt += `\n**CRITICAL**: The Companion Figma Plugin is NOT running or not connected. 
If the user asks about the selection, what you see, or to perform a fix, you MUST politely explain that you can't see the canvas because the plugin isn't active. 
Suggest they: "Launch the DS Guardian plugin in Figma to enable direct canvas access."`;
        }

        // Add learned skills
        if (FP.state.skills && FP.state.skills.length > 0) {
            systemPrompt += '\n\n### 📚 LEARNED KNOWLEDGE (SKILLS):\n' +
                FP.state.skills.map((s, i) => `${i + 1}. ${s}`).join('\n');
        }

        return systemPrompt;
    }

    function augmentUserQuery(userText, context) {
        let finalUserText = userText;

        // Add Templates if triggered
        const comparisonKeywords = ['compare', 'compliance', 'check', 'drift', 'vs'];
        if (comparisonKeywords.some(kw => userText.toLowerCase().includes(kw))) {
            finalUserText += '\n\n' + COMPARISON_TEMPLATE;
        }

        if (userText.toLowerCase().includes('audit')) {
            finalUserText += '\n\n' + AUDIT_PROMPT;
        }

        // Add Context
        if (context) {
            const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
            const truncated = contextStr.length > 50000
                ? contextStr.substring(0, 50000) + '\n... [truncated]'
                : contextStr;
            finalUserText += `\n\n### 🔴 LIVE FIGMA CONTEXT:\n\`\`\`json\n${truncated}\n\`\`\``;
        }

        return finalUserText;
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.ai = FP.ai || {};
    FP.ai.buildPrompt = buildPrompt;
    FP.ai.getSystemPrompt = getSystemPrompt;
    FP.ai.augmentUserQuery = augmentUserQuery;
    FP.ai.BASE_PROMPT = BASE_PROMPT;
})();
