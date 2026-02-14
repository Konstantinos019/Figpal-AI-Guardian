# FigPal Technical Architecture & Audit

**Date:** 2026-02-14
**Version:** 1.0 (Post-Builder Update)

## 1. Executive Summary
FigPal is a hybrid Chrome Extension + Figma Plugin system. It injects a companion interface directly into the Figma browser/desktop app (`desktop-inject.js`) while maintaining a bridge to a headless Figma Plugin (`plugin/code.js`) for context awareness and canvas manipulation.

- **Status:** Stable
- **Core Strategy:** "Extension Brain" (AI logic in extension) + "Plugin Hands" (Context/Execution in plugin).
- **Recent Major Update:** Integrated "FigPal Builder" for customizable characters and unified the AI pathway.

---

## 2. Component Analysis

### A. Frontend Extension (The "Body")
**Role:** Renders the UI, manages the character, and handles user interaction.
- **Entry Point:** `desktop-inject.js` (Orchestrator) - Injects the shadow DOM into the Figma UI.
- **Key Modules:**
    - `modules/ui/panel.js`: **[HIGH COMPLEXITY]** Manages the FigPal Builder UI, tab switching, and state persistence.
    - `modules/character/sprite.js`: **[CRITICAL]** Generates the SVG character. Now supports layered composition (Base + Face + Accessory) and dynamic coloring.
    - `modules/character/physics.js`: Handles the "follow" logic and improved S-curve movement.
    - `styles.css`: Contains all styling, including the new token-based design system for the Builder.

**Audit Status:**
- ✅ **Strengths:** Robust sprite system, high-fidelity UI, persistent state (`chrome.storage.local`).
- ⚠️ **Watchlist (panel.js Complexity):**
    - **Current State:** `panel.js` (~500 lines) currently handles *rendering* HTML, *listening* for DOM events, and *managing* character state all in one file.
    - **Risk:** As we add more tabs or features, this file will become unmaintainable ("Spaghetti Code").
    - **Recommendation:** Split into `ui-renderer.js` (View), `state-manager.js` (Model), and `event-handlers.js` (Controller) to separate concerns.

### B. Backend Agent (The "Brain")
**Role:** Handles AI processing, prompt engineering, and chat flow.
- **Location:** **Extension Environment (Browser Context)**.
    - *Clarification:* The "Brain" is not a remote server we own. It is JavaScript code running locally in the user's Chrome browser (`modules/chat/` & `modules/ai/`).
    - It acts as an **Agent** by orchestrating calls to external LLM APIs (Gemini/OpenAI) and deciding when to use the "Hands" (Plugin).
- **Key Modules:**
    - `modules/chat/flow.js`: **[CRITICAL]** The central nervous system. Routes messages, triggers "Thinking" states, and decides between Plugin interactions (Action) vs. Pure Chat. **Recently refactored to unify AI calls to the extension.**
    - `modules/ai/client.js`: Handles API calls to Gemini/OpenAI/Claude. Contains the `sendToAI` logic and the "Extension Brain" fetch implementation.
    - `modules/ai/system-prompt.js`: dynamically builds the system prompt based on connected context.

**Audit Status:**
- ✅ **Strengths:** Unified pathway prevents timeouts. Multi-provider support is extensible.
- ⚠️ **Watchlist:** Hardcoded API keys in `state` (currently memory-only) need careful handling if persistence is added.

### C. Figma Plugin (The "Hands")
**Role:** Accesses the Figma canvas, reads selection, and applies changes.
- **Entry Point:** `plugin/code.js` (Figma Sandbox) & `plugin/ui.html` (Plugin UI).
- **Key Modules:**
    - `modules/figma/plugin-bridge.js`: Manages the `postMessage` communication between the customized Extension UI and the headless Plugin iframe.
    - `modules/figma/data.js`: Helper for formatting Figma node data for the AI.

**Audit Status:**
- ✅ **Strengths:** "Headless" operation feels magical to the user.
- ⚠️ **Watchlist:** The `simplifyNode` function in `plugin/code.js` needs to be kept in sync with AI context limits to avoid token overflows.

### D. Core & Infrastructure
**Role:** Loots everything together.
- `manifest.json`: Defines permissions and web-accessible resources. **Recently updated** to expose all asset paths for the Builder.
- `modules/core/injector.js`: Handles the initial injection into the DOM.

---

## 3. Data Flow

### 1. The "Thinking" Loop (Revised)
1. **User** types in chat (`flow.js`).
2. **Extension** checks `pluginBridge` for connection.
3. **Bridge** asks Plugin for `selection` data.
4. **Plugin** returns simplified JSON of selected nodes.
5. **Extension** constructs prompt (`system-prompt.js` + context).
6. **Extension** calls AI Provider directly (`client.js` -> `fetch`).
7. **AI** responds with text + markdown.

### 2. The "Action" Loop (FIX Actions)
1. **AI** suggests a fix button (e.g., `[Button:FIX:RENAME|NewName]`).
2. **User** clicks button (`renderer.js`).
3. **Extension** parses action and sends message via `pluginBridge`.
4. **Plugin** (`code.js`) receives message and executes Figma API call (e.g., `figma.currentPage.selection[0].name = ...`).
5. **Plugin** reports success/failure back to Extension.

---


## 4. Component & Function Reference

### A. Frontend Agent (The "Body")

#### `modules/ui/panel.js` (Panel & Builder)
*   `initPanel()`: Creates the floating UI, injects CSS styles, and initializes event listeners.
*   `renderTabs()`: Manages switching between Home, Builder, Changes, and Documentation views.
*   `renderBuilder()`: The core of the customization UI.
    *   `renderCategorySelector()`: Switching between Object/Animal/Food/Figma types.
    *   `renderColorPicker(colors)`: Generates clickable color swatches.
    *   `renderAccessorySelector()`: Handles the carousel logic for accessories.
*   `saveCurrentPal()`: Persists the current configuration to `chrome.storage.local` and triggers a follower updates.

#### `modules/character/sprite.js` (The Artist)
*   `getSprite(type)`: Facade function that delegates to complex assemblers.
*   `assemble(base, face, color, accessory)`: **[CORE LOGIC]** dynamically constructs the SVG string.
    *   Calculates `viewBox` centering.
    *   Injects CSS variables for dynamic coloring (`var(--pal-color)`).
    *   Layers accessories based on z-index (e.g., "Top" vs. "Bottom").

#### `modules/character/physics.js` (The Mover)
*   `updatePosition(targetX, targetY)`: Calculates the follower's next position using a double-lerp S-curve for smooth movement.
*   `setThinking(isThinking)`: Toggles the "Lightbulb" accessory state on the follower.

### B. Backend Agent (The "Brain")

#### `modules/chat/flow.js` (The Orchestrator)
*   `handleUserMessage(text)`: The main entry point.
    1.  Checks `commands.tryHandle(text)` for slash commands.
    2.  Calls `pluginBridge.getSelection()` for context.
    3.  Calls `ai.buildPrompt()` with context.
    4.  Calls `ai.sendToAI()` for the response.
    5.  Renders the result.

#### `modules/ai/client.js` (The Messenger)
*   `sendToAI(prompt)`: Supports multi-provider switching (Gemini, OpenAI, Claude, Grok).
    *   **Unified Extension Brain**: Always executes the `fetch` call here.
    *   **Error Handling**: Catches 429s (Quota) and 401s (Auth) and returns user-friendly markdown.

#### `modules/ai/system-prompt.js` (The Architect)
*   `buildPrompt(userText, context, history)`: Assembles the final prompt string.
    *   Injects the `SYSTEM_PROMPT` (Personality & Rules).
    *   Appends `JSON.stringify(context)` for Figma awareness.
    *   Appends chat history for conversation continuity.

### C. Figma Plugin (The "Hands")

#### `modules/figma/plugin-bridge.js` (The Translator)
*   `request(type, data)`: Generic async wrapper for `postMessage` calls to the plugin iframe.
*   `getSelection()`: Returns a simplified JSON of selected nodes.
*   `updateNode(nodeId, updates)`: Sends a `FIX` command to the plugin.

#### `plugin/code.js` (The Worker)
*   `simplifyNode(node)`: **[CRITICAL]** Recursively converts Figma's heavy node objects into lightweight JSON for the AI.
    *   Extracts: Name, ID, Type, Text Content, Fills.
    *   Limits: Depth (to prevent cycles) and child count (to prevent huge payloads).
*   `executeTool(name, args)`: The execution engine for "Actions".
    *   `rename_node`: Appliers names.
    *   `change_fill_color`: Converts Hex to RGB and applies fills.
    *   `create_rectangle`: Spawns primitives.

## 5. Future Recommendations

1.  **Type Safety:** The project is written in vanilla JS (ES6 modules). As complexity grows, migrating to **TypeScript** or adding JSDoc types would prevent regression errors (like the recent `const` reassignment).
2.  **State Management:** Currently, state is scattered across `FP.state` and module-level variables. A centralized store (like a lightweight Redux or Signal implementation) would make debugging easier.
3.  **Test Suite:** We lack automated tests for the Bridge. A mock Figma environment for testing `plugin-bridge.js` would effectively guard against connection regressions.
4.  **Plugin Context Optimization**: `simplifyNode` should be optimized to token-count limits to ensure we don't overflow the context window on large selections.
