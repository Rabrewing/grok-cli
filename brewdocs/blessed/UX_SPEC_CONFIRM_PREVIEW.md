# BrewGrok Blessed TUI — Confirmation + Preview Standard (v1)

**Status:** Draft → Implement  
**Scope:** Blessed TUI (unified single-panel)  
**Out of scope:** multi-model fallback chain, provider routing, non-Grok model adapters  

---

## 0) Design Goals

1. **Industry-standard AI terminal flow:** Plan → Preview → Confirm → Execute → Report
2. **Zero "tool spam" in the chat stream:** user sees human-friendly status, not raw tool plumbing.
3. **One clean identity:** "BrewGrok" (personal) but not repeated on every line.
4. **Readable, expressive, modern:** color-coded roles, lightweight metadata, interactive "thinking".
5. **Predictability:** confirmations only for mutation (writes/commands), previews always shown first.
6. **Diff visibility:** side-by-side diffs for wide screens + fallback to stacked view for narrow.

---

## 1) Visual System & Branding

### 1.1 Theme Colors (Hex)

* **BrewTeal (Primary):** `#00C7B7`
* **BrewGold (Accent):** `#FFD700`
* **Soft Black:** `#1C1C1C`
* **Deep Gray:** `#232323`
* **Charcoal:** `#181818`
* **Danger/Red:** `#FF5A5F` (for removals / errors)
* **Purple (Optional highlight):** `#9C27B0`
* **White:** `#FFFFFF`

### 1.2 Role Styling (No heavy timestamps)

* **USER** line: BrewTeal label + normal text
* **BREWGROK** line: BrewGold label + normal text
* **SYSTEM/NOTICE**: neutral gray
* **ERROR**: red + short explanation
* **SUCCESS**: teal/greenish indicator (keep consistent)

**Rule:** don't print timestamp every row.
Allowed: a single session header timestamp or compact time tags only on hover/debug (if you support it).

### 1.3 Remove Visual Noise

* Remove underline separators under every message/tool call.
* Remove repeated "Assistant:" prefix per wrapped line.
* Remove repeated "BrewGrok" name spam—name should appear once per message block.

---

## 2) Execution Model: Plan → Preview → Confirm → Execute → Report

### 2.1 Definitions

**Mutation** = anything that changes state:

* file writes/patches/creates
* running bash commands
* git operations
* config changes

**Preview** = display only:

* diff preview
* command preview
* impact summary

### 2.2 State Machine (Must Implement)

* `IDLE`
* `THINKING`
* `PLANNING` (optional but recommended)
* `PREVIEW_READY`
* `PENDING_CONFIRMATION`
* `EXECUTING`
* `DONE`
* `ERROR`

**Hard Rule:**
A confirmation prompt must only appear in `PENDING_CONFIRMATION`, and only when there is a mutation plan.

---

## 3) MutationPlan (Batch Confirmation)

### 3.1 Create a MutationPlan before any tool execution

A **MutationPlan** is a structured batch:

**MutationPlan**

* `id`
* `summary`
* `items[]`

**Item**

* `type`: `WRITE_FILE | PATCH_FILE | RUN_BASH | GIT_OP | OTHER`
* `label`: short human label
* `target`: filepath or command
* `preview`: short preview (diff snippet or command string)
* `risk`: `LOW | MED | HIGH`
* `canAutoApply`: boolean (default false unless user opted in with "Yes to all")

### 3.2 Single Confirmation per Plan (Default)

When plan is ready, show:

**"Ready to apply changes"**

* List items (max 6 visible)
* "+ N more" collapsed

Actions:

* `[Y] Apply`
* `[N] Cancel`
* `[A] Apply all (session)`
* `[V] View details` (optional)
* `[D] Diff view` (optional quick toggle)
* `[Esc] Cancel`

**Hard Rule:**

* `y/n/a/v/d/esc` should work as single-keystrokes (no extra Enter).
* Enter can be "default action" but not required for `y/n/a`.

---

## 4) Preview Layer: Diff-first, Command-first

### 4.1 File mutations MUST show diff preview before confirm

For every file write/patch:

* show file path
* show side-by-side diff if possible
* allow "View full diff" expansion
* then confirmation

### 4.2 Command mutations MUST show command preview before confirm

For bash commands:

* show the exact command
* show working directory if relevant (small text)
* show risk tag if command is destructive (rm, mv, git reset, etc.)

---

## 5) Diff Viewer: Side-by-Side as Default

### 5.1 Layout

If terminal width allows:

* **LEFT:** OLD (-) in red accents
* **RIGHT:** NEW (+) in teal accents

Headers:

* `OLD (-)` and `NEW (+)` labels

### 5.2 Fallback

If too narrow:

* stacked diff:

  * OLD section then NEW section

### 5.3 Minimal Formatting

* do not dump raw JSON tool payloads
* do not spam every line with markers
* show line numbers only if helpful for context (optional)

---

## 6) Tool Output Hygiene (Fix "TOOL_CALL spam")

### 6.1 Replace these noisy lines:

* `[TOOL_CALL] tool...`
* "Executing bash…"
* repeated "Result: bash (success…)" lines

### 6.2 With a clean execution report block

Example:

**Execution**

* ✅ Ran: `ls -la brewdocs/`
* ✅ Wrote: `brewdocs/blessed/updates.md`
* ⚠️ Warning: (if any)
* ❌ Error: (if any)

**Optional:** "Show raw tool output" toggle (debug mode only)

---

## 7) Thinking UX (Less robotic)

### 7.1 Replace: "THINKING Thinking…"

With an animated/compact indicator:

* `BrewGrok is thinking…` (teal)
* optionally rotate statuses:

  * "Scanning files…"
  * "Building plan…"
  * "Preparing preview…"

**Hard Rule:** do not print a "thinking" line every time; keep it "live" and update the same line.

---

## 8) Identity Rules

### 8.1 Names

* "BrewGrok" is the assistant label (personal feel).
* Avoid printing "ASSISTANT" in the transcript.

### 8.2 Display once per message block

A message should render as:

**BrewGrok:** <content wraps beneath without repeating label>

Same for user.

---

## 9) Confirmation UX Rules (Industry Standard)

### 9.1 Confirmation means "ready to execute"

Not "ready to preview".

### 9.2 "Yes to all" semantics

If user presses `A`:

* store session flag `AUTO_APPROVE_MUTATIONS=true`
* still show previews, but auto-apply without prompting
* allow user to disable with a command or prompt ("turn off auto-approve")

### 9.3 Confirmation input behavior

* When confirmation is active, input box becomes "decision input"
* Accept single keypress decisions
* Do not require Enter for `y/n/a/esc`
* After decision: return focus to main input automatically

---

## 10) Acceptance Criteria (Done = Done)

1. **No tool spam:** tool calls do not appear as raw tags in normal view.
2. **Predictable gating:** confirmation only appears for mutation plan.
3. **Diff-first:** file changes always previewed before apply.
4. **Batch confirmation:** one confirmation per mutation plan.
5. **Side-by-side diff:** default on wide screens; stacked fallback for narrow.
6. **Single-keystroke confirm:** `y/n/a/esc` works without extra Enter.
7. **Identity clean:** BrewGrok label once per message block.
8. **Thinking is "live":** one updating indicator, not repeated lines.
9. **Clear execution report:** shows what actually ran/wrote, minimal noise.

---

## 11) Next 3 Implementation Steps (Grok Execution Order)

### Step 1 — Introduce `MutationPlan` + State Machine

* Add plan builder in agent loop prior to tool execution
* Add UI states: `PREVIEW_READY`, `PENDING_CONFIRMATION`, `EXECUTING`
* Convert tools to produce structured plan items

**Output:** consistent gating and predictability.

### Step 2 — Build Preview Renderer + Diff Viewer Side-by-Side

* Add `DiffPreview` block renderer
* Implement side-by-side diff layout
* Add stacked fallback when width is limited
* Add "View details" / "View full diff" toggle (optional)

**Output:** you can actually see what changed.

### Step 3 — Clean Transcript Rendering + Tool Output Hygiene

* Remove `[TOOL_CALL]` lines and repetitive "Result: bash"
* Replace with compact execution report section
* Implement role color blocks and single label per message
* Replace "Thinking…" spam with live status line

**Output:** terminal looks premium and expressive.

---

**Integration Date:** 2026-02-04  
**Author:** User Spec Addendum  
**Priority:** HIGH - Core UX Foundation-e 
## 12) Definition of Done Checklist

- [ ] No tool spam: tool calls do not appear as raw tags in normal view.
- [ ] Predictable gating: confirmation only appears for mutation plan.
- [ ] Diff-first: file changes always previewed before apply.
- [ ] Batch confirmation: one confirmation per mutation plan.
- [ ] Side-by-side diff: default on wide screens; stacked fallback for narrow.
- [ ] Single-keystroke confirm: y/n/a/esc works without extra Enter.
- [ ] Identity clean: BrewGrok label once per message block.
- [ ] Thinking is "live": one updating indicator, not repeated lines.
- [ ] Clear execution report: shows what actually ran/wrote, minimal noise.
