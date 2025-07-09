# Workflow Orchestration System

> 🚀 **Transform unreliable AI coding assistants into consistent, high-quality development partners
through structured workflows**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## The Problem

LLMs are powerful but unpredictable. They hallucinate, lose context, attempt too much at once, and
produce inconsistent results. Traditional prompt engineering only gets you so far.

## The Solution

The Workflow Orchestration System guides LLMs through proven software development practices via
structured, step-by-step workflows. Instead of hoping your AI assistant follows best practices, we
ensure it.

## 🎯 Key Benefits

- **Eliminate Hallucination**: Verification steps catch fabrications before they compound
- **Consistent Quality**: Every developer follows the same proven patterns
- **Model-Aware Execution**: Use the right LLM for each task (planning vs. implementation)
- **Local & Secure**: Runs entirely on your machine, no data leaves your system
- **Agent Agnostic**: Works with Claude Desktop, VS Code, or any MCP-compatible agent

## 🚀 Quick Start

Get up and running in under 5 minutes:

```bash
# Install the workflow server
npm install -g @modelcontextprotocol/server-workflow-lookup

# Add to your agent configuration (example for Claude Desktop)
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "workflow-lookup": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-workflow-lookup"]
    }
  }
}
```

Now restart Claude Desktop and try:

```
"Help me implement user authentication using the workflow system"
```

## 📊 Before & After

### Without Workflows

```
You: "Add JWT authentication to my API"
AI: *Attempts to modify 15 files at once, introduces bugs, 
    forgets error handling, inconsistent patterns*
Result: Hours of debugging and cleanup
```

### With Workflows

```
You: "Add JWT authentication to my API"
AI: "I'll use the authentication workflow. Let me start by understanding 
    your current setup..."
    
Step 1: Analyze existing auth ✓
Step 2: Create implementation plan ✓
Step 3: Implement with tests ✓
Step 4: Verify everything works ✓

Result: Production-ready, tested code following your patterns
```

## 🎨 How It Works

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│    You      │────▶│   AI Agent      │────▶│  Workflow    │
│             │     │ (Claude, etc)   │     │   Server     │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │                        │
                            │◀───────────────────────┘
                            │   Structured Steps     
                            ▼                        
                    ┌─────────────────┐
                    │ Quality Output  │
                    └─────────────────┘
```

The workflow server provides step-by-step guidance to your AI agent, ensuring it follows best
practices rather than going off track.

## 📚 Available Workflows

| Workflow | Description | Use Case |
|----------|-------------|----------|
| `ai-task-implementation` | Complete feature implementation with testing | Building new features |
| `code-review` | Systematic PR/MR review with categorized feedback | Code reviews |
| `debug-investigation` | Methodical debugging with hypothesis testing | Fixing bugs |
| `refactoring` | Safe, incremental code improvements | Technical debt |
| `documentation` | Comprehensive docs following best practices | Documentation |

List all workflows:

```bash
workflow-lookup list
```

## 🛠️ Installation & Setup

### For Claude Desktop

1. Install the server:
   ```bash
   npm install -g @modelcontextprotocol/server-workflow-lookup
   ```

2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "workflow-lookup": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-workflow-lookup"]
       }
     }
   }
   ```

3. Restart Claude Desktop

### For VS Code

Add to your workspace `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "workflow-lookup": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-workflow-lookup"]
      }
    }
  }
}
```

### For Other MCP Agents

See [Integration Guide](docs/integration.md) for Firebender, custom agents, and more.

## 🎯 Example: Building a Feature

Here's how the AI Task Implementation workflow guides development:

```
You: "I need to add image preview to chat messages"

AI: "I'll guide you through this using the AI Task Implementation workflow.

Step 1: Understanding Requirements
- Let me analyze the current chat implementation...
- I found ChatMessage.tsx and the message rendering logic
- A few clarifying questions:
  • Should images be resizable?
  • Do we need lazy loading?
  • What's the max file size?

Step 2: Creating Implementation Plan
[Switching to reasoning-optimized model]
- Phase 1: Extend message model for images
- Phase 2: Add image rendering component  
- Phase 3: Implement loading states
- Phase 4: Add tests

Step 3: Implementation
[Switching to tool-use-optimized model]
- PREP: Reading current ChatMessage model...
- IMPLEMENT: Adding imageUrl field...
- VERIFY: Changes compile and follow patterns ✓

[Continues through each phase...]

Step 4: Verification
- All tests passing ✓
- Image preview working ✓
- Loading states smooth ✓
- Follows existing patterns ✓

Complete! The implementation is ready for review."
```

## 📝 Creating Custom Workflows

Workflows are just JSON files. Create your own:

```json
{
  "id": "my-custom-workflow",
  "name": "My Custom Workflow",
  "description": "Description of what this accomplishes",
  "steps": [
    {
      "id": "step-1",
      "title": "First Step",
      "prompt": "Clear instructions for this step..."
    }
  ]
}
```

Save to `~/.modelcontextprotocol/workflows/custom/my-workflow.json`

See the [Workflow Authoring Guide](docs/workflow-authoring.md) for best practices.

## 📖 Documentation

- [System Overview](docs/overview.md) - Detailed architecture and concepts
- [Workflow Authoring](docs/workflow-authoring.md) - Create your own workflows
- [API Specification](specs/mcp-api-v1.0.md) - Technical API details
- [Examples](examples/) - Sample workflows and usage patterns

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- **Create Workflows**: Share your domain expertise through new workflows
- **Improve Existing Workflows**: Submit PRs with enhancements
- **Report Issues**: Help us identify problems and edge cases
- **Documentation**: Improve guides and examples

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📊 Project Status

### ✅ What's Working Now

- Core workflow engine with step-by-step guidance
- Integration with Claude Desktop, VS Code, and other MCP agents
- Built-in workflows for common development tasks
- Custom workflow support
- Local-first, secure architecture

### 🚧 Coming Soon

- Visual workflow builder
- Workflow marketplace for sharing
- Advanced state management (pause/resume)
- Workflow analytics and insights
- Multi-model orchestration

### ⚠️ Current Limitations

- Requires manual model switching for optimal results
- Linear workflow execution only (no branching yet)
- Limited to MCP-compatible agents

## 🙏 Credits

Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.org) by Anthropic.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Ready to make your AI coding assistant reliable?</b><br>
  <a href="#-quick-start">Get Started</a> •
  <a href="docs/overview.md">Learn More</a> •
  <a href="https://github.com/yourusername/workflow-orchestration-system">Star on GitHub</a>
</p>
