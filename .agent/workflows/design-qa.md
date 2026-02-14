---
description: Design QA / Audit Workflow
---

# Design QA Workflow

This workflow guides the **DS Guardian** to audit Figma components against the local codebase using the Virtual File System (VFS).

## 1. Context Acquisition
- **Figma:** The agent automatically receives the selected node's properties (name, type, auto-layout, fills, etc.) via the Plugin Bridge.
- **Code:** The agent MUST use the VFS to find the corresponding code.

## 2. Locate Code Component
The agent should search the VFS for a file matching the Figma component's name.

**Instruction:**
1.  Identify the component name from Figma selection (e.g., `Primary Button`).
2.  Convert to likely filenames (e.g., `Button.tsx`, `button.component.ts`, `Button/index.js`).
3.  **Action:** Use VFS to search/read.
    - *Agent Thought:* "I need to find the code for 'Button'."
    - *Agent Action:* Call `FP.vfs.search('Button')` or simply ask "Read Button.tsx".
    - *System:* Returns file content from VFS memory.

## 3. Comparison Logic (Exhaustive)
Once both Figma props and Code content are available:

### EXHAUSTIVE COMPARISON RULE — MANDATORY
When comparing properties, you MUST be **exhaustive**.
- **ALL PROPS + TYPES + DEFAULTS** = table rows. No truncate.
- List **ALL** properties found on both sides.
- Do NOT skip, summarize, or group.

### Verdict Categories
- ✅ **COMPLIANT**: Exact match.
- ⚠️ **DRIFT DETECTED**: Minor difference (e.g., spacing 8px vs 10px).
- ❌ **MISMATCH**: Major difference (e.g., missing prop, wrong color hex).
- ❓ **MISSING**: Property exists in one but not the other.

## 4. Response Template

**🧩 Component: `<ComponentName>`**

| | Source |
|---|---|
| **Figma** | Selected Node |
| **Code** | `<File Path from VFS>` |

**Verdict:** [COMPLIANT / DRIFT / MISMATCH]

**Summary of differences:**
- ...

#### 1. Props / Properties
| Property | Figma Value | Code Value | Status |
| :--- | :--- | :--- | :--- |
| `color` | `#0D99FF` | `blue-500` | ✅ |
| `radius` | `8px` | `4px` | ⚠️ Drift |
...

#### 2. Recommendations
1. Update Figma to match code?
2. Or create a GitHub issue to update code?
