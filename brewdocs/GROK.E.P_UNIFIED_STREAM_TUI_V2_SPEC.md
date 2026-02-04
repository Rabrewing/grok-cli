# GROK.E.P — BREWVERSE ENHANCED UNIFIED STREAM TUI (SINGLE PANEL)

**Task ID:** `GROK-UI-UNIFIED-REDO-0203`
**Timestamp (ET):** 2026-02-03
**Repo:** `/home/brewexec/grok-cli`
**Branch:** `feature/unified-stream-tui-v2`
**Goal:** Replace the current Blessed UI with a **single unified timeline** that displays **chat + tool/work output inline**, with proper formatting, diff blocks, and inline confirm bar.

---

## 0) SDLC CONTROL (MANDATORY)

Create/Update `brewdocs/SDLC_STATUS.md` after every milestone:

* Timestamp
* What changed
* Files touched
* Commands run + observed result

Create `brewdocs/GROK.E.P_UNIFIED_STREAM_TUI_V2_SPEC.md` containing this spec verbatim + acceptance checklist.

---

## 1) BRANCH + SAFETY

```bash
cd /home/brewexec/grok-cli
git checkout main
git pull --ff-only || true
git checkout -b feature/unified-stream-tui-v2
git status
```

---

## 2) FILES IN SCOPE (ONLY THESE)

Modify only:

* `src/ui-blessed/layout.ts`
* `src/ui-blessed/render.ts`
* `src/ui-blessed/index.ts`
* `src/ui-blessed/keymap.ts`
* `src/ui/adapter.ts`
* `src/ui/stream-writer.ts` (only if required to route events)
* `src/ui-blessed/theme.ts` (if needed)
* `brewdocs/GROK.E.P_UNIFIED_STREAM_TUI_V2_SPEC.md`
* `brewdocs/SDLC_STATUS.md`

No other files.

---

## 3) UI LAYOUT (SINGLE PANEL)

### 3.1 Structure

* **One full-screen scrollable timeline** (main feed)
* **One fixed input bar** at bottom (always visible, 1–2 lines)
* **One inline confirm strip** directly above the input bar (hidden unless needed)

No worklog side panel. No split panes. No modal confirmations.

### 3.2 Geometry (Exact)

* `timelineBox`: `top: 0`, `left: 0`, `width: "100%"`, `height: "100%-<inputHeight>-<confirmHeight>"`
* `confirmBar`: fixed height `1` (or `2` if wrapping), appears only when active
* `inputBox`: fixed height `3` (label + entry + padding)

### 3.3 Borders + Branding

Enhanced terminal look (BrewVerse):

* Outer border for timeline and input area (closed, no bleed)
* Padding left/right = 1 so text never touches borders
* Keep BrewGold + BrewTeal accents (existing theme tokens OK)

---

## 4) UNIFIED TIMELINE CONTENT MODEL (CRITICAL)

Everything prints into ONE scrollable timeline with **event blocks**.

### 4.1 Event Types

Each timeline entry is one of:

* `USER`
* `ASSISTANT`
* `THINKING`
* `TOOL_CALL`
* `TOOL_RESULT`
* `FILE_OP`
* `DIFF`
* `ERROR`
* `INFO`

### 4.2 Formatting Rules

Each event prints like:

**Header line:**
`[HH:MM:SS] <TYPE>  <title>`

**Body (optional):**
Indented key/value lines or wrapped text.

**Separator:**
`────────────────────────────────────`

### 4.3 Tool Call + Result Inline

When a tool is invoked:

* Add `TOOL_CALL` entry:

  * tool name
  * primary args summary (short)
* When completed:

  * Add `TOOL_RESULT` entry:

    * status (SUCCESS/FAIL)
    * short summary
    * if large output: show first N lines then `(truncated)`

No "duplicate" output in multiple places because there is only one place.

---

## 5) INLINE DIFF BLOCKS (REQUIRED)

When any edit occurs (text editor, morph editor, file write), timeline must print a `DIFF` event.

### 5.1 Diff Rendering Rules

* Header includes file path
* Show diff in a code-like block area inside the timeline:

  * Removed lines prefixed: `- `
  * Added lines prefixed: `+ `
  * Context lines prefixed: `  `
* Hard cap: 160 lines max per diff event
* If exceeded: append `… (diff truncated)`

### 5.2 Dual Inline Diff (Readable)

Use a two-section format inside one diff event:

* "REMOVED" section (all `-`)
* "ADDED" section (all `+`)
  This avoids cramped side-by-side rendering in terminals.

---

## 6) INLINE CONFIRMATION (NO MODAL)

Remove the centered "Confirmation Required" popup.

### 6.1 Confirm Bar Behavior

Confirm bar appears above input as:
`CONFIRM: <action summary> (y=yes / n=no / a=all / esc=cancel)`

Rules:

* Confirm bar is **single-line**; if too long, truncate with `…`
* While confirm is active:

  * capture `y/n/a/esc`
  * ignore normal input submission
* On decision:

  * print an `INFO` timeline entry: `Decision: YES/NO/ALL/CANCEL`
  * hide confirm bar
  * resume normal input focus

---

## 7) SCROLLING + INPUT BEHAVIOR (MUST FEEL LIKE GEMINI/OPENCODE)

### 7.1 Timeline Scroll

* Timeline is scrollable with a visible scrollbar
* Scroll keys:

  * `PgUp/PgDn`
  * `Ctrl+U / Ctrl+D` half page
  * `Home/End`
* When new content arrives:

  * auto-scroll to bottom **only if user is already near bottom**
  * if user scrolled up, do NOT yank them down; show a subtle "(new messages)" marker in status line or append a small `INFO` event: `New output available ↓`

### 7.2 Input

* Always focused unless user is actively scrolling timeline using mouse/keys
* `Esc` returns focus to input immediately

---

## 8) STOP CONSOLE LOG BLEEDING

All debug output must not appear in the timeline as raw stack spam unless it's an `ERROR` event.

Rules:

* Remove/disable `console.log` in UI layer paths.
* Route internal logs through a single logger function that writes:

  * `INFO` entries for normal debug (optional)
  * `ERROR` entries for exceptions
* If `require is not defined` appears anywhere, treat as an ESM misuse and ensure any runtime logger uses ESM-safe imports only (no `require`).

---

## 9) PERFORMANCE + FLICKER CONTROL

* Batch renders: buffer timeline appends and render once per tick (`setImmediate` or debounce 16ms).
* Do not re-render whole screen for every token chunk.
* Keep the existing anti-flicker approach: write minimal diffs to the screen.

---

## 10) IMPLEMENTATION STEPS (DO IN ORDER)

### Step 10.1 Spec + SDLC files

* Create `brewdocs/GROK.E.P_UNIFIED_STREAM_TUI_V2_SPEC.md`
* Create/Update `brewdocs/SDLC_STATUS.md`

### Step 10.2 layout.ts

* Build: `timelineBox`, `confirmBar`, `inputBox`
* No work log pane
* Clean borders + padding

### Step 10.3 render.ts

* Implement event appenders:

  * `appendUser(text)`
  * `appendAssistant(text)`
  * `appendThinking(text)`
  * `appendToolCall(tool, summary)`
  * `appendToolResult(tool, status, summary, details?)`
  * `appendDiff(filePath, diffLines[])`
  * `appendError(title, stack?)`
* Add truncation + wrapping

### Step 10.4 keymap.ts

* Bind scrolling keys to timeline
* Bind confirm keys when confirm active
* Bind input submit normally

### Step 10.5 adapter.ts + index.ts

* Ensure all tool execution logs route into timeline as events
* Ensure confirm requests trigger confirmBar, not modal

---

## 11) ACCEPTANCE CHECKLIST (MUST PASS)

Run:

```bash
bun run src/index.ts --ui blessed
```

Verify:

1. Single unified screen (no split panes)
2. Chat + tool events appear inline in timeline
3. Inline diff blocks show `-` and `+` properly
4. Confirmations appear in confirm bar above input (no modal)
5. Timeline scroll works; input stays stable
6. No console log spam in the UI
7. No border gaps/bleed
8. No flicker storms during streaming

Record results in `brewdocs/SDLC_STATUS.md`.

---

## 12) COMMIT + PUSH

```bash
git add -A
git commit -m "ui(blessed): redesign unified stream timeline with inline confirm + diff blocks"
git push -u origin feature/unified-stream-tui-v2
```

---

If you want the enhanced visual vibe (blue/gold energy) preserved: keep the existing theme colors, but apply them to **one unified timeline** (headers + separators + confirm strip + input border). The structure above will give you the readability and "modern AI terminal" feel without fighting pane sync bugs.

---

# Sprint 2 — FIX DUPLICATE FEEDBACK + STRIP/RENDER TAGS

## TASK 2.1 — STOP DUPLICATE USER/ASSISTANT EVENTS (ROOT CAUSE: DOUBLE APPEND)

**Goal:** Each user message and each assistant chunk is appended **exactly once** to the unified timeline.

### Do this:

1. **Add an event de-dupe guard** in the unified timeline writer (where you append entries).

   * Create a rolling in-memory key like:

     * `key = type + ":" + messageId + ":" + chunkIndex`
   * Maintain a `Set` of the last ~500 keys.
   * If key already exists → **skip append**.

2. **Ensure only ONE pipeline writes to the timeline**:

   * Search for *every* place `appendUser/appendAssistant/appendThinking` is called.
   * You likely have both:

     * the UI adapter appending, AND
     * a stream-writer / agent callback also appending.
   * **Hard rule:** Only the adapter writes UI events. Everything else emits structured events to adapter.

3. **Fix repeated "Thinking…"**:

   * Replace repeated "Thinking…" appends with a **single state line**:

     * If "thinking" already visible → update/overwrite that same line (or ignore).
     * When first assistant token arrives → remove the thinking indicator (or mark complete).

### Acceptance:

* When you type once, the timeline shows **one** user entry.
* "Thinking…" appears **once**, not twice.
* Assistant reply appears **once**, no duplicate blocks.

---

## TASK 2.2 — FIX RAW `{bold}{#...-fg}` TAGS SHOWING (ROOT CAUSE: WRONG RENDER MODE)

**Goal:** Either render Blessed tags correctly **or** strip them before display. Right now they're printing as plain text.

### Do this:

1. Identify the component used for the timeline box:

   * It must support **Blessed inline tags**.

2. Force-enable tags on the timeline element:

   * `tags: true`
   * and ensure the element is **not** a type that ignores tags.

3. If you intentionally don't want tags in the timeline:

   * Add a sanitizer that strips any `{...}` blessed tag patterns before append:

     * Remove `{bold}`, `{/bold}`, `{#xxxxxx-fg}`, `{/}`, etc.
   * Only keep clean text.

### Acceptance:

* The welcome header displays in the intended style (gold/teal) **without showing raw tag text**, OR it displays clean text with tags removed.
* No `{bold}` or `{#...-fg}` appears in the timeline.

---

## TASK 2.3 — PREVENT DOUBLE "WELCOME/BOOT" OUTPUT

**Goal:** Welcome banner prints once per app launch.

### Do this:

1. Ensure the boot banner is emitted from exactly one place:

   * If both `index.ts` and `adapter.ts` print it, remove one.
2. Add a `hasPrintedWelcome` boolean in the session state:

   * If true → don't print again.

### Acceptance:

* Welcome block appears only once on startup.

---

## TASK 2.4 — INPUT SUBMIT SHOULD NOT ECHO MULTIPLE TIMES

**Goal:** Pressing Enter submits once.

### Do this:

1. In the input key handler, ensure **only one** of these triggers submission:

   * `enter` key binding
   * input `submit` event
2. If both exist, pick one and remove the other.
3. Add a guard:

   * if `isSubmitting === true` ignore key events until submission resolves.

### Acceptance:

* One Enter press = one submission.

---

# QUICK DIAG CHECKLIST (MANDATORY COMMANDS)

Run these after implementing fixes:

```bash
bun run src/index.ts --ui blessed
```

Then test:

1. Type: `brewgrok you working` once → must appear once
2. Confirm "Thinking…" only once
3. Ensure no `{bold}{#...-fg}` visible anywhere

---

# Deliverable Update (Docs)

Update:

* `brewdocs/SDLC_STATUS.md` with Sprint 2 notes + timestamp
* `brewdocs/GROK.E.P_UNIFIED_STREAM_TUI_V2_SPEC.md` add a "Sprint 2" section summarizing Tasks 2.1–2.4 + acceptance results

---

If you paste me the **exact file where the timeline box is created** (likely `src/ui-blessed/layout.ts` or `render.ts`) I’ll tell you precisely where to set `tags: true` and where the double-append is happening — but Grok can execute the tasks above immediately without guessing.