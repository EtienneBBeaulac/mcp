# Getting Started Guide

> 🚀 **Quick Start: Setting Up Your Development Environment for the Workflow Orchestration System**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![Spec Version](https://img.shields.io/badge/spec-1.0.0-blue.svg)](specs/)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Development Environment](#development-environment)
4. [First Workflow](#first-workflow)
5. [Common Tasks](#common-tasks)
6. [Troubleshooting](#troubleshooting)

---

## ⚠️ Important Note

**This is a specification project.** The Workflow Orchestration System is currently in the design and specification phase. The setup instructions below describe the planned development environment for when implementation begins.

For now, you can:
- Review the [System Overview](../workflow-orchestration-mcp-overview.md) to understand the vision
- Study the [Architecture Guide](02-architecture.md) to understand the design
- Examine the [API Specification](../spec/mcp-api-v1.0.md) to understand the interface
- Review the [Workflow Schema](../spec/workflow.schema.json) to understand workflow structure

---

## Prerequisites

Before starting development, ensure you have the following installed:

### Required Software

```bash
# Core requirements
Node.js 18+ (for MCP server implementation)
npm 8+ or yarn 1.22+
Git 2.30+

# Verify installations
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher
git --version   # Should be 2.30.0 or higher
```

### Optional but Recommended

```bash
# Development tools
Docker (for containerized testing)
VS Code with TypeScript extensions

# VS Code extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension ms-vscode.vscode-json
```

---

## Quick Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/workflow-orchestration-system.git
cd workflow-orchestration-system

# Install dependencies
npm install

# Verify setup
npm run verify-setup
```

### Step 2: Validate Dependencies

**⚠️ IMPORTANT**: Before proceeding, validate that MCP tools exist and work:

```bash
# Check MCP tool availability
npm search @modelcontextprotocol/dev-tools
npm search @modelcontextprotocol/inspector

# Test MCP inspector functionality
npx @modelcontextprotocol/inspector --help

# If tools don't exist, use alternative setup:
npm install -g @modelcontextprotocol/cli
# or
# Use local development without global tools
```

### Step 3: Start Development Server

```bash
# Start development server
npm run dev:server

# In another terminal, test with MCP inspector
npx @modelcontextprotocol/inspector
```

### Step 4: Configure Agent Framework

Create a local development configuration for your preferred agent framework:

**For Firebender:**
```json
// firebender.dev.json
{
  "mcpServers": {
    "workflow-lookup": {
      "command": "npm",
      "args": ["run", "dev:server"],
      "cwd": "./workflow-orchestration-system"
    }
  }
}
```

**For Claude Desktop:**
```json
// claude_desktop.dev.json
{
  "mcpServers": {
    "workflow-lookup": {
      "command": "npm",
      "args": ["run", "dev:server"],
      "cwd": "./workflow-orchestration-system"
    }
  }
}
```

---

## Development Environment

### Essential Development Tools

```bash
# Install global development tools
npm install -g typescript
npm install -g eslint
npm install -g prettier
npm install -g jest

# Verify installations
tsc --version
eslint --version
prettier --version
jest --version
```

### VS Code Configuration

Create `.vscode/settings.json` for consistent development experience:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["typescript", "javascript"],
  "files.associations": {
    "*.json": "jsonc"
  }
}
```

### Environment Variables

Create `.env.local` for local development:

```bash
# Development configuration
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# MCP server configuration
MCP_SERVER_HOST=localhost
MCP_SERVER_PORT=3000

# Workflow storage
WORKFLOW_STORAGE_PATH=./workflows
WORKFLOW_STORAGE_TYPE=file

# Security settings
MAX_INPUT_SIZE=1048576
RATE_LIMIT_PER_MINUTE=100
```

---

## First Workflow

### Create Your First Workflow

1. **Create a simple workflow file:**

```json
// workflows/examples/my-first-workflow.json
{
  "id": "hello-world",
  "name": "Hello World Workflow",
  "description": "A simple workflow to test the system",
  "preconditions": [
    "Development environment is set up",
    "MCP server is running"
  ],
  "clarificationPrompts": [
    "What is your name?",
    "What programming language do you prefer?"
  ],
  "steps": [
    {
      "id": "greet",
      "title": "Greet the user",
      "prompt": "Create a simple greeting message for the user",
      "requireConfirmation": true
    },
    {
      "id": "setup",
      "title": "Setup development environment",
      "prompt": "Help the user set up their development environment",
      "askForFiles": true
    }
  ],
  "metaGuidance": [
    "Always be helpful and clear",
    "Provide step-by-step instructions",
    "Ask for clarification when needed"
  ]
}
```

2. **Test the workflow:**

```bash
# Start the development server
npm run dev:server

# In another terminal, test the workflow
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "workflow_get",
    "params": {"id": "hello-world"}
  }'
```

3. **Verify the response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": "hello-world",
    "name": "Hello World Workflow",
    "description": "A simple workflow to test the system",
    "preconditions": [...],
    "clarificationPrompts": [...],
    "steps": [...],
    "metaGuidance": [...]
  }
}
```

---

## Common Tasks

### Adding a New Workflow

1. **Create the workflow file:**

```bash
# Create a new workflow file
touch workflows/core/my-new-workflow.json
```

2. **Define the workflow structure:**

```json
{
  "id": "my-new-workflow",
  "name": "My New Workflow",
  "description": "Description of what this workflow does",
  "preconditions": [
    "List of prerequisites"
  ],
  "clarificationPrompts": [
    "Questions to resolve ambiguities"
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "First Step",
      "prompt": "Detailed instructions for this step",
      "requireConfirmation": true
    }
  ],
  "metaGuidance": [
    "Best practices that apply throughout"
  ]
}
```

3. **Validate the workflow:**

```bash
# Validate against schema
npm run validate-workflow workflows/core/my-new-workflow.json
```

### Testing Workflows

1. **Unit tests:**

```bash
# Run unit tests
npm test

# Run specific test file
npm test -- --testNamePattern="WorkflowListTool"
```

2. **Integration tests:**

```bash
# Run integration tests
npm run test:integration

# Test with real agent
npm run test:e2e
```

### Debugging

1. **Enable debug logging:**

```bash
# Set debug level
export LOG_LEVEL=debug

# Start server with debug
npm run dev:server -- --debug
```

2. **Use MCP inspector:**

```bash
# Start inspector
npx @modelcontextprotocol/inspector

# Connect to your server
# Follow the inspector prompts
```

---

## Troubleshooting

### Common Issues

#### 1. **MCP Server Won't Start**

**Symptoms**: Server fails to start or crashes immediately

**Solutions**:
```bash
# Check Node.js version
node --version  # Should be 18+

# Check dependencies
npm install

# Check port availability
lsof -i :3000  # Check if port is in use

# Start with verbose logging
npm run dev:server -- --verbose
```

#### 2. **Workflow Not Found**

**Symptoms**: `workflow_get` returns "Workflow not found" error

**Solutions**:
```bash
# Check workflow file exists
ls -la workflows/core/

# Validate workflow JSON
npm run validate-workflow workflows/core/workflow-name.json

# Check file permissions
chmod 644 workflows/core/workflow-name.json
```

#### 3. **Agent Can't Connect**

**Symptoms**: Agent reports connection errors

**Solutions**:
```bash
# Check server is running
curl http://localhost:3000/health

# Check MCP configuration
cat firebender.dev.json  # or your agent config

# Test with MCP inspector
npx @modelcontextprotocol/inspector
```

#### 4. **Performance Issues**

**Symptoms**: Slow response times or timeouts

**Solutions**:
```bash
# Check system resources
top
free -h

# Enable performance monitoring
export ENABLE_METRICS=true
npm run dev:server

# Check for memory leaks
npm run test:memory
```

### Getting Help

1. **Check the logs:**
```bash
# View server logs
tail -f logs/server.log

# View error logs
tail -f logs/error.log
```

2. **Run diagnostics:**
```bash
# Run system diagnostics
npm run diagnose

# Check configuration
npm run validate-config
```

3. **Create an issue:**
- Include error messages and logs
- Describe your environment
- Provide steps to reproduce

---

## Next Steps

Now that you have the development environment set up:

1. **Read the Architecture Guide**: [02-architecture.md](02-architecture.md)
2. **Understand the API**: [API Specification](../spec/mcp-api-v1.0.md)
3. **Study Workflow Design**: [Workflow Schema](../spec/workflow.schema.json)
4. **Join the Community**: [GitHub Discussions](https://github.com/yourusername/workflow-orchestration-system/discussions)

---

**Note**: This guide describes the planned development environment. The actual implementation will follow this structure when development begins. 