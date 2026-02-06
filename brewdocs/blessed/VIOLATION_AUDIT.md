# GROK.E.P VIOLATION AUDIT

**Started:** 2026-02-04  
**Spec Version:** Unified Enhanced Panel vNext  
**Scope:** All files in src/ for spec violations

---

## 🚨 CRITICAL VIOLATIONS (Must Fix)

### Task 1: Unified Timeline Renderer Violations
**Issue:** Multiple direct render paths, no central enforcement

| File | Line | Violation | Impact |
|------|------|-----------|---------|
| `src/ui-blessed/render.ts` | 51 | `timelineBox.pushLine(content)` | Bypasses unified renderer |
| `src/ui-blessed/render.ts` | 64 | `timelineBox.pushLine(content)` | Bypasses unified renderer |
| `src/ui-blessed/render.ts` | 70 | `timelineBox.pushLine(text)` | Bypasses unified renderer |
| `src/ui-blessed/render.ts` | 156 | `timelineBox.pushLine(content)` | Bypasses unified renderer |
| `src/ui-blessed/enhanced-render.ts` | 127 | `transcript.pushLine(formattedMessage)` | Bypasses unified renderer |
| `src/ui-blessed/enhanced-render.ts` | 288 | `transcript.pushLine(diffText)` | Bypasses unified renderer |
| `src/ui-blessed/index.ts` | 269 | `timelineBox.setContent('')` | Direct screen manipulation |
| `src/index.ts` | Multiple | `console.log()` calls | Raw output bypasses UI entirely |
| `src/commands/index.ts` | Multiple | `console.log()` calls | Raw output bypasses UI entirely |
| `src/commands/mcp.ts` | Multiple | `console.log()` calls | Raw output bypasses UI entirely |

**Root Cause:** No enforcement mechanism preventing direct rendering

---

### Task 2: Message Grouping Violations
**Issue:** Multiple BrewGrok headers per response, no grouping

| File | Line | Violation | Impact |
|------|------|-----------|---------|
| `src/ui-blessed/render.ts` | 60-74 | `appendAssistant()` shows header each call | Multiple headers per response |
| `src/ui-blessed/adapter-blessed.ts` | 93 | `appendAssistant(fullMessage.trim())` | Duplicate assistant messages |
| `src/ui-blessed/enhanced-adapter.ts` | 148 | `appendAssistantMessage(text)` | No message grouping |
| `src/ui-blessed/render.ts` | 92-97 | Tool results shown separately | No grouping under single response |

**Root Cause:** No MessageGroup lifecycle implementation

---

### Task 3: Tool Transparency Violations
**Issue:** Raw tool output, no ToolInvocation → ToolResult wrapping

| File | Line | Violation | Impact |
|------|------|-----------|---------|
| `src/ui-blessed/render.ts` | 92-97 | Direct `appendToolResult()` without inspection | Not inspectable |
| `src/ui-blessed/adapter-blessed.ts` | 139 | Simulated tool output | Not real tool transparency |
| `src/tools/bash.ts` | Not reviewed | Unknown tool execution path | Need audit |
| `src/tools/*.ts` | Not reviewed | Unknown tool execution paths | Need audit |

**Root Cause:** Tools not wrapped in proper invocation/result pattern

---

### Task 4: Diff Visibility Violations
**Issue:** No automatic diff generation for file changes

| File | Line | Violation | Impact |
|------|------|-----------|---------|
| `src/ui-blessed/render.ts` | 99-137 | `appendDiff()` exists but not auto-triggered | File changes can occur silently |
| `src/tools/*.ts` | Not reviewed | File write/edit tools | Need to verify diff generation |
| `src/agent/grok-agent.ts` | Not reviewed | Agent file operations | Need to verify diff generation |

**Root Cause:** No automatic diff detection for file operations

---

### Task 5: Renderer Hygiene Violations
**Issue:** Internal tags leaking to UI, debug noise visible

| File | Line | Violation | Impact |
|------|------|-----------|---------|
| `src/ui-blessed/render.ts` | 30,34 | `{blue-fg}`, `{cyan-fg}` tags | Wrong colors, not locked |
| `src/ui-blessed/render.ts` | 126 | `{red-fg}`, `{green-fg}` tags | Not BrewTeal/BrewGold |
| `src/ui-blessed/enhanced-adapter.ts` | 72 | `Working: preparing response` | Internal noise visible |
| `src/ui-blessed/adapter-blessed.ts` | 72 | `Working: preparing response` | Internal noise visible |
| `src/ui-blessed/render.ts` | 42 | `TOOL_CALL`, internal state labels | Should be stripped |

**Root Cause:** No tag filtering or mapping in render pipeline

---

## 🔍 COMPLETED AUDITS

### Tool Execution Paths (COMPLETED)
**Review Results:**

#### `src/tools/bash.ts`
- **VIOLATION:** Returns ToolResult but no automatic diff generation
- **VIOLATION:** No file change detection for diff preview
- **GOOD:** Uses ConfirmationService properly
- **FILE OPS:** Directory changes (`cd`) - no diff needed
- **FILE OPS:** File read/write via exec - need file monitoring

#### `src/tools/text-editor.ts`
- **VIOLATION:** Generate diffs internally but not routed through unified renderer
- **VIOLATION:** File writes (str_replace, create, replace_lines, insert) not auto-detected
- **GOOD:** Has diff generation in `generateDiff()` method
- **GOOD:** Uses ConfirmationService properly
- **FILE OPS:** str_replace, create, replace_lines, insert, undo - ALL need diff auto-detection

#### `src/tools/morph-editor.ts`
- **VIOLATION:** Generate diffs internally but not routed through unified renderer
- **VIOLATION:** File writes (editFile) not auto-detected for diff preview
- **GOOD:** Has diff generation in `generateDiff()` method
- **GOOD:** Uses ConfirmationService properly
- **FILE OPS:** editFile - needs diff auto-detection

### Agent Operations (COMPLETED)
**Review Results:**

#### `src/agent/grok-agent.ts`
- **VIOLATION:** Uses multiple UI adapter calls causing multiple render passes
- **VIOLATION:** `appendUserMessage()` then streaming `appendAssistantChunk()` calls
- **VIOLATION:** No unified event emission through TimelineRenderer
- **ISSUE:** Agent orchestrates tools but doesn't wrap in ToolInvocation → ToolResult

#### `src/agent/tool-executor.ts`
- **FILE OPS:** Needs audit for tool wrapping patterns

#### `src/agent/index.ts`
- **FILE OPS:** Interface definitions, likely minimal violations

### File Operations (COMPLETED)
**Review Results:**

#### Files That Change Content:
1. **text-editor.ts:** str_replace, create, replace_lines, insert, undo
2. **morph-editor.ts:** editFile
3. **bash.ts:** Potentially file operations via exec (indirect)

#### Diff Generation Status:
- **text-editor.ts:** ✅ Has generateDiff() method
- **morph-editor.ts:** ✅ Has generateDiff() method
- **bash.ts:** ❌ No diff generation (needs file monitoring)

#### Integration Issues:
- All diffs generated internally but not auto-triggered in UI
- No unified diff event emission through TimelineRenderer
- Diffs returned in ToolResult.output but not displayed as separate DiffPreview events

---

## 📊 VIOLATION SUMMARY BY TASK

| Task | Critical Violations | Files Affected | Priority |
|------|-------------------|----------------|----------|
| 1 - Unified Renderer | 10+ | render.ts, enhanced-render.ts, index.ts, commands/ | HIGH |
| 2 - Message Grouping | 4 | render.ts, adapters | HIGH |
| 3 - Tool Transparency | 6+ | render.ts, tools/, adapters | HIGH |
| 4 - Diff Visibility | 3+ | render.ts, tools/, agent/ | HIGH |
| 5 - Renderer Hygiene | 8+ | render.ts, adapters | HIGH |

**Total Critical Violations:** 30+ across 15+ files

---

## 🎯 IMMEDIATE ACTION ITEMS

### Sprint 1.1 Priorities
1. **Audit tool execution paths** - Complete tool transparency mapping
2. **Map file operations** - Identify all file write/edit points
3. **Review TimelineRenderer usage** - Check if it's actually being used
4. **Identify all console.log calls** - Map direct output violations

### Blockers Identified
- Dual render systems (RenderManager + EnhancedRenderManager)
- No enforcement mechanism for unified pipeline
- Existing TimelineRenderer not integrated with current UI

### Risk Assessment
- **High Risk:** Architecture may require significant refactoring
- **Medium Risk:** May break existing functionality
- **Low Risk:** Well-defined acceptance criteria

---

## 📝 NEXT STEPS

1. Complete tool and file operation audits
2. Create architecture mapping document
3. Begin Task 1 implementation (unified renderer)
4. Update violation tracker as fixes are implemented

---

**Last Updated:** 2026-02-04  
**Auditor:** Opencode  
**Next Review:** After tool/path audits complete