# External Workflow Repositories

## Overview

WorkRail supports loading workflows from external sources, enabling teams to share workflow collections, consume community workflows, and maintain centralized workflow repositories. This document analyzes the available approaches and provides implementation guidance.

## Current State

WorkRail has **complete infrastructure** for external workflows but it's **not currently enabled** in the default configuration. The system includes:

1. **GitWorkflowStorage** - Clones/syncs workflows from Git repositories (GitHub, GitLab, Bitbucket)
2. **RemoteWorkflowStorage** - Fetches workflows from HTTP-based registries (npm-style)
3. **PluginWorkflowStorage** - Loads workflows from npm packages
4. **CommunityWorkflowStorage** - Combines multiple sources with graceful degradation

Currently, only **MultiDirectoryWorkflowStorage** is used (local directories only).

## Architecture Analysis

### Existing Implementations

```
┌─────────────────────────────────────────────────────────────────┐
│                   IWorkflowStorage Interface                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
         ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
         │ FileWorkflow │ │GitWorkflow│ │RemoteWorkflow│
         │   Storage    │ │  Storage  │ │   Storage    │
         └──────────────┘ └───────────┘ └──────────────┘
                 │
         ┌───────▼──────────────────────────────────┐
         │  MultiDirectoryWorkflowStorage (current) │
         │  - Bundled workflows                     │
         │  - User directory (~/.workrail)          │
         │  - Project directory (./workflows)       │
         │  - Custom paths (env vars)               │
         └──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│             Decorator Pattern (Currently Used)                   │
│  CachingWorkflowStorage                                          │
│    → SchemaValidatingWorkflowStorage                            │
│      → MultiDirectoryWorkflowStorage (base)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

The system follows these principles (from the MCP stateless model):

1. **Stateless** - Storage manages state, not the MCP server
2. **Composable** - Multiple storage sources can be combined
3. **Graceful Degradation** - Failures in one source don't break others
4. **Security-First** - URL validation, path traversal prevention, file size limits
5. **Decorator Pattern** - Validation and caching are orthogonal concerns

## Approach Comparison

### Option 1: Git-Based Repositories (RECOMMENDED)

**Use Case**: Teams want to share workflows via GitHub/GitLab

**Pros**:
- ✅ Version control built-in
- ✅ Pull request workflow for contributions
- ✅ Already implemented (`GitWorkflowStorage`)
- ✅ Works offline (local cache)
- ✅ Familiar to developers
- ✅ Free hosting (GitHub/GitLab)
- ✅ Automatic sync with configurable intervals

**Cons**:
- ❌ Requires Git installed
- ❌ Clone/pull operations add latency
- ❌ Not suitable for high-frequency updates

**Security Features**:
- Whitelisted Git hosting providers
- HTTPS-only (or git://)
- Command injection protection
- Path traversal prevention
- File size limits (default 1MB)
- Maximum file count limits (default 100)

**Best For**:
- Team workflow repositories
- Community workflow collections
- Organization-wide standard workflows
- Workflows requiring version control and review

### Option 2: HTTP-Based Registries

**Use Case**: npm-style workflow registry with REST API

**Pros**:
- ✅ Fast (no clone/pull)
- ✅ Already implemented (`RemoteWorkflowStorage`)
- ✅ Supports authentication (API keys)
- ✅ Good for high-frequency updates
- ✅ Retry logic with exponential backoff

**Cons**:
- ❌ Requires running a registry server
- ❌ No built-in version control
- ❌ Requires network for every access (unless cached)

**Best For**:
- Large organizations with internal registries
- High-frequency workflow updates
- Centralized workflow management systems
- Integration with existing artifact management

### Option 3: Plugin-Based (npm packages)

**Use Case**: Distribute workflows as npm packages

**Pros**:
- ✅ Already implemented (`PluginWorkflowStorage`)
- ✅ Leverages npm ecosystem
- ✅ Semantic versioning
- ✅ Dependency management

**Cons**:
- ❌ Requires npm/node_modules
- ❌ More complex workflow publishing
- ❌ Version lock-in

**Best For**:
- Public workflow distributions
- Integration with existing npm packages
- When you need strict dependency management

### Option 4: Hybrid Approach

Combine multiple sources with priority ordering:

```
Priority (highest to lowest):
1. Project-specific Git repo (team workflows)
2. User directory (personal workflows)
3. Community Git repo (public workflows)
4. Bundled workflows (defaults)
```

**Best For**: Most organizations

## Recommended Implementation

### Step 1: Extend MultiDirectoryWorkflowStorage to Support Git

Create a new `EnhancedMultiSourceWorkflowStorage` that combines all approaches:

```typescript
export interface MultiSourceWorkflowConfig {
  // Existing local directories
  includeBundled?: boolean;
  includeUser?: boolean;
  includeProject?: boolean;
  customPaths?: string[];
  
  // NEW: Git repositories
  gitRepositories?: GitWorkflowConfig[];
  
  // NEW: Remote registries
  remoteRegistries?: RemoteWorkflowRegistryConfig[];
  
  // NEW: Plugin directories
  pluginPaths?: string[];
}

export class EnhancedMultiSourceWorkflowStorage implements IWorkflowStorage {
  private storageInstances: IWorkflowStorage[] = [];

  constructor(config: MultiSourceWorkflowConfig = {}) {
    const instances: IWorkflowStorage[] = [];
    
    // 1. Bundled (lowest priority)
    if (config.includeBundled !== false) {
      instances.push(new FileWorkflowStorage(bundledPath));
    }
    
    // 2. User directory
    if (config.includeUser !== false) {
      instances.push(new FileWorkflowStorage(userPath));
    }
    
    // 3. Git repositories (NEW)
    for (const gitConfig of config.gitRepositories || []) {
      instances.push(new GitWorkflowStorage(gitConfig));
    }
    
    // 4. Remote registries (NEW)
    for (const remoteConfig of config.remoteRegistries || []) {
      instances.push(new RemoteWorkflowStorage(remoteConfig));
    }
    
    // 5. Project directory (highest priority)
    if (config.includeProject !== false) {
      instances.push(new FileWorkflowStorage(projectPath));
    }
    
    this.storageInstances = instances;
  }
  
  async loadAllWorkflows(): Promise<Workflow[]> {
    // Same logic as current MultiDirectoryWorkflowStorage
    // Later sources override earlier ones with same ID
  }
}
```

### Step 2: Configuration via Environment Variables

```bash
# Git repository support
export WORKFLOW_GIT_REPOS='[
  {
    "repositoryUrl": "https://github.com/myorg/workflows.git",
    "branch": "main",
    "syncInterval": 60
  },
  {
    "repositoryUrl": "https://github.com/workrail/community-workflows.git",
    "branch": "main",
    "syncInterval": 1440
  }
]'

# Or simpler single-repo format
export WORKFLOW_GIT_REPO_URL="https://github.com/myorg/workflows.git"
export WORKFLOW_GIT_REPO_BRANCH="main"
export WORKFLOW_GIT_AUTH_TOKEN="${GITHUB_TOKEN}"  # For private repos

# Remote registry support
export WORKFLOW_REGISTRY_URL="https://workflows.mycompany.com"
export WORKFLOW_REGISTRY_API_KEY="${REGISTRY_API_KEY}"
```

### Step 3: CLI Commands

Add CLI support for managing external repositories:

```bash
# Add a Git repository
workrail repo add github https://github.com/myorg/workflows.git

# List configured repositories
workrail repo list

# Sync all repositories
workrail repo sync

# Remove a repository
workrail repo remove github

# Show workflows from specific source
workrail list --source=github
```

## Implementation Example

### Example 1: Team Workflow Repository

```typescript
// container.ts - Update createDefaultWorkflowStorage()
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const config: MultiSourceWorkflowConfig = {
    // Existing local directories
    includeBundled: true,
    includeUser: true,
    includeProject: true,
    
    // NEW: Add team Git repository
    gitRepositories: [
      {
        repositoryUrl: process.env['WORKFLOW_TEAM_REPO'] || 
          'https://github.com/myorg/team-workflows.git',
        branch: 'main',
        syncInterval: 60, // Sync every hour
        authToken: process.env['GITHUB_TOKEN'],
        localPath: path.join(os.homedir(), '.workrail', 'team-workflows')
      }
    ]
  };
  
  const baseStorage = new EnhancedMultiSourceWorkflowStorage(config);
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  const cacheTtlMs = Number(process.env['CACHE_TTL'] ?? 300_000);
  return new CachingWorkflowStorage(validatingStorage, cacheTtlMs);
}
```

### Example 2: Multi-Repository Setup

```typescript
const config: MultiSourceWorkflowConfig = {
  includeBundled: true,
  includeUser: true,
  includeProject: true,
  gitRepositories: [
    // Public community workflows (low priority)
    {
      repositoryUrl: 'https://github.com/workrail/community-workflows.git',
      branch: 'main',
      syncInterval: 1440, // Daily
      localPath: path.join(os.homedir(), '.workrail', 'community')
    },
    // Team workflows (higher priority)
    {
      repositoryUrl: 'https://github.com/myorg/team-workflows.git',
      branch: 'main',
      syncInterval: 60, // Hourly
      authToken: process.env['GITHUB_TOKEN'],
      localPath: path.join(os.homedir(), '.workrail', 'team')
    }
  ]
};
```

### Example 3: Private Repository with Authentication

```typescript
const privateRepoConfig: GitWorkflowConfig = {
  repositoryUrl: 'https://github.com/mycompany/private-workflows.git',
  branch: 'production',
  authToken: process.env['GITHUB_TOKEN'],  // Personal access token
  syncInterval: 30,  // 30 minutes
  maxFileSize: 2 * 1024 * 1024,  // 2MB limit
  maxFiles: 50,
  localPath: path.join(os.homedir(), '.workrail', 'private')
};

const storage = new GitWorkflowStorage(privateRepoConfig);
```

## Security Considerations

### GitWorkflowStorage Security

1. **URL Validation**: Only whitelisted hosting providers
   - github.com, gitlab.com, bitbucket.org, dev.azure.com, sourceforge.net
   - Must use HTTPS or git:// protocol

2. **Command Injection Prevention**: All shell arguments are escaped

3. **Path Traversal Prevention**: All file operations validated against base directory

4. **Resource Limits**:
   - Max file size: 1MB (configurable)
   - Max files: 100 (configurable)
   - Clone timeout: 60 seconds
   - Pull timeout: 30 seconds

5. **Authentication**: Supports personal access tokens (not username/password)

### Best Practices

1. **Use Read-Only Tokens**: If using authentication, use tokens with read-only access
2. **Pin Branches**: Use specific branches or tags instead of 'main' in production
3. **Regular Audits**: Review workflow repositories regularly for unauthorized changes
4. **Access Control**: Use private repositories for sensitive workflows
5. **Sync Intervals**: Balance freshness vs. API rate limits (60+ minutes recommended)

## Repository Structure

External repositories should follow this structure:

```
workflow-repository/
├── README.md                    # Repository documentation
├── workflows/                   # Workflows directory (required)
│   ├── bug-investigation.json
│   ├── code-review.json
│   └── deployment.json
├── .gitignore
└── .github/
    └── workflows/
        └── validate.yml         # CI validation
```

### Required Conventions

1. **Directory Name**: Must be named `workflows/` (singular or plural)
2. **File Extension**: All workflow files must be `.json`
3. **File Naming**: Filename should match workflow ID (e.g., `bug-fix.json` → `"id": "bug-fix"`)
4. **Schema Compliance**: All workflows must validate against the WorkRail schema
5. **No Subdirectories**: Flat structure (no nested directories)

### Example Repository: workrail-community-workflows

Create a public repository for community workflows:

```bash
# Initialize repository
mkdir workrail-community-workflows
cd workrail-community-workflows
git init

# Create workflows directory
mkdir workflows

# Add validation workflow
mkdir -p .github/workflows
cat > .github/workflows/validate.yml << 'EOF'
name: Validate Workflows

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install WorkRail
        run: npm install -g @workrail/cli
      - name: Validate Workflows
        run: |
          for file in workflows/*.json; do
            workrail validate "$file"
          done
EOF

# Add README
cat > README.md << 'EOF'
# WorkRail Community Workflows

Community-contributed workflows for WorkRail.

## Usage

```bash
# Configure WorkRail to use this repository
export WORKFLOW_GIT_REPO_URL="https://github.com/username/workrail-community-workflows.git"

# Or add to your configuration
workrail repo add community https://github.com/username/workrail-community-workflows.git
```

## Contributing

1. Fork this repository
2. Add your workflow to `workflows/`
3. Ensure it validates: `workrail validate workflows/your-workflow.json`
4. Submit a pull request
EOF

# Commit and push
git add .
git commit -m "Initial repository setup"
git remote add origin https://github.com/username/workrail-community-workflows.git
git push -u origin main
```

## Testing Strategy

### Unit Tests

```typescript
describe('GitWorkflowStorage', () => {
  it('should clone repository and load workflows', async () => {
    const storage = new GitWorkflowStorage({
      repositoryUrl: 'https://github.com/test/workflows.git',
      branch: 'main',
      localPath: '/tmp/test-workflows'
    });
    
    const workflows = await storage.loadAllWorkflows();
    expect(workflows.length).toBeGreaterThan(0);
  });
  
  it('should sync repository on interval', async () => {
    // Test sync logic
  });
  
  it('should reject invalid URLs', () => {
    expect(() => new GitWorkflowStorage({
      repositoryUrl: 'https://malicious-site.com/repo.git'
    })).toThrow(SecurityError);
  });
});
```

### Integration Tests

```typescript
describe('EnhancedMultiSourceWorkflowStorage', () => {
  it('should prioritize sources correctly', async () => {
    // Setup: Same workflow ID in multiple sources
    // Verify: Later source wins
  });
  
  it('should gracefully degrade on source failure', async () => {
    // Setup: One source throws error
    // Verify: Other sources still work
  });
});
```

## Migration Path

### Phase 1: Create EnhancedMultiSourceWorkflowStorage (Week 1)
- [ ] Implement new storage class
- [ ] Add configuration support
- [ ] Unit tests

### Phase 2: Add CLI Support (Week 2)
- [ ] `workrail repo add/remove/list/sync`
- [ ] Environment variable support
- [ ] Documentation

### Phase 3: Community Repository (Week 3)
- [ ] Create public repository template
- [ ] Setup CI/CD validation
- [ ] Migration guide

### Phase 4: Production Rollout (Week 4)
- [ ] Update default configuration
- [ ] Update documentation
- [ ] Monitor adoption

## Recommendations

### For Small Teams (< 10 people)
**Use**: Git repository approach
- Single team repository
- Store in company GitHub/GitLab
- No additional infrastructure needed

### For Medium Organizations (10-100 people)
**Use**: Multi-repository approach
- Public community workflows (read-only)
- Team-specific repositories
- Optional: Internal registry for high-frequency updates

### For Large Enterprises (100+ people)
**Use**: Hybrid approach
- Internal HTTP registry for frequent updates
- Git repositories for team workflows
- Centralized workflow governance
- Consider plugin approach for distribution

## Open Questions

1. **Repository Discovery**: Should we support a "workflow marketplace" for discovering repos?
2. **Workflow Signing**: Should we support GPG signing for workflow verification?
3. **Private Repository Auth**: Support SSH keys in addition to tokens?
4. **Monorepo Support**: Support loading from subdirectories of larger repos?
5. **Webhook Support**: Real-time sync via webhooks instead of polling?

## Conclusion

**RECOMMENDED APPROACH**: Extend the existing `MultiDirectoryWorkflowStorage` to support `GitWorkflowStorage` as additional sources. This provides:

1. **Minimal Changes**: Builds on existing, tested infrastructure
2. **Backward Compatibility**: Existing local directories still work
3. **Flexibility**: Teams can choose their approach
4. **Security**: Already implemented and reviewed
5. **Familiarity**: Developers understand Git workflows

The infrastructure is already built, tested, and production-ready. The main work is:
1. Creating `EnhancedMultiSourceWorkflowStorage` (~ 100 LOC)
2. Adding configuration support (~ 50 LOC)
3. Adding CLI commands (~ 200 LOC)
4. Documentation and examples (this document)
5. Testing (~ 300 LOC)

**Total implementation effort**: 2-3 weeks for full feature
**Minimum viable implementation**: 1 week

