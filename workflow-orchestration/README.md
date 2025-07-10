# Workflow Orchestration System

> 🚀 **A specification for transforming unreliable AI coding assistants into consistent, high-quality
development partners through structured workflows**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![Spec Version](https://img.shields.io/badge/spec-1.0.0-blue.svg)](specs/)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 🎯 Vision

LLMs are powerful but unpredictable. They hallucinate, lose context, attempt too much at once, and
produce inconsistent results. The Workflow Orchestration System aims to guide LLMs through proven
software development practices via structured, step-by-step workflows.

**Current Status**: This repository contains the complete specifications for the system.
Implementation is the next phase.

## 📋 What's Here

### Specifications (Complete ✅)

- **[System Overview](workflow-orchestration-mcp-overview.md)** - Comprehensive 74-page document covering:
   - Problem statement and vision
   - System architecture
   - Key concepts (prep/implement/verify pattern)
   - User interaction model
   - Future roadmap

- **[Workflow Schema](spec/workflow.schema.json)** - JSON Schema Draft 7 specification
   - Defines structure for all workflows
   - Validation rules and constraints
   - Extensible design for future features

- **[API Specification](spec/mcp-api-v1.0.md)** - Complete JSON-RPC 2.0 API
   - Four core tools: list, get, next, validate
   - Error handling standards
   - Request/response examples

- **[Example Workflows](spec/examples/)** - Reference implementations
   - Valid workflow example (authentication)
   - Invalid workflow for testing validation

### Documentation (Specification Phase 🚧)

- **[Implementation Guides](docs/implementation/)** - Development documentation
   - Architecture and design decisions
   - Development phases and roadmap
   - Testing strategy and quality assurance
   - Security and performance considerations

- **[Advanced Topics](docs/advanced/)** - Future enhancement documentation
   - Plugin system architecture
   - Multi-tenancy support
   - Scaling strategies
   - Workflow versioning

- **[Reference Documentation](docs/reference/)** - Complete reference materials
   - Configuration options
   - Troubleshooting guides
   - Recovery procedures

## 🚦 Running the Server

### Prerequisites
- Node.js 18+
- Run `npm install` to install dependencies

### Start the server (development)
```
npx ts-node src/cli.ts start
```

### Or, after building
```
npm run build
node dist/cli.js start
```

### Docker
```
docker-compose up
```

The server will listen for JSON-RPC requests on stdin/stdout.

### Storage & Caching (v1.1+)

The server now uses an abstract storage layer. By default it employs **file-based storage** that reads workflows from the local `spec/examples` directory.  A lightweight **in-memory TTL cache** avoids redundant disk reads—tune it via:

```bash
# default 300000 ms (5 min)
export CACHE_TTL=120000   # 2 min
```

Developers can supply alternative back-ends by implementing the `IWorkflowStorage` interface (see `src/types/storage.ts`).

> **Compatibility:** Legacy helpers (`loadAllWorkflows`, `getWorkflowById`, etc.) still work but are **deprecated**. Migrate to the interface for new code.

## 🏗️ Architecture Overview

The system will consist of:

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│    User     │────▶│   AI Agent      │────▶│ workflowlookup│
│             │     │ (Claude, etc)   │     │  MCP Server  │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │                        │
                            │◀───────────────────────┘
                            │   Structured Guidance  
```

## 🎨 Core Concepts

### The Workflow Structure
```json
{
   "id": "unique-identifier",
   "name": "Human-Friendly Name",
   "description": "What this workflow accomplishes",
   "preconditions": [
      "Prerequisites before starting"
   ],
   "clarificationPrompts": [
      "Questions to resolve ambiguities"
   ],
  "steps": [
    {
      "id": "step-1",
       "title": "Step Title",
       "prompt": "Detailed instructions...",
       "requireConfirmation": true
    }
  ],
   "metaGuidance": [
      "Best practices that apply throughout"
   ]
}
```

### The prep/implement/verify Pattern

Each implementation step follows:

- **PREP**: Understand the current state
- **IMPLEMENT**: Make focused changes
- **VERIFY**: Validate the results

## 🚀 Implementation Roadmap

### Phase 1: MVP (Next Step)

- [ ] Basic workflowlookup MCP server
- [ ] Core workflow storage and retrieval
- [ ] Step-by-step guidance engine
- [ ] Initial workflow library

### Phase 2: Enhanced Features

- [ ] Workflow validation
- [ ] State management
- [ ] Model-aware routing hints
- [ ] Extended workflow library

### Phase 3: Advanced Capabilities

- [ ] Non-linear workflow execution
- [ ] Dynamic adaptation
- [ ] Workflow marketplace

## 🤝 Contributing

This project is in the specification phase. You can contribute by:

1. **Reviewing Specifications**: Provide feedback on the current specs
2. **Proposing Workflows**: Design new workflows following the schema
3. **Planning Implementation**: Discuss technical approaches
4. **Improving Documentation**: Help clarify and expand the specs

## 📖 Key Documents

Start here to understand the system:

1. **[System Overview](workflow-orchestration-mcp-overview.md)** - Read this first for the complete vision
2. **[Documentation Index](docs/README.md)** - Complete documentation structure
3. **[Getting Started](docs/implementation/01-getting-started.md)** - Quick start guide
4. **[Architecture Guide](docs/implementation/02-architecture.md)** - System design and components
5. **[Workflow Schema](spec/workflow.schema.json)** - Understand workflow structure
6. **[API Specification](spec/mcp-api-v1.0.md)** - See how components communicate

## 🎯 Design Principles

1. **Local-First**: All processing happens on the user's machine
2. **Agent-Agnostic**: Works with any MCP-compatible AI agent
3. **Guided, Not Forced**: Provides rails, maintains agent autonomy
4. **Progressive Enhancement**: Simple agents work, advanced agents work better
5. **Transparent**: No hidden magic, just structured guidance

## 📊 Success Metrics (Planned)

When implemented, we aim to achieve:

- 70%+ workflow completion rates
- <200ms response times
- Reduced hallucination in guided tasks
- Consistent output quality across users

## 🙏 Acknowledgments

- Inspired by software engineering best practices
- Built on [Model Context Protocol (MCP)](https://modelcontextprotocol.org) by Anthropic
- Designed for the real-world challenges of AI-assisted development

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Want to help build the future of reliable AI development?</b><br>
  <a href="workflow-orchestration-mcp-overview.md">Read the Specs</a> •
  <a href="https://github.com/yourusername/workflow-orchestration-system/issues">Share Feedback</a> •
  <a href="https://github.com/yourusername/workflow-orchestration-system">Star on GitHub</a>
</p>
