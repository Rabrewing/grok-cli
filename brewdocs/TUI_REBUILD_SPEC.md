# TUI Rebuild Spec: Blessed UI (No Ink)

**Task ID:** GROK-TUI-REBUILD-001

**Goal:** Replace Ink-based UI with a stable terminal UI built on neo-blessed (Blessed), with three panes: Transcript (scrollable), WorkLog (collapsible / toggle), Input (fixed bottom)…and eliminate flicker during: typing, streaming output, tool execution updates

**Hard Rules**
- Do not use Ink for rendering in the new UI.
- Do not remove Ink yet (keep as fallback via --ui ink).
- Default UI becomes blessed once stable.
- Streaming must be buffered (flush cadence).
- No auto-writes unless --apply (apply must be explicit).
- Never print secrets (API keys, .env).

## Phase 0 — Dependencies + Flags
**Deliverables**
- Add dependency: neo-blessed (or blessed if preferred, but neo-blessed is better maintained)
- Add CLI flag: --ui blessed|ink (default: blessed)
- Files: package.json, CLI entry file (whatever currently parses args—commander config)

**Acceptance**
- grok --ui ink still works
- grok defaults to blessed (once Phase 1 passes)

## Phase 1 — New UI Runtime (Blessed)
**Deliverables**
- Create a new UI runtime under a dedicated folder: src/ui-blessed/
- Pane Layout (must match):
  - Top: Transcript (scrollable, wraps lines, supports copy/select if terminal allows)
  - Middle (optional): WorkLog (toggle on/off; collapsible height)
  - Bottom: Input (single-line or multiline toggle)
- Keybindings
  - Ctrl+C exit (safe shutdown)
  - Ctrl+L clear transcript (soft clear)
  - Ctrl+W toggle WorkLog pane
  - PgUp/PgDn transcript scroll
  - End jump to bottom
  - /clear clears transcript + worklog (and abort stream safely)

- Files
  - src/ui-blessed/index.ts (UI entry)
  - src/ui-blessed/layout.ts (screen + panes)
  - src/ui-blessed/keymap.ts (keyboard)
  - src/ui-blessed/render.ts (append/update methods)

**Acceptance**
- No flicker while idle
- Typing does not redraw whole screen
- Transcript scroll works and stays stable

## Phase 2 — UI Adapter Contract (so agent logic never touches UI internals)
**Deliverables**
- Create a UI interface used by the agent layer: UIAdapter
  - appendUserMessage(text)
  - startAssistantMessage(id)
  - appendAssistantChunk(id, chunk)
  - endAssistantMessage(id)
  - appendWork(event) (tool calls, file reads, bash, etc.)
  - setStatus(text) (optional status line)
  - clearAll() (like /clear)
  - shutdown()
- Files
  - src/ui/adapter.ts (interface + types)
  - src/ui-blessed/adapter-blessed.ts (implements UIAdapter)
  - src/ui-ink/adapter-ink.ts (optional adapter wrapper if you want parity)

**Acceptance**
- Agent calls UIAdapter only (no direct UI imports in agent loop)

## Phase 3 — Streaming Buffer Fix (the actual anti-flicker core)
**Deliverables**
- Implement streaming updates as buffered flush:
  - accumulate chunks in memory
  - flush to transcript at fixed cadence (e.g. 50–100ms)
  - flush immediately on: tool call, stream end, abort, error
- Important: In Blessed, avoid rerendering entire transcript. Append text to the transcript box content using append-like behavior, and only call screen.render() at flush cadence.
- Files
  - src/hooks/use-streaming-handler.ts (or new src/streaming/stream-buffer.ts)
  - src/agent/grok-agent.ts (wire to UIAdapter methods)

**Acceptance**
- Streaming response does not flicker
- CPU stays stable even on long output
- Transcript stays readable during streaming

## Phase 4 — Work Visibility (so you can see what Grok is doing)
**Deliverables**
- Every tool / operation must produce a WorkLog event:
  - Bash: <cmd> then result summary
  - ReadFile: <path>
  - Edit: <path> (diff summary)
  - Search: query + count
  - Apply: files touched
- WorkLog must: append entries without wiping screen, be toggleable (Ctrl+W), optionally support minimal filtering (later)
- Files
  - src/ui-blessed/worklog.ts
  - Wherever tool calls are dispatched (tool router)

**Acceptance**
- You always see what Grok is doing
- No "Updated Todo… Executing…" black box

## Phase 5 — Repo Mode + Rules Loading (global + per repo)
**Deliverables**
- Rules resolution order (must implement exactly):
  - --rules <path> if provided
  - repo root: AGENTS.md, GROK_RULES.md, .grok/rules.md
  - global: ~/.config/grok/rules.md, ~/brewdocs/GROK_GLOBAL_RULES.md
  - fallback: bundled rules template
- Also implement repo snapshot without crashing when not in repo.
- Known bug to fix: "path argument must be string. Received undefined" That is always a rules/snapshot resolver returning undefined to a path.* function. Fix requirement: Any resolver must return null not undefined, and callers must guard.
- Files: src/utils/repo.ts, src/utils/rules.ts, src/utils/snapshot.ts

**Acceptance**
- Running grok in ~ (not in repo) does not crash
- Running grok in repo loads rules + snapshot
- Print in WorkLog: "Rules loaded from: <path or fallback>"

## Phase 6 — --apply (you said enable it)
**Deliverables**
- Implement safe apply workflow:
  - Default: dry-run (diff only)
  - When --apply: require confirmation unless --yes
  - apply patch using git apply (repo mode) OR write files directly (non-repo) with explicit log
  - show: files touched, post-apply git diff --stat, rollback instructions
- Files: src/commands/patch.ts or src/apply/apply-diff.ts, CLI flag parsing file

**Acceptance**
- --apply works
- No writes happen unless --apply is present
- Every apply produces rollback instructions

## Phase 7 — Tests & Smoke Scripts
**Deliverables**
- Add scripts to verify:
  - blessed UI launches
  - typing doesn't flicker
  - streaming flush cadence works
  - rules resolver safe outside repo
  - apply path works
- Files: scripts/smoke-tui.sh, scripts/smoke-repo-mode.sh, (Optional) minimal unit tests for rules resolver

**Acceptance**
- You can run 1 command and confirm stability

## Grok Output Requirements (every patch)
- Plan
- Files to change
- Diffs
- Commands to run
- Rollback