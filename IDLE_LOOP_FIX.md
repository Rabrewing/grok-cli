
# 🚨 CRITICAL: Idle Loop Bug Fix PROPOSAL

**Issue:** BrewGrok TUI is spamming "idle" messages in an infinite loop, making it unusable.

## Root Cause Analysis

The `unified-renderer.ts` has a `renderMessageGroups()` method that:
1. Is called for every single event (including system notices)
2. Has no protection against re-rendering the same content
3. Results in each event being appended to the timeline
4. Creates infinite "idle" message flood

## Immediate Fix Required

### Step 1: Add Render Time Tracking
```typescript
private lastRenderTime = 0;
private shouldRender(): boolean {
  const now = Date.now();
  return !this.lastRenderTime || now - this.lastRenderTime > 100;
}
```

### Step 2: Only Render When Content Changes
```typescript
private renderMessageGroups(): void {
  if (this.messageGroups.length === 0) {
    return;
  }

  if (!this.shouldRender()) {
    return; // Skip rendering - no changes to display
  }
  
  this.lastRenderTime = Date.now();
  // ... existing render logic
}
```

### Step 3: Fix Idle State Management
```typescript
private updateIdleState(isIdle: boolean): void {
  if (isIdle !== this.idleState) {
    this.idleState = isIdle;
    // Only update status display when state actually changes
  }
}
```

## Files to Modify

- `src/ui-blessed/unified-renderer.ts`
  - Add render time tracking
  - Fix render message groups to prevent unnecessary re-renders
  - Implement proper idle state management
  - Add status bar component (separate from transcript)

## Status: ⏳ IMPLEMENTATION PENDING

This bug makes the TUI completely unusable and must be fixed immediately before any other development work.

## Implementation Plan

1. **Add render time tracking** to prevent unnecessary re-renders
2. **Fix message group rendering** to only render when content actually changes
3. **Implement proper idle state** with separate status bar component
4. **Add render guard** to prevent infinite loops
5. **Test thoroughly** to ensure idle loop is eliminated

## Next Steps

The development team should review this proposal and approve immediate implementation of the critical fixes outlined above.

## Priority: CRITICAL
