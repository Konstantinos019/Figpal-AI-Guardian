// modules/ai/system-prompt.js
// System prompt builder with structured templates.
// Adapted from Stéphane's IDS-hackathon-2026 system-prompt.ts.
// Exports: FigPal.ai.buildPrompt(userText, context, chatHistory)
(function () {
    'use strict';

    const FP = window.FigPal;

    // ─── Base System Prompt ──────────────────────────────────────────────
    const BASE_PROMPT = `You are DS AI Guardian (also known as FigPal), a specialized design system assistant.
You live inside Figma and help designers maintain consistency, quality, and best practices.

Your personality:
- Friendly and approachable, but technically precise
- You use design system terminology naturally
- You give actionable, specific feedback

Your capabilities:
- Analyze Figma layers, components, and styles
- Check design system compliance
- Suggest improvements for accessibility, consistency, and naming
- Compare designs against code implementations
- Help with layout, spacing, typography, and color decisions

Response format:
1. Use **bold** for key terms and [Component:Name] for Figma references.
2. Use tables for comparisons.
3. Use ✅ ⚠️ ❌ for compliance status.
4. Focus on design improvements.
5. When referring to layers/components, use: [Type:LayerName] (e.g., [Frame:Hero], [Component:Button]).
6. If you need user approval for an action, use this format:
   [[Action:Title of Action]]
   Short description of what you will do.
   [Button Label:EVENT_NAME]`;

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

    // ─── Prompt Builder ──────────────────────────────────────────────────
    function buildPrompt(userText, context, chatHistory) {
        let prompt = BASE_PROMPT;

        // Add comparison template if the user seems to be asking about compliance
        const comparisonKeywords = ['compare', 'compliance', 'check', 'audit', 'drift', 'vs'];
        if (comparisonKeywords.some(kw => userText.toLowerCase().includes(kw))) {
            prompt += '\n\n' + COMPARISON_TEMPLATE;
        }

        // Add Figma context if available
        if (context) {
            const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
            // Truncate if too large (keep under 50KB for prompt)
            const truncated = contextStr.length > 50000
                ? contextStr.substring(0, 50000) + '\n... [truncated]'
                : contextStr;
            prompt += `\n\nCurrent Figma Selection Context:\n\`\`\`json\n${truncated}\n\`\`\``;
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
    }

    // ─── Export ──────────────────────────────────────────────────────────
    FP.ai = FP.ai || {};
    FP.ai.buildPrompt = buildPrompt;
    FP.ai.BASE_PROMPT = BASE_PROMPT;
})();
