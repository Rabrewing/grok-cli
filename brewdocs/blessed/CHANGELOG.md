# BrewGrok Blessed TUI Changelog

## v0.0.35.7 - G.E.P Step 3: Theme & Cleanup (2026-02-03)
- Input highlight changed to BrewTeal (#00C7B7) from royal blue
- Added BrewGold borders for visual consistency
- Fixed blessed tag leakage - clean rendering without raw tags
- Reduced output noise: tool summaries, single role labels, no duplicates
- Timestamps optional (default off), thinking as live status

## v0.0.35.6 - G.E.P Step 2: Modal Confirmation (2026-02-03)
- Implemented true modal confirmation UX
- Instant y/n/a/esc keys without requiring Enter
- Input field cleared and locked during modal state
- Confirmation blocks tool execution until decision made
- Visual emphasis with inline modal styling

## v0.0.35.5 - G.E.P Step 1: Scrolling Fixed (2026-02-03)
- Enabled blessed mouse support for trackpad/touchscreen
- Added wheel events: mouse wheel scrolls by 3 lines
- Comprehensive keyboard scrolling: arrows, PgUp/PgDn, vim j/k, g/G
- Scrollbar styled with BrewTeal/Gold theme colors
- Can now review full conversation history reliably

## v0.0.35.4 - Scroll Controls Fixed (2026-02-03)
- Moved scroll key handlers to focused inputBox widget
- PageUp/PageDown, Home/End, Ctrl+U/Ctrl+D work properly
- Fixed laptop keyboard scroll issues

## v0.0.35.3 - Command Palette (2026-02-03)
- Added ASCII command palette triggered by typing '/' + Enter
- Organized table of all commands and keyboard shortcuts
- Quick reference without leaving conversation flow

## v0.0.35.2 - Blessed UI Feature Parity (2026-02-03)
- Added comprehensive /command system: help, clear, models, status
- Implemented command history with arrow key navigation
- Added scroll controls (PageUp/Down, Home/End)
- Verified keyboard functionality (backspace, editing)

## v0.0.35.1 - Fix BrewGrok Naming (2026-02-03)
- Corrected "Assistant" to show "BrewGrok" once per response
- Removed repeated role prefixes for cleaner conversation

## v0.0.35 - Unified Stream TUI UX Overhaul (2026-02-03)
- Added UI state machine for clean interaction flow
- Input clears immediately on submit (fixed sticky prompt)
- Collapsed tool outputs to summaries
- Inline confirmation blocks in timeline
- Removed per-line timestamps and duplicates