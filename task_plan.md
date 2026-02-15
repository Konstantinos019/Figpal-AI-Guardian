# Task Plan: Custom Avatar Audit & Refactor

## Goal
Resolve inconsistent deletion behavior and selection failures for custom user-uploaded avatars.

## Phases
- [ ] **Phase 1: Research & Audit** (current)
    - [ ] Audit `panel.js` for event listener leaks or missing wires.
    - [ ] Trace `currentPal` state mutations during upload/selection/delete.
    - [ ] Analyze storage sync logic for race conditions.
- [ ] **Phase 2: Pattern Analysis**
    - [ ] Compare custom bot handling vs. standard bots.
    - [ ] Identify discrepancies in registry updates.
- [ ] **Phase 3: Hypothesis & Minimal Testing**
    - [ ] Form hypothesis for delete inconsistency.
    - [ ] Form hypothesis for selection failures.
- [x] **Phase 4: Implementation (Refactor)**
    - [x] Create `FP.state.custom` namespace for shared state (Sprites, Types, Configs).
    - [x] Update `panel.js` to use `FP.state.custom` exclusively.
    - [x] Implement robust `onerror` fallback in `sprite.js`.
    - [x] Refactor `renderPreview` to avoid redundant overwrites and use delegation.
- [ ] **Phase 5: Verification** (current)
    - [ ] Manual test: Multiple uploads.
    - [ ] Manual test: Delete various bots in various orders.
    - [ ] Manual test: Persistence check after reload.

## Decisions
- Use event delegation for buttons in `renderPreview`.
- Centralize all custom bot logic in a dedicated helper or class if complexity warrants.
