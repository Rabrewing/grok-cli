# Grok CLI Installation Summary

**Date:** 2026-01-28  
**Version:** Grok CLI SDK 1.18 (v0.0.18)  
**Status:** ✅ Fully Operational  
**Owner:** RB (BrewVerse)  
**Implementer:** Big Pickle

---

## Installation Completed

### 1. Repository Setup

- **Cloned:** `https://github.com/superagent-ai/grok-cli.git` → `~/grok-cli/`
- **Version:** Checked out `@vibe-kit/grok-cli@0.0.18` (SDK 1.18 compatible)
- **Built:** Successfully compiled TypeScript to `dist/`

### 2. Critical Fix Applied (410 Live Search Deprecated)

**Problem:** Grok API was returning `410 "Live search is deprecated"` errors.

**Root Cause:** `search_parameters` being sent in API payload triggered deprecated live search behavior.

**Solution Applied:**

- **File:** `src/grok/client.ts`
  - Removed 2 instances of `if (searchOptions?.search_parameters)` blocks
  - Replaced with: `// NOTE: Do not send search_parameters (deprecated Live Search → 410).`
- **File:** `src/agent/grok-agent.ts`
  - Removed 3 instances of `{ search_parameters: { mode: "auto" } }`
  - Replaced with: `undefined`

**Result:** ✅ No more 410 errors - all search is local via `SearchTool` (ripgrep/files)

### 3. Global Configuration

**Environment Variables (Permanent):**

```bash
export GROK_API_KEY="your-api-key-here"
export GROK_MODEL="grok-code-fast-1"
```

- **Added to:** `~/.bashrc`
- **Available to:** All terminal sessions

### 4. Global Installation

**Method:** `pnpm link` (system-wide)
**Command:** `grok` available globally
**Version:** `grok --version` returns `1.0.1`
**Location:** `/home/brewexec/.local/share/pnpm/grok`

### 5. Integration with BrewVerse

- **Project:** Added to `brewenv_switch.sh` valid projects list
- **Environment:** `~/.env.grok-cli` created and linked
- **BrewDocs:** Structure created at `~/grok-cli/brewdocs/`
- **Jump Gate:** `brewjump` menu includes "Grok CLI" option (12)

### 6. Testing Verified

- ✅ Basic functionality: `grok -p "Say hello"` → Working response
- ✅ File operations: Directory listing, file inspection
- ✅ BrewVerse integration: `switch grok-cli` → Seamless
- ✅ No API errors: 410 Live Search issue resolved
- ✅ Local search only: Uses ripgrep/files, no remote calls
- ✅ Apply mode: `--apply` flag active for automatic file changes
- ✅ Output modes: `--diff` (default) and `--full-files` supported
- ✅ Confirmation bypass: `--yes` flag available for automated workflows

---

## Files Modified During Installation

### Core CLI Files

- `src/grok/client.ts` - Removed deprecated search_parameters usage
- `src/agent/grok-agent.ts` - Disabled automatic remote search
- `dist/` - Rebuilt with fixes applied

### Configuration Files

- `~/.bashrc` - Added GROK_API_KEY and GROK_MODEL
- `~/.env.grok-cli` - BrewVerse environment file
- `brewdocs/README.md` - Documentation created

### BrewVerse Integration

- `brewenv_switch.sh` - Updated project list
- `overlays/brewjump.sh` - Updated project routing
- `overlays/brewtools.sh` - Updated project arrays
- `overlays/brewhelp.sh` - Updated project listings
- `overlays/brewdev.sh` - Updated project references
- `.brewverse/README.md` - Updated examples
- `.brewverse/test.sh` - Updated test commands
- `.brewverse/backups/env_original_20260127_141512.local` - Updated backup

---

## Usage Instructions

### Basic Usage

```bash
# Interactive mode (auto-detects repo)
grok

# Single prompt
grok -p "Your prompt here"

# Version check
grok --version

# Help
grok --help
```

### Within Any Repository

```bash
cd /path/to/any/repo
grok  # Automatically enters repo mode with local search only
```

### BrewVerse Integration

```bash
# Switch to Grok CLI project environment
switch grok-cli

# Use BrewJump interactive menu
brewjump  # Select option 12 for Grok CLI
```

### API Configuration

```bash
# Temporary override
export GROK_MODEL="different-model-name"
grok

# Different API key (if needed)
export GROK_API_KEY="your-api-key"
grok
```

---

## Technical Specifications

### Build Information

- **TypeScript:** v4.9.5
- **Node Version:** >=16.0.0
- **Package Manager:** pnpm preferred, npm supported
- **Global Install:** System-wide via pnpm link

### Dependencies (Key)

- `@modelcontextprotocol/sdk`: ^1.17.0
- `openai`: ^5.10.1
- `axios`: ^1.6.0
- `chalk`: ^4.1.2
- `ripgrep-node`: ^1.0.0

### Search Configuration

- **Default Mode:** Local-only (ripgrep + file glob)
- **Remote Search:** Disabled (prevents 410 errors)
- **Search Parameters:** Never sent to API
- **Tool Choice:** Local tools preferred over web tools

---

## Troubleshooting

### Common Issues

1. **Command not found:**

   ```bash
   hash -r  # Refresh command cache
   which grok  # Should show /home/brewexec/.local/share/pnpm/grok
   ```

2. **API key issues:**

   ```bash
   echo $GROK_API_KEY  # Verify key is set
   export GROK_API_KEY="your-key"  # Temporary override
   ```

3. **410 errors:**
   - Should not occur with current fixes
   - If persists, check for old cached versions: `npm uninstall -g grok-cli`

### Verification Commands

```bash
# Test basic functionality
grok -p "Say READY"

# Verify local search works
cd ~/any-project
grok -p "Find TypeScript files in src/"

# Check BrewVerse integration
switch grok-cli && ls -la
```

---

## Next Steps

### Current Capabilities (Active)

1. ✅ **Apply Mode:** `--apply` flag implemented for automatic diff application
2. ✅ **Output Modes:** `--diff` (default) and `--full-files` supported
3. ✅ **Confirmation Bypass:** `--yes` flag available for automated workflows

### Potential Enhancements (Future)

1. **Repo Snapshots:** Add `grok snap` command for quick context
2. **Rules Engine:** Load repo-specific rules from `GROK_RULES.md`
3. **Task Packets:** Add `grok ticket` for structured task prompts

### Current Limitations

1. No repo snapshot generation
2. Static global rules (no per-repo overrides yet)

---

## Support & Documentation

- **Source:** `~/grok-cli/src/`
- **Configuration:** `~/.bashrc` environment variables
- **BrewVerse:** `brewenv_switch.sh` integration
- **Documentation:** `~/grok-cli/brewdocs/`

**Status:** Production Ready ✅  
**Last Tested:** 2026-01-28 09:15 UTC
