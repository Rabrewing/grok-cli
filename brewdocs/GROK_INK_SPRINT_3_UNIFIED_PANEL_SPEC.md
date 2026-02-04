# GROK INK — TASK ORDERS (SPRINT 3)

**Objective:** Make the unified panel **expressive, readable, and trustworthy**: show real work, reduce noise, prevent stalls, and modernize the event model.

**MANDATE:** Timestamp + capture spec BEFORE implementation and update SDLC progress after each task.

---

## TASK 3.1 — FIX THE "Executing bash…" STALL (NO MORE SILENT HANGS)

**Goal:** Every tool call must end in a visible terminal event: `TOOL_RESULT` or `TOOL_ERROR` within the stream.

### Implementation Orders

1. Add a **tool-call watchdog** timer in the agent/tool runner:

   * When `TOOL_CALL` starts → start `T=30s` watchdog.
   * If no result by timeout → emit `TOOL_ERROR: timeout` + include tool name + args summary.
2. Wrap tool execution in `try/catch/finally`:

   * `finally` MUST emit a closing event that tells UI the tool finished (success or fail).
3. Add **crash-safe stream flush**:

   * If writer throws, fallback to `process.stderr.write()` + continue.
4. Ensure bash tool always returns:

   * Even if command errors, return `exitCode`, `stdout`, `stderr`.

### Acceptance

* No more hanging at "Executing bash…".
* You always see either a result block or an error block.

---

## TASK 3.2 — TOOL VISIBILITY IS NOT HELPFUL

**Goal:** Show the command, cwd, stdout/stderr, files changed.

### Implementation Orders

1. Update `TOOL_CALL` event to include:

   * Full command
   * Working directory
   * Tool name
2. Update `TOOL_RESULT` event to include:

   * Exit code
   * Full stdout (truncated if >1000 chars)
   * Full stderr (if any)
   * Files changed summary (if applicable)
   * Execution time

### Acceptance

* You see what tool ran, where, what it output, and what changed.

---

## TASK 3.3 — OVER-FORMATTING NOISE

**Goal:** Reduce timestamps, separators, repeated labels.

### Implementation Orders

1. Remove horizontal separators (`────────────────────────────────────`) after every entry.
2. Remove repeated labels in assistant messages.
3. Make separators optional or use minimal spacing.

### Acceptance

* Timeline looks like a modern CLI transcript, not a ledger.

---

## TASK 3.4 — COLOR-CODE SPEAKERS + EVENT TYPES

**Goal:** Visual clarity: user vs assistant vs tool vs system.

### Implementation Orders

1. Add consistent color palette:

   * USER: teal accent label
   * ASSISTANT: gold accent label
   * TOOL: purple/blue accent label
   * ERROR: red
   * SYSTEM/INFO: gray
2. Color only the **label header**, not every word.
3. Add subtle prefix icons:

   * `👤` user, `🤖` assistant, `🛠` tool, `⚠` error, `ℹ` info

### Acceptance

* You can scan the transcript instantly and know what's what.

---

## TASK 3.5 — CHANGE "BrewGrok" LABEL TO "Assistant"

**Goal:** "Assistant" as canonical label.

### Implementation Orders

1. Replace UI label rendering:

   * Always display "ASSISTANT" (or "Assistant") regardless of internal agent name.
2. Remove repeated label spam:

   * Label prints **once per message block**.

### Acceptance

* No "BrewGrok" label in timeline.
* Assistant label appears once per assistant message.

---

## TASK 3.6 — REMOVE TIMESTAMP PER LINE (KEEP IT CLEAN)

**Goal:** Timestamp only when useful.

### Implementation Orders

1. Only show timestamp on:

   * USER messages
   * TOOL blocks (start time + duration)
2. Assistant messages: no timestamp per line.
3. Make timestamp optional via a single toggle in settings:

   * default OFF for assistant lines.

### Acceptance

* Transcript is readable; timestamps don't dominate.

---

## TASK 3.7 — MAKE "THINKING" INTERACTIVE (WITHOUT CHAIN-OF-THOUGHT)

**Goal:** Replace "Thinking…" with a live **progress status** that updates as steps occur.

### Implementation Orders

1. Replace "Thinking…" with a single **status line**:

   * Example: `🤖 Working: scanning brewdocs…`
2. Update it as phases progress:

   * scanning repo → reading files → preparing tool call → executing tool → summarizing result
3. When response starts streaming:

   * status line switches to: `🤖 Responding…`
4. When done:

   * status line disappears OR becomes: `✅ Done`

### Acceptance

* No robotic "Thinking…" spam.
* You see what stage it's in (high-level), continuously.

---

## TASK 3.8 — ENSURE INPUT FIELD DOES NOT ECHO/REPEAT

**Goal:** One enter press = one message.

### Implementation Orders

1. Add submit lock:

   * if submitting → ignore additional Enter presses until tool/assistant returns.
2. Ensure only one handler triggers submit.

### Acceptance

* No duplicate user message blocks.

---

# Sprint 3 UI TARGET (WHAT IT SHOULD LOOK LIKE)

**User block**

* `👤 User:` (teal) message text

**Assistant block**

* `🤖 Assistant:` (gold) message text (label once)

**Tool block**

* `🛠 Tool: bash (2.1s)` (purple)
* `$ cd brewdocs && ls`
* `stdout…`
* `files changed: …`
* `diff preview: …`

**Status line**

* `🤖 Working: running bash…`

---

# Required Files to Update (Docs + SDLC)

1. `brewdocs/GROK_INK_SPRINT_3_UNIFIED_PANEL_SPEC.md`

   * Add tasks 3.1–3.8 + acceptance checklist
2. `brewdocs/SDLC_STATUS.md`

   * Sprint 3 created, in-progress items tracked with timestamp

---

# Ultra-Short Debug Command Set (TO CONFIRM STALL FIX)

After Task 3.1, run inside grok-cli:

```bash
bun run src/index.ts --ui blessed
```

Then ask:

* "run a bash command: `pwd`"
  You must see:
* tool call
* command shown
* tool result (stdout)
* no hang

---

If you want the terminal to feel "alive" immediately: **Task 3.1 + 3.2 + 3.7 are the power trio**. Everything else makes it clean and premium.