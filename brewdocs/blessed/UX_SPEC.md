# 📜 BrewGrok Blessed TUI — Unified Panel UX & Interaction Spec

**Status:** Active
**Scope:** Blessed (terminal) UI only
**Out of Scope:** Model fallback chains, provider routing, LLM switching
**Timestamp:** 2026-02-03T19:45:00Z
**Author:** RB
**Version:** 1.0

---

## 1. Design Goals (Non-Negotiable)

* Single **unified terminal panel**
* Human, expressive interaction (not robotic)
* Clear execution lifecycle (no ambiguity)
* Touch + keyboard + mouse friendly
* Minimal noise, maximum clarity
* BrewVerse visual identity (BrewTeal)

---

## 2. Visual Identity & Theme

### Primary Accent Color

* **BrewTeal:** `#00C7B7`

### Color Usage Rules

| Element                | Color      |
| ---------------------- | ---------- |
| Active input bar       | BrewTeal   |
| Confirmation highlight | BrewTeal   |
| Cursor / caret         | BrewTeal   |
| Positive actions       | BrewTeal   |
| Errors                 | Red        |
| Removed diff (`-`)     | Red        |
| Added diff (`+`)       | BrewTeal   |
| System/meta text       | Muted gray |

❌ **Remove royal blue entirely**

---

## 3. Identity & Messaging

### Naming

* Replace all generic labels (`ASSISTANT`) with **BrewGrok**
* BrewGrok name appears **once per response block**, not per line

### Timestamps

* ❌ No timestamps on every line
* ✅ Optional single timestamp per *turn* (configurable)

---

## 4. Input Lifecycle (Critical Fix)

### Expected Flow

| Stage        | Behavior                     |
| ------------ | ---------------------------- |
| Typing       | Input visible                |
| Submit       | Input **clears immediately** |
| Confirmation | Input **disabled & hidden**  |
| Execution    | Input disabled               |
| Completion   | Input re-enabled, empty      |

### Hard Rules

* User input **must not persist** once submitted
* Confirmation owns the input channel exclusively
* No accidental resubmits

---

## 5. Confirmation Mode (Hard Lock)

### Trigger

Any action that:

* Writes files
* Executes shell commands
* Mutates state

### Confirmation UI

```
BrewGrok
I'm about to run:

  bash: ls -la brewdocs/blessed/

Proceed?
[Y] Yes   [N] No   [A] Yes to all   [Esc] Cancel
```

### Input Handling (Mandatory)

* Single keypress = action
* **NO Enter required**
* Accepted keys: `y`, `n`, `a`, `esc`
* All other input ignored
* Confirmation listener **pauses main input handler**

---

## 6. Execution Logging (De-Duplication)

### Problems to Eliminate

* Repeated `Result: bash (success)`
* Multiple identical stdout blocks
* Status spam without meaning

### New Rules

* Each tool execution logs **once**
* Show:

  * Tool name
  * Outcome (success / error)
  * Optional duration (compact)
* No duplicate stdout unless explicitly requested

---

## 7. "Thinking" State (Humanized)

### Replace

```
Thinking...
```

### With contextual, streamed intent:

* "Reviewing codebase..."
* "Preparing diff..."
* "Writing BrewDocs update..."
* "Executing command..."

Optional:

* Animated ellipsis
* Subtle BrewTeal indicator

❌ Avoid robotic repetition

---

## 8. Scrolling & Viewport (Blocker)

### Must Support

* Mouse wheel scrolling
* Trackpad scrolling
* Touch scrolling (touchscreen laptops)
* Arrow keys
* PageUp / PageDown
* Home / End
* Visual scrollbar indicator

### Notes

* Screen must be scrollable **at all times**
* Long outputs must not trap the user at bottom
* Scrolling must work during:

  * Output rendering
  * Diff views
  * Confirmation prompts

---

## 9. Diff View (Side-by-Side Enhancement)

### When Triggered

* File edits
* `str_replace`
* Patch previews
* BrewDocs updates

### Layout

```
┌──────────── OLD (-) ────────────┐ ┌──────────── NEW (+) ────────────┐
| - const foo = "bar"             | | + const foo = "baz"             |
| - legacyCall()                  | | + modernCall()                  |
└─────────────────────────────────┘ └─────────────────────────────────┘
```

### Behavior

* Scroll-synced columns
* Toggleable (inline / full screen)
* Red = removed
* BrewTeal = added

---

## 10. Mode Awareness

### Modes

* **Idle**
* **Thinking**
* **Confirming**
* **Executing**
* **Completed**
* **Error**

Each mode:

* Owns input behavior
* Owns rendering rules
* Prevents state overlap

---

## 11. Accessibility & Ergonomics

* Touch-friendly hit areas
* No reliance on Enter spam
* Clear focus state
* Predictable keyboard behavior

---

## 12. Explicitly Deferred (Do NOT Implement Yet)

* ❌ Model fallback chains
* ❌ Provider switching
* ❌ Cost routing
* ❌ Multi-LLM orchestration

These return **after BrewGrok UX is stable**.

---

## 13. Acceptance Criteria (Go / No-Go)

BrewGrok is considered **stable** when:

* Confirmation resolves with **single keypress**
* Input clears immediately on submit
* Scrolling works on touch + keyboard + mouse
* No duplicate execution logs
* BrewTeal replaces all royal blue
* Diff view renders side-by-side correctly
* BrewGrok feels conversational, not mechanical

---

## Implementation Notes

* Convert this into a **drop-in `brewdocs/blessed/UX_SPEC.md`**
* Break it into **3 implementation PRs** for Grok
* Map this spec directly to **Blessed widget structure**
* Create a **test checklist** so regressions don't sneak back in