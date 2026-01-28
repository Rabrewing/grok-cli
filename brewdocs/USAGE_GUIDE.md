# Grok CLI Usage Guide

**Version:** 0.0.18 (SDK 1.18 compatible)  
**Last Updated:** 2026-01-28  
**Status:** ✅ Production Ready with Active Apply Mode

---

## Quick Start

### Basic Usage

```bash
# Interactive mode (auto-detects repo, shows diffs by default)
grok

# Single prompt and exit
grok -p "Your prompt here"

# Help and version
grok --help
grok --version
```

### File Operations with Apply Mode

```bash
# Preview changes (diff mode - default)
echo "Update package.json with new script" | grok -p "Update package.json with new script"

# Apply changes automatically
echo "Create new component file" | grok --apply -p "Create Button.tsx component"

# Show full file content instead of diffs
echo "Replace button content" | grok --full-files -p "Replace button text"

# Skip all confirmations
grok --apply --yes -p "Make multiple changes"
```

---

## Command Options

### Core Options

- `-p, --prompt <prompt>` - Process single prompt and exit (headless mode)
- `-k, --api-key <key>` - Grok API key (or set GROK_API_KEY env var)
- `-u, --base-url <url>` - Grok API base URL (or set GROK_BASE_URL env var)
- `-m, --model <model>` - AI model to use (or set GROK_MODEL env var)
- `-d, --directory <dir>` - Set working directory (default: current directory)

### Apply & Output Modes

- `--apply` - **Apply file changes automatically** (Active!)
- `--yes` - Skip confirmation prompts (works with --apply)
- `--diff` - Output unified diffs (default behavior)
- `--full-files` - Output full file contents instead of diffs

### Commands

- `git` - Git operations with AI assistance
- `mcp` - Manage MCP (Model Context Protocol) servers

---

## Mode Behaviors

### 1. Diff Mode (Default)

```bash
grok -p "Update file"
# → Shows unified diff preview
# → No file modifications unless --apply used
```

### 2. Full File Mode

```bash
grok --full-files -p "Replace content"
# → Shows complete file content
# → No file modifications unless --apply used
```

### 3. Apply Mode (Active)

```bash
grok --apply -p "Create new file"
# → Makes changes to disk automatically
# → Can be combined with --yes for no confirmations
```

---

## Workflow Examples

### File Creation and Editing

```bash
# Preview file creation
echo "Create utils.ts with helper functions" | grok -p "Create utils.ts"

# Create file immediately
grok --apply -p "Create utils.ts with helper functions"

# Create with full content display
grok --full-files -p "Create config.json file"
```

### Repository Operations

```bash
cd ~/your-project
grok  # Auto-detects repo, uses local search only

# Specific project directory
grok --directory ~/path/to/project

# Automated workflow
grok --apply --yes -p "Refactor components to TypeScript"
```

### Search Operations (Local Only)

```bash
# Search for text in current repo
grok -p "Find all TODO comments"

# Search for specific file patterns
grok -p "List all TypeScript files in src/"
```

---

## Output Formats

### Diff Mode (Default)

```
--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
 function old() {
-  return "old";
+  return "new";
 }
```

### Full File Mode

```
File contents of file.js:

function new() {
  return "new";
}

// Additional content...
```

### Apply Mode Output

```
✓ File created successfully.
✓ Updated file.js with 1 addition and 1 removal
✓ The file has been updated.
```

---

## Configuration

### Environment Variables

```bash
# Required: API Key
export GROK_API_KEY="your-api-key-here"

# Optional: Model Selection
export GROK_MODEL="grok-code-fast-1"

# Optional: API Base URL
export GROK_BASE_URL="https://api.x.ai/v1"
```

### Per-Project Configuration

Files checked (in order):

1. `AGENTS.md` - BrewVerse project agents
2. `GROK_RULES.md` - Repository-specific Grok rules
3. `.grok/rules.md` - Local rules in project
4. `~/.config/grok/rules.md` - User global rules
5. `~/brewdocs/GROK_GLOBAL_RULES.md` - BrewVerse global rules

---

## BrewVerse Integration

### Environment Switching

```bash
# Switch to Grok CLI project
switch grok-cli

# Use BrewJump menu
brewjump  # Select option 12 for Grok CLI
```

### Project Detection

```bash
# Works in any BrewVerse repo
cd ~/brewsearch && grok  # Detects BrewSearch
cd ~/brewpulse && grok  # Detects BrewPulse
cd ~/brewgold && grok  # Detects BrewGold Botanica
# etc.
```

---

## Troubleshooting

### Command Not Found

```bash
hash -r               # Refresh command cache
which grok           # Should show path
grok --version        # Verify installation
```

### API Issues

```bash
# Check API key
echo $GROK_API_KEY

# Test connectivity
grok -p "Say TEST"

# Verify model
echo $GROK_MODEL
```

### Apply Mode Issues

```bash
# Check if apply works
grok --apply -p "Create test.txt"
ls test.txt  # Should exist

# Check confirmations
grok --apply --yes -p "Auto changes"
```

### File Permission Issues

```bash
# Current directory
pwd

# Write permissions
touch test-write.txt && rm test-write.txt

# Alternative directory
grok --directory ~/alternative/path
```

---

## Key Features Status

### ✅ Implemented

- [x] Local search only (ripgrep + file system)
- [x] No 410 Live Search errors
- [x] Apply mode (--apply flag active)
- [x] Diff preview (default)
- [x] Full file mode (--full-files)
- [x] Confirmation bypass (--yes flag)
- [x] BrewVerse integration
- [x] Global installation via pnpm
- [x] Repo-aware mode

### 🚧 Planned for Future

- [ ] Repo snapshot command (`grok snap`)
- [ ] Task packet generation (`grok ticket`)
- [ ] Per-repo rules loading
- [ ] Enhanced diff rendering
- [ ] Apply rollback functionality

---

## Performance Notes

### Search Performance

- **Local ripgrep:** Fast, searches entire codebase in ~200ms for typical repos
- **File operations:** Instant for small files, <1s for <10KB
- **API response:** <2s average for xAI Grok models

### Memory Usage

- **CLI startup:** ~50MB base + model context
- **Large repos:** Search remains fast, no performance degradation
- **Apply operations:** Minimal overhead, direct file I/O

---

## Best Practices

### Workflow Recommendations

1. **Use --apply for automated tasks**
2. **Use default diff mode for review**
3. **Use --full-files for complete rewrites**
4. **Combine with --yes for CI/CD pipelines**
5. **Use local search - no web dependencies**

### Safety Guidelines

1. **Always review diffs before applying**
2. **Use git to track changes**
3. **Backup important files before mass operations**
4. **Test in non-production directories first**
5. **Use specific prompts for predictable results**

---

## Examples Repository Usage

### BrewSearch (Next.js)

```bash
cd ~/brewsearch
grok --apply -p "Add new search API endpoint"
```

### BrewPulse (Dashboard)

```bash
cd ~/brewpulse
grok --apply -p "Create analytics dashboard component"
```

### BrewGold (Documentation)

```bash
cd ~/brewgold
grok --full-files -p "Update API documentation"
```

---

## Integration Examples

### CI/CD Pipeline

```bash
#!/bin/bash
# Automated deployment script
export GROK_API_KEY="$CI_API_KEY"
export GROK_MODEL="grok-code-fast-1"

grok --apply --yes -p "Update version in package.json"
npm run build
npm run test
```

### VS Code Integration

```bash
# Open file in VS Code after editing
grok --apply -p "Update component" --open-in-cs
```

### Git Workflow

```bash
# AI-assisted commit workflow
grok --apply -p "Fix critical bug"
git add .
git commit -m "Fix critical bug (AI-assisted)"
git push
```

---

**For more examples, see the test files in `src/__tests__/`**  
**For issues, check troubleshooting section or use `grok --help`**
