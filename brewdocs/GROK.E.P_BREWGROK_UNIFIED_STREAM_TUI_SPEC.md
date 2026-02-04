Project: grok-cli
Component: Blessed / Neo-Blessed TUI
Spec Version: v2.0 (Unified Stream TUI v2)
Authoritative Timestamp (UTC): 2026-02-02T18:14:00Z
Status: APPROVED FOR IMPLEMENTATION
Mode: STRICT (no alternate layouts, no optional UI paths)

1. PROBLEM STATEMENT (WHY THIS CHANGE)

The current split-screen (Chat | Work Log) architecture causes:

❌ Cognitive overload (eyes jump between panels)

❌ Duplicate rendering paths

❌ Scroll coupling bugs

❌ Formatting constraints (diffs, before/after, code blocks)

❌ Confirmation UX fragmentation

❌ "Grok says X, UI shows Y" trust erosion

Modern AI terminals have already solved this.

We are aligning BrewGrok with industry-proven design patterns.

2. DESIGN DECISION (LOCKED)
✅ SINGLE FULL-SCREEN STREAM

There will be ONE unified vertical stream.

No left/right split

No separate work log pane

No modal dialogs

No floating confirmation windows

Everything renders inline, chronologically, with rich formatting.

3. UNIFIED STREAM MENTAL MODEL

Think of the UI as a time-ordered execution transcript:

[User Message]
[Assistant Thought / Plan]
[Tool Execution Start]
[Tool Output / Diff / Files]
[Tool Completion]
[Assistant Summary]
[Next User Input]


This mirrors:

Gemini CLI

OpenCode CLI

Claude Code

GitHub Copilot CLI

4. STREAM BLOCK TYPES (REQUIRED)

Every line rendered must belong to exactly one block type.

4.1 USER BLOCK
👤 You  18:14:22
> add this to brewdocs as future updates

4.2 ASSISTANT NARRATIVE BLOCK

Human-readable reasoning and explanation.

🤖 BrewGrok  18:14:24
I'll add this as a new section in brewdocs and ensure it's tracked for future releases.


Rules:

No tool logs here

No timestamps per line (block-level only)

4.3 TOOL EXECUTION BLOCK (INLINE)

This replaces the old Work Log panel entirely.

🛠️ TOOL: update_todo_list   18:14:26
────────────────────────────────────
✓ Explored brewdocs/
✓ Found documentation structure
✓ Added future updates section
────────────────────────────────────


Rules:

Must be visually boxed or separated

Must not spill into assistant narrative text

Must be scrollable as part of the main stream

4.4 DIFF / FILE CHANGE BLOCK (MANDATORY FOR EDITS)

When files are modified, Grok must show the work inline.

4.4.1 Unified Inline Diff Format
📄 brewdocs/FUTURE_UPDATES.md
────────────────────────────────────
- Old content that will be removed
+ New content that replaces it
+ Additional enhancement notes
────────────────────────────────────


Rules:

- = removed

+ = added

Context optional but encouraged

No truncation without explicit notice

4.5 COMMAND EXECUTION BLOCK
⚙️ COMMAND   18:14:31
$ git log --oneline -5
────────────────────────────────────
a13f2c1 Add TUI rebuild spec
9c82b77 Improve CLI docs
────────────────────────────────────

4.6 INLINE CONFIRMATION BLOCK (NO MODALS)

Confirmation must appear inline in the stream, immediately before execution.

❓ CONFIRM ACTION
Run command:
$ git status

[y] yes   [n] no   [a] yes to all   [esc] cancel


Rules:

Rendered inline

Input cursor stays at bottom

No popups

No blocking UI redraws

4.7 COMPLETION SUMMARY BLOCK
✅ TASK COMPLETE   18:14:38
• Files changed: 1
• Tools executed: 1
• Errors: 0

5. SCROLL + INPUT MODEL
5.1 Single Scroll Context

Entire UI scrolls as one document

No independent scroll regions

No sync bugs possible

5.2 Input Bar (Persistent)

Fixed at bottom

Height: 2–3 lines max

Inline confirm input handled here

6. EVENT ROUTING CONTRACT (SIMPLIFIED)
6.1 One Renderer

All events go through one stream renderer:

Agent → EventBus → StreamRenderer → UI

6.2 No Dual Rendering

Tool events render once

Assistant text renders once

No mirroring logic

7. DEBUG LOGGING (HARD RULE)

❌ No console.log in UI

❌ No debug spam in stream

✅ Debug logs → file only

ESM-safe logging only

import fs from "node:fs";


If debug logging fails → disable silently.

8. SDLC IMPLEMENTATION PHASES (MANDATORY)
Phase S1 — Layout Collapse

Remove split panels

Single blessed box for stream

Persistent input bar

Phase S2 — Stream Block Renderer

Implement block types (User, Assistant, Tool, Diff, Confirm)

Enforce formatting rules

Phase S3 — Diff & File Proof

Enforce "show the work" rule

Fail tool execution display if no proof is provided

Phase S4 — Inline Confirmation

Remove all modal confirmation logic

Inline confirm blocks only

Phase S5 — Regression Hardening

Scroll stability

No duplication

No clipping

Timestamp consistency

9. REQUIRED PROGRESS TRACKING (Grok MUST DO THIS)

Before coding:

[SDLC] Phase S1 — STARTED  2026-02-02T18:20Z


After each phase:

[SDLC] Phase S1 — COMPLETE


If blocked:

[SDLC] Phase S2 — BLOCKED (reason)


No silent changes. No skipping phases.

10. ACCEPTANCE CRITERIA (NON-NEGOTIABLE)

✅ Single unified stream
✅ Inline diffs visible
✅ Inline confirmations
✅ No split panes
✅ No duplicated logs
✅ No console/debug bleed
✅ Scroll feels natural
✅ "What changed?" is always answerable

FINAL GROK TASK ORDER (PASTE THIS AS-IS)

Grok:
Capture this spec with timestamp 2026-02-02T18:14:00Z, acknowledge Phase S1 start, then implement the Unified Stream Blessed TUI exactly as defined. Do not introduce alternate layouts. Track SDLC progress inline before and after each phase.

If you want, next we can:
Map this 1:1 to Gemini CLI UX
Provide ASCII wireframe
Or produce a minimal diff-first renderer pseudocode for Grok

But this spec alone is enough for him to execute cleanly 🔥

---

# Gemini Execution Protocol (G.E.P) — BrewGrok Unified Stream TUI v2

**Task ID:** GEP-BREWGROK-TUI-UNIFIED-STREAM-V2
**Repo:** `/home/brewexec/grok-cli`
**Date:** 2026-02-03
**Owner:** RB
**Mode:** STRICT G.E.P
**Rules:**

* Make **incremental commits** per step (Step 1, Step 2, Step 3).
* Update progress in `brewdocs/` after each step.
* No silent behavior changes: every UX change must be captured in spec + changelog.
* Maintain anti-flicker streaming behavior.

---

## 0) Problem Statement (Observed Bugs)

### 0.1 Scroll is effectively broken (high severity)

**On touchscreen laptop**:

* Arrow keys don't scroll.
* Trackpad scroll / mouse wheel doesn't scroll.
* Click/drag scroll doesn't work.
* Result: cannot review history; UI is "write-only".

### 0.2 Confirmation UX is not modal (high severity)

* When confirmation appears, typing `y` goes into the input box (bottom field).
* User must hit `y` + `enter` multiple times; unclear when confirm triggers.
* Tool results sometimes appear *before* confirm decision.

### 0.3 Tag leakage + noisy output (medium/high)

* `{teal-fg}`, `{bold}` tags appear raw.
* Tool logs duplicate (`Result: bash` repeated).
* Role labels and timestamps spam every line.
* Repeated `Thinking...` + repeated role header lines.

### 0.4 Theme mismatch (medium)

* Current input highlight = **royal blue** (undesired).
* Must switch highlight + accent UI to **BrewTeal**.

---

## 1) Design Goal (Target Experience)

### 1.1 Layout

* **Single unified full-screen panel** (no split-pane work log).
* Inline stream combines: chat + tool activity + diffs + confirmations in one timeline.
* Tool activity should be visually distinct blocks (color + spacing), not separate panes.

### 1.2 Interaction

* Scrolling must work with:

  * Trackpad / mouse wheel
  * Touch screen scroll gestures (where terminal emits wheel events)
  * Keyboard: Up/Down, PgUp/PgDn, Home/End
  * Vim keys: `j/k`, `g/G`
* Confirmation is true modal:

  * When confirm is open → **input is disabled**, keystrokes routed to confirm.
  * `y/n/a/esc` works instantly (no Enter required).

### 1.3 Visual Style

* BrewVerse theme: dark base + gold borders + teal accent.
* Minimal clutter:

  * Role label appears once per message block (not every line).
  * Timestamps optional via toggle command `/timestamps on|off` (default off).
  * "Thinking" is one live status line/spinner, not repeated.

---

## 2) Brand + Theme Constants (Do Not Change)

### 2.1 Colors (HEX)

* **BrewTeal (Primary Accent):** `#00C7B7`  ✅ (replace royal blue)
* **BrewGold (Border/Highlight):** `#FFD700`
* **Charcoal:** `#181818`
* **Deep Gray:** `#232323`
* **Soft Black:** `#1C1C1C`
* **Text White:** `#FFFFFF`
* **Muted Text:** `#E5E7EB`

### 2.2 Typography (Terminal Constraints)

Terminal has no real fonts. We simulate hierarchy with:

* Bold for headers
* Dim/muted for metadata
* Monospace spacing + box titles

**Naming Convention**

* User label: `You`
* Assistant label: `BrewGrok` (personal feel)
* Tool label: `TOOL` (no BrewGrok label inside tool blocks)

---

## 3) Implementation Scope (Files Allowed to Change)

**Primary UI paths** (Blessed TUI):

* `src/ui-blessed/theme.ts`
* `src/ui-blessed/layout.ts`
* `src/ui-blessed/render.ts`
* `src/ui-blessed/enhanced-layout.ts`
* `src/ui-blessed/enhanced-render.ts`
* `src/ui-blessed/enhanced-keymap.ts`
* `src/ui-blessed/keymap.ts`
* `src/ui-blessed/adapter-blessed.ts`
* `src/ui-blessed/enhanced-adapter.ts`
* `src/ui/adapter.ts`
* `src/ui/stream-writer.ts`
* `src/utils/runtime-logger.ts` (if needed)

**Docs (must update)**

* `brewdocs/GROK.E.P_BREWGROK_UNIFIED_STREAM_TUI_SPEC.md` (append v2 section)
* Add: `brewdocs/blessed/CHANGELOG.md` (if not exists)

---

# 4) Sprint Plan (Next 3 Steps Grok Must Deliver)

## STEP 1 — Fix Scrolling (Touchscreen/Trackpad/Keyboard) ✅ Highest Priority

### 4.1 Requirements

The main transcript/history box must:

* Be `scrollable: true`
* Have `alwaysScroll: true`
* Show `scrollbar` (gold border, teal thumb optional)
* Allow input focus and scrolling without breaking input field behavior

### 4.2 Events to support

#### Mouse/trackpad wheel

* Enable blessed mouse:

  * `screen.enableMouse()`
  * `mouse: true` on scrollable boxes
* Listen for `wheelup` / `wheeldown` events on the scroll box:

  * `box.scroll(-N)` for wheelup
  * `box.scroll(+N)` for wheeldown
  * `screen.render()`

#### Keyboard

Bind keys globally (and when transcript has focus):

* `up/down` scroll by 1–3 lines
* `pageup/pagedown` scroll by ~50% of visible lines
* `home/end` jump to top/bottom
* `j/k` scroll line
* `g/G` jump top/bottom

#### Click/drag scrollbar

Blessed scrollbar drag is limited; but at minimum:

* ensure scrollbar is visible
* allow `mouse: true` so clicks focus the transcript
* optional: implement click-to-jump (if blessed supports click position mapping)

### 4.3 Focus Rules

* Default focus stays on input field (bottom).
* Scrolling should work even if input focused (wheel events should scroll transcript).
* Allow toggle focus:

  * `Ctrl+L` focuses transcript
  * `Esc` returns focus to input

### 4.4 Acceptance Criteria

* On RB touchscreen laptop:

  * Two-finger trackpad scroll moves transcript reliably
  * Mouse wheel scroll works
  * Arrow keys + PgUp/PgDn scroll transcript
  * Home/End works
  * Able to scroll back to the very top and read older output

---

## STEP 2 — Confirmation Modal (True Capture + Inline UX)

### 4.5 Requirements

When a confirm prompt is triggered:

* Main input must **lock** (cannot type) once confirm appears.
* Keystrokes must route to confirm handler, not input field.
* Visual feedback: confirm prompt must be clearly modal (bold, centered, or blocking).
* `y/n/a/esc` must work instantly (no Enter needed).
* Once confirm resolves, input unlocks and clears.

### 4.6 Implementation

* Modify `requestConfirmation` to set a modal flag.
* Disable input field during modal (or intercept keys).
* Show confirm as inline block but with modal styling.
* Route keys to confirm callback directly.

### 4.7 Acceptance Criteria

* Type "hello" → confirm appears → typing `y` instantly confirms (no enter).
* Input field shows disabled state or is ignored.
* No tool output before confirm decision.

---

## STEP 3 — Theme + Tag Cleanup (BrewTeal + Noise Reduction)

### 4.8 Requirements

* Update theme to BrewTeal (#00C7B7) for input highlight.
* Fix raw tag leakage ({teal-fg} visible).
* Reduce noise: one role label per block, optional timestamps.
* "Thinking" as live spinner, not repeated.

### 4.9 Implementation

* Update `theme.ts` with new colors.
* Modify render methods to strip tags or use blessed tags properly.
* Add `/timestamps` command to toggle timestamps.
* Improve thinking display.

### 4.10 Acceptance Criteria

* Input highlight is teal, not blue.
* No raw blessed tags in output.
* Clean, minimal output with proper role labels.

---

## 8) Testing & Validation

### 8.1 Manual Test Checklist

* [ ] Scroll works on touchscreen laptop (trackpad, wheel, keys).
* [ ] Confirmation is truly modal (y/n instant, input locked).
* [ ] No tag leakage, clean output.
* [ ] Theme matches BrewTeal.

### 8.2 Smoke scripts (optional)

* `scripts/smoke-tui.sh` update if exists:

  * add scroll event simulation if possible
  * otherwise validate no crashes and confirm ordering

---

## Quick answer on your last question (confirmation inline)

Yes — we can and should make confirmation **inline** + truly modal. Right now it's half-modal and letting input eat the keys; Step 2 fixes it.

---

If you want, I can also add a "visual wireframe" section (ASCII mock) of how the unified stream should look once scroll + tool blocks + confirm are cleaned up.