# External Workflow Repositories - Usage Examples

This document provides practical examples for using external workflow repositories with WorkRail.

## Table of Contents

1. [Simple Team Repository](#simple-team-repository)
2. [Multi-Repository Setup](#multi-repository-setup)
3. [Private Repository with Authentication](#private-repository-with-authentication)
4. [Hybrid Local + Remote](#hybrid-local--remote)
5. [HTTP Registry](#http-registry)
6. [Environment Variable Configuration](#environment-variable-configuration)
7. [Creating a Workflow Repository](#creating-a-workflow-repository)

---

## Simple Team Repository

**Scenario**: Small team wants to share workflows via GitHub.

### Setup

```typescript
// src/container.ts
import { createEnhancedMultiSourceWorkflowStorage } from './infrastructure/storage/enhanced-multi-source-workflow-storage';
import { SchemaValidatingWorkflowStorage } from './infrastructure/storage/schema-validating-workflow-storage';
import { CachingWorkflowStorage } from './infrastructure/storage/caching-workflow-storage';

export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createEnhancedMultiSourceWorkflowStorage({
    includeBundled: true,
    includeUser: true,
    includeProject: true,
    gitRepositories: [
      {
        repositoryUrl: 'https://github.com/myteam/workflows.git',
        branch: 'main',
        syncInterval: 60, // Sync every hour
        localPath: path.join(os.homedir(), '.workrail', 'team')
      }
    ]
  });
  
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  return new CachingWorkflowStorage(validatingStorage, 300_000);
}
```

### Environment Variables

```bash
# .env
WORKFLOW_GIT_REPO_URL=https://github.com/myteam/workflows.git
WORKFLOW_GIT_REPO_BRANCH=main
WORKFLOW_GIT_SYNC_INTERVAL=60
```

### Usage

```bash
# Initialize WorkRail (will clone the repository)
workrail init

# List workflows (includes team workflows)
workrail list

# Run a team workflow
workrail run team-code-review
```

---

## Multi-Repository Setup

**Scenario**: Organization wants to combine public community workflows with private team workflows.

### Configuration

```typescript
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createEnhancedMultiSourceWorkflowStorage({
    includeBundled: true,
    includeUser: true,
    includeProject: true,
    gitRepositories: [
      // Public community workflows (lower priority)
      {
        repositoryUrl: 'https://github.com/workrail/community-workflows.git',
        branch: 'main',
        syncInterval: 1440, // Daily sync
        localPath: path.join(os.homedir(), '.workrail', 'community')
      },
      // Private team workflows (higher priority)
      {
        repositoryUrl: 'https://github.com/mycompany/team-workflows.git',
        branch: 'production',
        syncInterval: 60, // Hourly sync
        authToken: process.env['GITHUB_TOKEN'],
        localPath: path.join(os.homedir(), '.workrail', 'team')
      }
    ]
  });
  
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  return new CachingWorkflowStorage(validatingStorage, 300_000);
}
```

### Priority Order

With this setup, workflows are loaded in this order (highest priority last):

1. Bundled workflows (built-in defaults)
2. User workflows (`~/.workrail/workflows`)
3. Community workflows (GitHub public repo)
4. Team workflows (GitHub private repo)
5. Project workflows (`./workflows`)

If the same workflow ID exists in multiple sources, the higher priority source wins.

---

## Private Repository with Authentication

**Scenario**: Company uses private GitHub repository with authentication.

### Generate GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `repo` (for private repositories)
4. Copy the token

### Configuration

```typescript
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createEnhancedMultiSourceWorkflowStorage({
    gitRepositories: [
      {
        repositoryUrl: 'https://github.com/mycompany/private-workflows.git',
        branch: 'production',
        authToken: process.env['GITHUB_TOKEN'], // Read from environment
        syncInterval: 60,
        maxFileSize: 2 * 1024 * 1024, // 2MB limit
        maxFiles: 100,
        localPath: path.join(os.homedir(), '.workrail', 'private')
      }
    ]
  });
  
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  return new CachingWorkflowStorage(validatingStorage, 300_000);
}
```

### Environment Setup

```bash
# Set your GitHub token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Or use a .env file
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx" >> .env
```

### Security Notes

- **Never commit tokens to version control**
- Use read-only tokens when possible
- Rotate tokens regularly
- Consider using GitHub Apps for organization-wide access

---

## Hybrid Local + Remote

**Scenario**: Development uses local workflows, production uses Git repository.

### Configuration

```typescript
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  const config = {
    includeBundled: true,
    includeUser: true,
    includeProject: true,
    gitRepositories: isDevelopment ? undefined : [
      {
        repositoryUrl: 'https://github.com/mycompany/workflows.git',
        branch: 'production',
        syncInterval: 60,
        authToken: process.env['GITHUB_TOKEN']
      }
    ]
  };
  
  const baseStorage = createEnhancedMultiSourceWorkflowStorage(config);
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  return new CachingWorkflowStorage(validatingStorage, 300_000);
}
```

### Usage

```bash
# Development: Use local workflows
NODE_ENV=development workrail run my-workflow

# Production: Use Git workflows
NODE_ENV=production workrail run my-workflow
```

---

## HTTP Registry

**Scenario**: Large organization with internal workflow registry.

### Configuration

```typescript
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createEnhancedMultiSourceWorkflowStorage({
    includeBundled: true,
    includeUser: true,
    includeProject: true,
    remoteRegistries: [
      {
        baseUrl: 'https://workflows.mycompany.internal',
        apiKey: process.env['WORKFLOW_REGISTRY_API_KEY'],
        timeout: 10000,
        retryAttempts: 3
      }
    ]
  });
  
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  return new CachingWorkflowStorage(validatingStorage, 300_000);
}
```

### Registry API Requirements

The registry must implement these endpoints:

```
GET  /workflows              → List all workflows
GET  /workflows/:id          → Get specific workflow
GET  /workflows/summaries    → List workflow summaries
POST /workflows              → Publish workflow (requires auth)
```

### Example Registry Response

```json
// GET /workflows
{
  "workflows": [
    {
      "id": "code-review",
      "name": "Code Review Workflow",
      "description": "Systematic code review process",
      "version": "1.0.0",
      "steps": [...]
    }
  ]
}
```

---

## Environment Variable Configuration

**Scenario**: Configure repositories without code changes.

### Git Repository (Simple)

```bash
# Single repository
export WORKFLOW_GIT_REPO_URL=https://github.com/myteam/workflows.git
export WORKFLOW_GIT_REPO_BRANCH=main
export WORKFLOW_GIT_AUTH_TOKEN=${GITHUB_TOKEN}
export WORKFLOW_GIT_SYNC_INTERVAL=60
```

### Git Repository (Advanced - JSON)

```bash
# Multiple repositories
export WORKFLOW_GIT_REPOS='[
  {
    "repositoryUrl": "https://github.com/workrail/community-workflows.git",
    "branch": "main",
    "syncInterval": 1440
  },
  {
    "repositoryUrl": "https://github.com/myteam/workflows.git",
    "branch": "production",
    "syncInterval": 60,
    "authToken": "'${GITHUB_TOKEN}'"
  }
]'
```

### Remote Registry

```bash
export WORKFLOW_REGISTRY_URL=https://workflows.mycompany.com
export WORKFLOW_REGISTRY_API_KEY=your-api-key-here
export WORKFLOW_REGISTRY_TIMEOUT=10000
```

### Disable Sources

```bash
# Disable bundled workflows
export WORKFLOW_INCLUDE_BUNDLED=false

# Disable user workflows
export WORKFLOW_INCLUDE_USER=false

# Disable project workflows
export WORKFLOW_INCLUDE_PROJECT=false
```

### Complete Example

```bash
# .env file for production
NODE_ENV=production

# Local directories
WORKFLOW_INCLUDE_BUNDLED=true
WORKFLOW_INCLUDE_USER=false
WORKFLOW_INCLUDE_PROJECT=true

# Git repository
WORKFLOW_GIT_REPO_URL=https://github.com/mycompany/workflows.git
WORKFLOW_GIT_REPO_BRANCH=production
WORKFLOW_GIT_AUTH_TOKEN=${GITHUB_TOKEN}
WORKFLOW_GIT_SYNC_INTERVAL=60

# Remote registry (optional)
# WORKFLOW_REGISTRY_URL=https://workflows.internal
# WORKFLOW_REGISTRY_API_KEY=${REGISTRY_KEY}
```

---

## Creating a Workflow Repository

### Step 1: Create Repository

```bash
# Create new repository
mkdir my-workflows
cd my-workflows
git init

# Create workflows directory
mkdir workflows

# Create README
cat > README.md << 'EOF'
# My Workflows

Shared workflow collection for our team.

## Usage

```bash
export WORKFLOW_GIT_REPO_URL=https://github.com/username/my-workflows.git
workrail init
workrail list
```

## Contributing

1. Add workflow to `workflows/` directory
2. Validate: `workrail validate workflows/your-workflow.json`
3. Submit pull request
EOF
```

### Step 2: Add Workflow

```bash
# Create a workflow
cat > workflows/code-review.json << 'EOF'
{
  "id": "code-review",
  "name": "Code Review Workflow",
  "description": "Systematic code review process",
  "version": "1.0.0",
  "steps": [
    {
      "id": "review-changes",
      "title": "Review Code Changes",
      "prompt": "Review the code changes for correctness, style, and best practices.",
      "guidance": [
        "Check for logic errors",
        "Verify coding standards",
        "Look for security issues"
      ]
    },
    {
      "id": "provide-feedback",
      "title": "Provide Feedback",
      "prompt": "Provide constructive feedback to the author.",
      "requireConfirmation": true
    }
  ]
}
EOF
```

### Step 3: Add CI Validation

```bash
# Create GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/validate.yml << 'EOF'
name: Validate Workflows

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install WorkRail
        run: npm install -g workrail
      
      - name: Validate Workflows
        run: |
          for file in workflows/*.json; do
            echo "Validating $file..."
            workrail validate "$file"
          done
      
      - name: Count Workflows
        run: |
          count=$(ls -1 workflows/*.json 2>/dev/null | wc -l)
          echo "Found $count workflow(s)"
EOF
```

### Step 4: Add .gitignore

```bash
cat > .gitignore << 'EOF'
# Node
node_modules/
npm-debug.log

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo
EOF
```

### Step 5: Commit and Push

```bash
git add .
git commit -m "Initial workflow repository setup"

# Create GitHub repository (via gh CLI or web UI)
gh repo create my-workflows --public --source=. --remote=origin --push

# Or manually
git remote add origin https://github.com/username/my-workflows.git
git branch -M main
git push -u origin main
```

### Step 6: Test

```bash
# Test the repository
cd /tmp
export WORKFLOW_GIT_REPO_URL=https://github.com/username/my-workflows.git
workrail init
workrail list
```

---

## Advanced: Dynamic Repository Configuration

**Scenario**: Load repositories based on user configuration file.

### Configuration File

```yaml
# ~/.workrail/config.yml
repositories:
  - url: https://github.com/workrail/community-workflows.git
    branch: main
    syncInterval: 1440
    
  - url: https://github.com/myteam/workflows.git
    branch: main
    syncInterval: 60
    authToken: ${GITHUB_TOKEN}
    
registries:
  - url: https://workflows.internal
    apiKey: ${REGISTRY_KEY}
```

### Load Configuration

```typescript
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';
import os from 'os';

function loadWorkflowConfig() {
  const configPath = path.join(os.homedir(), '.workrail', 'config.yml');
  
  if (!fs.existsSync(configPath)) {
    return {};
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.parse(content);
  
  // Expand environment variables
  return expandEnvVars(config);
}

export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const userConfig = loadWorkflowConfig();
  
  const baseStorage = createEnhancedMultiSourceWorkflowStorage({
    includeBundled: true,
    includeUser: true,
    includeProject: true,
    gitRepositories: userConfig.repositories || [],
    remoteRegistries: userConfig.registries || []
  });
  
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  return new CachingWorkflowStorage(validatingStorage, 300_000);
}
```

---

## Troubleshooting

### Repository Not Found

```bash
# Check Git URL
git ls-remote https://github.com/username/workflows.git

# Check authentication
git clone https://github.com/username/workflows.git /tmp/test
```

### Authentication Issues

```bash
# Verify token has access
curl -H "Authorization: token ${GITHUB_TOKEN}" \
  https://api.github.com/repos/username/workflows

# Test with explicit token
WORKFLOW_GIT_AUTH_TOKEN=ghp_xxx workrail init
```

### Sync Issues

```bash
# Force sync by removing cache
rm -rf ~/.workrail/team-workflows
workrail init

# Check sync logs
WORKFLOW_DEBUG=true workrail list
```

### Validation Failures

```bash
# Validate individual workflow
workrail validate workflows/my-workflow.json

# Check for common issues
- Missing required fields (id, name, description, version, steps)
- Invalid step structure
- Malformed JSON
```

---

## Best Practices

1. **Repository Organization**
   - Use descriptive repository names
   - Document workflows in README
   - Add CI validation
   - Use semantic versioning

2. **Security**
   - Never commit authentication tokens
   - Use read-only tokens when possible
   - Regularly audit workflow repositories
   - Use private repositories for sensitive workflows

3. **Performance**
   - Set appropriate sync intervals (60+ minutes)
   - Use caching (enabled by default)
   - Limit repository size (< 100 workflows)
   - Keep workflows under 1MB each

4. **Collaboration**
   - Use pull requests for changes
   - Require approvals for workflow changes
   - Document workflow purposes
   - Tag releases for stable versions

5. **Testing**
   - Validate workflows in CI/CD
   - Test workflows before merging
   - Use feature branches for development
   - Maintain a staging repository

