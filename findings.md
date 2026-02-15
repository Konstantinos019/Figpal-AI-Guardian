# Southleft MCP Transplant - Feature Summary

Based on an audit of the Southleft MCP source code at [figma-console-mcp](file:///Users/kdimitropoulos/.gemini/antigravity/playground/tensor-granule/figma-console-mcp), here is what we are "getting" for the FigPal plugin:

### 1. Arbitrary Code Execution (`EXECUTE_CODE`)
- **What it is**: A "Power Tool" that allows the AI to send any JavaScript string to the plugin, which is then executed against the native Figma API using `eval` inside an `async IIFE`.
- **Why it matters**: It moves us beyond hardcoded tools. FigPal can now "write its own tools" on the fly to solve complex layout or design system tasks.

### 2. Variables & Tokens Engine
- **What it is**: Deep integration with Figma's Variables API.
- **Features**: 
    - Full list of local variables and collections.
    - Resolve aliases (mapping tokens to values).
    - Batch create/update/delete variables.
    - Support for multiple modes (Light/Dark themes).

### 3. Console Capture (Remote Debugging)
- **What it is**: Intercepts `console.log`, `info`, `warn`, and `error` in the plugin's sandbox and relays them via the Bridge.
- **Why it matters**: Allows the FigPal extension to "monitor" the plugin's health and see errors in the chat UI without the user needing to open Figma's DevTools.

### 4. Advanced "Simplify" Logic
- **What it is**: A much more robust node-to-json extraction logic.
- **Features**:
    - Recursion depth control.
    - Selection of specific properties (fills, strokes, effects, layout).
    - Lightweight metadata for large results (only IDs/Names/Types).

### 5. Design System Audit
- **What it is**: Logic to batch-scan the entire file for components and component sets.
- **Why it matters**: Enables the AI to "know" the entire design system manifest, not just what is currently selected.
