# GROK INK — CONFIRMATION VERIFICATION SPEC

**Timestamp (ET):** 2026-02-04 00:15:00
**Goal:** Verify and enforce that tools cannot execute without approval, and UI uses inline confirmation.

---

## Task 1 — Confirm "cannot run without approval" at the tool layer

**Files to inspect:**
- `src/tools/confirmation-tool.ts`
- `src/utils/confirmation-service.ts`
- `src/tools/bash.ts`

**Requirements:**
- Every risky tool (bash, file write/edit) must call confirmation gate BEFORE executing.
- Gate returns boolean; if undefined/missing, treat as DENY.
- No code path allows execution without explicit YES.

**Acceptance:** Tools refuse to run without confirmation.

---

## Task 2 — Confirm UI uses INLINE confirmation (not modal)

**Files to inspect:**
- `src/ui-blessed/index.ts`
- `src/ui-blessed/render.ts`
- `src/ui-blessed/adapter-blessed.ts`
- `src/ui/components/confirmation-dialog.tsx` (should not be used for Blessed)

**Requirements:**
- No modal/screen overlay for confirmation.
- Confirmation appears as single inline line: `CONFIRM: prompt (y/n/a/esc)`
- Keys captured inline: y=yes, n=no, a=all, esc=cancel
- Focus stays in input.

**Acceptance:** Confirmation is inline, not blocking modal.

---

## Task 3 — Remove duplicate confirmation rendering

**Requirements:**
- Only one "Confirmation Requested" event emitted to UI.
- No raw tool event + separate confirmation UI.
- Normalized to: STATUS → INLINE_CONFIRM → TOOL_BLOCK or CANCELLED

**Acceptance:** One clean inline confirm prompt.

---

## Task 4 — Add smoke test

**Requirements:**
- Test simulates bash command request.
- Without confirmation → no execution.
- With 'y' → executes.
- Automated test fails if bash runs without approval.

**Acceptance:** Regression test in place.

---

## Expected UI Flow

- User: run bash pwd
- Status: Confirmation needed
- Inline: CONFIRM: Run bash command pwd? (y/n/a/esc)
- After y: tool output appears
- After n: Cancelled, no output