# Release Script Dual-Mode Fix Implementation

## Problem Summary

The release script had three critical bugs:
1. **Multi-line argument parsing failure** - Newlines in `--features` broke the command chain
2. **Mode confusion** - Script ignored CLI flags and fell back to interactive mode
3. **Stdin pollution** - Publish prompt didn't wait for user input

## Root Cause

The script attempted to be "smart" by detecting missing arguments and automatically falling back to interactive mode. This created mode ambiguity that was exacerbated by:
- Partial argument parsing that couldn't handle multi-line values
- Stdin buffer pollution from attempted input clearing
- No clear separation between batch and interactive logic

## Solution: Hybrid Config + Explicit Mode

### Design Principles
1. **Explicit mode selection** - Default to batch mode, require `--interactive` flag
2. **Config file support** - Handle complex/multi-line inputs via `.releaserc`
3. **Clear separation** - Never mix batch and interactive logic
4. **Fail fast** - In batch mode, validate all requirements upfront

### Implementation Details

#### 1. Mode Detection
```bash
# Detect mode from arguments (before any parsing)
MODE="batch"  # default to batch mode
for arg in "$@"; do
    if [ "$arg" = "--interactive" ]; then
        MODE="interactive"
        break
    fi
done
```

#### 2. Config File Support
```bash
# .releaserc format
RELEASE_TYPE="minor"
RELEASE_DESC="Fixed dual-mode CLI interface bugs"
RELEASE_FEATURES="### Bug Fixes
- Fixed multi-line --features argument parsing issue
- Resolved unexpected interactive mode fallback
- Fixed publish prompt not waiting for user input"
RELEASE_PUSH=false
RELEASE_PUBLISH=false
```

#### 3. Batch Mode Validation
```bash
if [ "$MODE" = "batch" ]; then
    # Validate required arguments
    if [ -z "$TYPE" ]; then
        echo "❌ Missing required argument: --type"
        exit 1
    fi
fi
```

#### 4. Interactive Prompts Gated
```bash
# All prompts check mode first
if [ -z "$DESC" ] && [ "$MODE" = "interactive" ]; then
    read -r DESC < /dev/tty
fi
```

### New Features

1. **--interactive flag** - Explicit interactive mode
2. **.releaserc config** - Handles multi-line inputs cleanly
3. **--migrate flag** - Converts CLI args to config file
4. **Batch mode default** - CI/CD friendly

### Usage Examples

```bash
# Batch mode with config file
./release.sh

# Batch mode with arguments
./release.sh --type minor --desc "Bug fixes" --push --publish

# Interactive mode
./release.sh --interactive

# Convert complex command to config
./release.sh --type minor --desc "Fix" --features "Multi
line
features" --migrate
```

### Testing Results

✅ **Multi-line features work perfectly** - Config file handles complex formatting
✅ **No mode confusion** - Explicit flag removes ambiguity
✅ **No stdin pollution** - Removed all buffer clearing attempts
✅ **CI/CD compatible** - Batch mode fails fast with clear errors

### Migration Guide

For users with existing scripts/workflows:

1. **Add --interactive flag** to maintain old behavior:
   ```bash
   # Old
   ./release.sh
   
   # New (for same behavior)
   ./release.sh --interactive
   ```

2. **Use config file** for complex releases:
   ```bash
   # Create .releaserc with your defaults
   cp .releaserc.example .releaserc
   # Edit as needed, then just run:
   ./release.sh
   ```

3. **Convert existing commands**:
   ```bash
   # Your complex command with multi-line features
   ./release.sh --type minor --desc "..." --features "..." --migrate
   # Creates .releaserc automatically
   ```

### Benefits

1. **Reliability** - No more parsing failures or mode confusion
2. **Flexibility** - Both interactive and batch modes work perfectly
3. **Maintainability** - Clear code separation, easier to debug
4. **Automation** - CI/CD friendly by default
5. **User Experience** - Better error messages and migration path