Project: grok-cli
Component: Blessed / Neo-Blessed TUI
Spec Version: v1.0
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