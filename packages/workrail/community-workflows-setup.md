# Git-Based Community Workflows - Zero Code Setup

## Overview

Your MCP server already supports community workflows via the `WORKFLOW_STORAGE_PATH` environment variable. Here's how to set up Git-based community workflows without any code changes.

## Setup Steps

### 1. Create Community Workflow Repository

```bash
# Create a community workflow repository (one-time setup)
mkdir -p ~/community-workflows
cd ~/community-workflows
git init
git remote add origin https://github.com/EtienneBBeaulac/workrail-community-workflows.git

# Add first community workflow
cat > example-community-workflow.json << 'EOF'
{
  "id": "community-code-review",
  "name": "Community Code Review Workflow",
  "description": "A community-contributed workflow for thorough code reviews",
  "version": "1.0.0",
  "category": "community",
  "author": "community",
  "steps": [
    {
      "id": "analyze-changes",
      "name": "Analyze Code Changes",
      "description": "Review the code changes for potential issues",
      "guidance": "Look for: security vulnerabilities, performance issues, code style, test coverage"
    },
    {
      "id": "suggest-improvements",
      "name": "Suggest Improvements",
      "description": "Provide constructive feedback and suggestions",
      "guidance": "Focus on maintainability, readability, and best practices"
    }
  ]
}
EOF

git add .
git commit -m "Add community code review workflow"
git push origin main
```

### 2. Auto-Sync Script (Optional)

Create a sync script to automatically pull community workflows:

```bash
cat > sync-community-workflows.sh << 'EOF'
#!/bin/bash
set -e

COMMUNITY_DIR="$HOME/.workrail/community-workflows"
REPO_URL="https://github.com/EtienneBBeaulac/mcp-community-workflows.git"

# Create directory if it doesn't exist
mkdir -p "$COMMUNITY_DIR"

# Clone or pull updates
if [ -d "$COMMUNITY_DIR/.git" ]; then
    echo "Updating community workflows..."
    cd "$COMMUNITY_DIR"
    git pull origin main
else
    echo "Cloning community workflows..."
    git clone "$REPO_URL" "$COMMUNITY_DIR"
fi

echo "Community workflows updated successfully!"
EOF

chmod +x sync-community-workflows.sh
```

### 3. Server Configuration

Set environment variables to include community workflows:

```bash
# Option A: Add to your .env file
echo "WORKFLOW_STORAGE_PATH=$HOME/.workrail/community-workflows" >> .env

# Option B: Set in your deployment
export WORKFLOW_STORAGE_PATH="$HOME/.workrail/community-workflows"

# Option C: Multiple directories (user + community)
export WORKFLOW_STORAGE_PATH="$HOME/.workrail/workflows:$HOME/.workrail/community-workflows"
```

## 4. Usage

```bash
# 1. Sync community workflows (run periodically)
./sync-community-workflows.sh

# 2. Start server (automatically loads all workflow sources)
npm start

# 3. Community workflows are now available alongside bundled workflows!
```

## Workflow Sources (Priority Order)

1. **Bundled workflows** (shipped with server) - highest priority
2. **User workflows** (`~/.workrail/workflows`) - personal overrides
3. **Community workflows** (`$WORKFLOW_STORAGE_PATH`) - community contributions

Later sources can override earlier ones with the same ID.

## Benefits

✅ **Zero code changes** - uses existing multi-directory support
✅ **Automatic caching** - 5-minute cache TTL (configurable)
✅ **Schema validation** - all workflows validated automatically
✅ **Hot reloading** - changes appear after cache expiry
✅ **Community-friendly** - Git-based collaboration
✅ **Quality control** - PR review process for community workflows

## Advanced: Automated Sync

For production, set up a cron job to sync community workflows:

```bash
# Add to crontab (sync every hour)
0 * * * * /path/to/sync-community-workflows.sh > /dev/null 2>&1

# Or use a systemd timer for more control
```

## Community Workflow Guidelines

When contributing to the community repository:

1. **Follow naming convention**: `{category}-{name}-workflow.json`
2. **Include metadata**: author, version, category, description
3. **Test workflows** before submitting PRs
4. **Use semantic versioning** for updates
5. **Add documentation** for complex workflows 