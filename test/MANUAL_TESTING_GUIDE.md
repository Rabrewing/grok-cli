# 🧪 Manual Testing Guide for BrewGrok Blessed TUI

## 📋 Quick Start Testing

### 1. Start BrewGrok in Test Mode
```bash
cd /home/brewexec/grok-cli
npm run dev
# or
npm run dev:node
```

### 2. Enable Debug Mode (Optional but recommended)
```bash
export GROK_DEBUG=true
export GROK_TEST_MODE=active
```

---

## 🎯 Test Scenario 1: Diff Viewer Validation

### Task: Refactor a TypeScript Service
Copy and paste this task into BrewGrok:

```
Please refactor this UserService class to fix the performance issues and add missing features:

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  findUser(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }
  
  getAllUsers(): User[] {
    return this.users;
  }
  
  updateUser(id: number, updates: Partial<User>): boolean {
    const user = this.findUser(id);
    if (user) {
      Object.assign(user, updates);
      return true;
    }
    return false;
  }
}

Issues to fix:
1. addUser doesn't validate email format
2. findUser has O(n) complexity - add caching
3. getAllUsers returns direct array reference
4. Missing error handling
5. Add TypeScript strict mode compliance
6. Add user search functionality
7. Add pagination support
```

**What to Watch For:**
- ✅ Diff viewer should show side-by-side changes
- ✅ Added lines should be highlighted in green
- ✅ Removed lines should be highlighted in red  
- ✅ Modified lines should show both versions
- ✅ Performance should remain smooth with large diffs

---

## 🚀 Test Scenario 2: Performance Stress Test

### Task: Create Multiple Components Rapidly

```
Create a React dashboard with these components. Work on them in parallel:

1. Dashboard.tsx - Main dashboard with stats cards
2. UserProfile.tsx - User profile component with avatar, name, email
3. DataTable.tsx - Sortable, filterable data table
4. Charts.tsx - Line chart and bar chart components
5. SearchBar.tsx - Global search with autocomplete
6. Notifications.tsx - Toast notification system
7. Settings.tsx - App settings with theme toggle
8. LoadingSpinner.tsx - Reusable loading component

Requirements:
- Use TypeScript with strict mode
- Add proper error boundaries
- Include unit tests for each component
- Add documentation comments
- Use proper React hooks patterns
```

**Performance Tests:**
- ⏱️ Monitor response time during rapid task creation
- 💾 Check memory usage doesn't grow excessively
- 🎯 UI should remain responsive during parallel operations
- 📊 Check that `/task list` shows all tasks correctly

---

## 🔧 Test Scenario 3: Command System Validation

### Test All Available Commands:

1. **Status Command:**
   ```
   /status
   ```
   - Should show current directory, model, and UI state
   - Status bar should be gold-themed

2. **Models Command:**
   ```
   /models
   ```
   - Should list all Grok models
   - Current model marked with ► arrow
   - Try switching: `/model grok-4o-mini`

3. **Task Management:**
   ```
   /task add "Refactor Auth System" "Add JWT validation and refresh tokens"
   /task list
   /task focus 1
   ```
   - Tasks should appear with priority indicators
   - Status should update in real-time

4. **Command Palette:**
   ```
   /
   ```
   - Should show autocomplete with available commands
   - Help descriptions should be visible

---

## 💥 Test Scenario 4: Error Recovery and Edge Cases

### Stress Test with Invalid Operations:

```
Please perform these operations on the current directory:

1. Create a file with very long content (10000+ lines)
2. Try to delete node_modules directory (should require confirmation)
3. Attempt to modify a read-only file
4. Create circular import scenario
5. Generate syntax errors intentionally
6. Run git commands that would fail
7. Try to access non-existent files

Also test this scenario:
- Start a long-running operation
- Press Ctrl+C or Esc to cancel
- Verify the UI remains stable
- Check that partial results are handled gracefully
```

**What to Verify:**
- ❌ Dangerous operations should trigger confirmations
- ⚠️ Error messages should be clear and actionable
- 🔄 UI should recover from failures
- 🛡️ No crashes or infinite loops
- 📱 Interface remains responsive

---

## 📊 Test Scenario 5: Real-time Monitoring

### Performance Monitoring Commands:

During any operation, watch for:

1. **Memory Usage:**
   - Monitor with `/status` during large operations
   - Memory should not grow uncontrollably

2. **Rendering Performance:**
   - UI should update smoothly (60fps target)
   - No lag during rapid scrolling

3. **Event Processing:**
   - Commands should respond instantly
   - No backlog of unprocessed events

4. **Network/Tool Execution:**
   - Tool results should appear in clean reports
   - No raw tool spam in the interface

---

## 🎯 Critical Bug Validation

### Test the Idle Loop Fix:

1. **Rapid Message Test:**
   ```
   Send multiple messages quickly:
   - "Create a simple function"
   - "What is TypeScript?"  
   - "Help me debug this code"
   - "Show me file structure"
   - "Create a test file"
   
   Send these messages rapidly (within 10 seconds)
   ```

2. **Expected Behavior:**
   - ✅ No infinite "idle" message flooding
   - ✅ Clean message queue processing
   - ✅ No duplicate or spam messages
   - ✅ UI remains responsive

3. **Negative Test (What should NOT happen):**
   - ❌ Infinite "idle" messages
   - ❌ Scroll debug output spam
   - ❌ Memory consumption growing without bound
   - ❌ TUI becoming unresponsive

---

## 📈 Success Criteria

### ✅ Pass Conditions:
- Diff viewer shows clean, readable comparisons
- Performance remains smooth under load
- All commands work as expected
- No infinite loops or message spam
- Memory usage stays reasonable
- UI remains responsive during all operations
- Error recovery works gracefully

### ❌ Fail Conditions:
- Infinite idle loop bug reappears
- UI becomes unresponsive
- Memory leaks detected
- Commands fail or crash
- Diff viewer shows garbled output
- Performance degrades significantly

---

## 🔍 Debugging Tips

### If Issues Occur:

1. **Check Logs:**
   ```bash
   # Debug logs should show event processing
   export GROK_DEBUG=true
   npm run dev
   ```

2. **Monitor System Resources:**
   ```bash
   # Watch memory usage
   watch -n 1 'ps aux | grep node'
   
   # Or use htop for detailed monitoring
   htop
   ```

3. **Test in Clean Environment:**
   ```bash
   # Clear any cached data
   rm -rf ~/.grok-cache/
   
   # Restart with fresh session
   npm run dev
   ```

---

## 🎉 Validation Complete!

When you run through these scenarios:

1. **All commands should work smoothly**
2. **Diff viewer should show clear, readable changes**
3. **Performance should remain excellent**
4. **No infinite loops or message spam**
5. **Error handling should be graceful**

This comprehensive testing validates that:
- ✅ The critical idle loop bug is fixed
- ✅ Diff viewer works correctly
- ✅ Performance is optimized for production use
- ✅ BrewGrok is ready for day-to-day coding tasks

**Ready for production deployment!** 🚀