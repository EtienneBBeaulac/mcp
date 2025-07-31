# WorkRail: A Workflow Orchestration Server for MCP

> **Reliable, test-driven workflow execution for AI coding assistants – powered by Clean Architecture**

[![Build](https://img.shields.io/github/actions/workflow/status/EtienneBBeaulac/mcp/ci.yml?branch=main)]()
[![Version](https://img.shields.io/badge/version-0.0.1--alpha-orange)]()
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

---

## 🚀 Overview

Large language models are phenomenal at generating code, yet they often hallucinate, lose context, or perform unsafe operations.  
This server provides **structured, step-by-step workflows** (defined as JSON documents) that guide an AI assistant through safe, repeatable tasks.  
It follows [Model Context Protocol (MCP)](https://modelcontextprotocol.org) conventions and exposes a **JSON-RPC 2.0** interface on `stdin/stdout`.

See [Workrail Overview](workrail-mcp-overview.md)

### ✨ New in v0.1.0: Loop Support
WorkRail now supports powerful iteration patterns with four loop types:
- **while**: Continue while a condition is true
- **until**: Continue until a condition is met  
- **for**: Execute a fixed number of times
- **forEach**: Process items in an array

See the [Loop Documentation](docs/features/loops.md) for details.

---

## ✨ Key Features

* **Clean Architecture** – clear separation of **Domain → Application → Infrastructure** layers.
* **MCP Protocol Support** – Full MCP SDK integration with proper tool definitions and stdio transport.
* **Workflow Orchestration Tools** – 5 core tools for workflow management:
  - `workflow_list` - List all available workflows
  - `workflow_get` - Get detailed workflow information  
  - `workflow_next` - Get the next step in a workflow
  - `workflow_validate` - Advanced validation of step outputs with schema, context-aware, and composition rules
  - `workflow_validate_json` - Direct JSON workflow validation with comprehensive error reporting and actionable suggestions
* **Loop Support (v0.1.0)** – Four loop types for powerful iteration patterns:
  - `while` loops - Continue while a condition is true
  - `until` loops - Continue until a condition is met
  - `for` loops - Execute a fixed number of times
  - `forEach` loops - Process items in an array
* **Dependency Injection** – pluggable components are wired by `src/container.ts` (Inversify-style, no runtime reflection).
* **Async, Secure Storage** – interchangeable back-ends: in-memory (default for tests) and file-based storage with path-traversal safeguards.
* **Advanced ValidationEngine** – Three-tier validation system with JSON Schema validation (AJV), Context-Aware Validation (conditional rules), and Logical Composition (and/or/not operators) for comprehensive step output quality assurance.
* **Typed Error Mapping** – domain errors (`WorkflowNotFoundError`, `ValidationError`, …) automatically translate to proper JSON-RPC codes.
* **CLI Tools** – 
  - `validate` - Test workflow files locally with comprehensive error reporting
  - `migrate` - Automatically migrate workflows from v0.0.1 to v0.1.0
* **Comprehensive Test Coverage** – 81 tests passing, 7 failing (performance optimizations in progress), 88 total tests covering storage, validation, error mapping, CLI, and server logic.

---

## 🔧 Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### npx (once published to npm)

```json
{
  "mcpServers": {
    "workrail": {
      "command": "npx",
      "args": [
        "-y",
        "@exaudeus/workrail"
      ]
    }
  }
}
```

#### Local development

```json
{
  "mcpServers": {
    "workrail": {
      "command": "node",
      "args": [
        "/path/to/your/mcp/packages/workrail/dist/mcp-server.js"
      ]
    }
  }
}
```

### Usage with VS Code

For manual installation, add this to your User Settings (JSON) or `.vscode/mcp.json`:

#### npx (once published)

```json
{
  "mcp": {
    "servers": {
      "workrail": {
        "command": "npx",
        "args": [
          "-y",
          "@exaudeus/workrail"
        ]
      }
    }
  }
}
```

#### Local development

```json
{
  "mcp": {
    "servers": {
      "workrail": {
        "command": "node",
        "args": [
          "/path/to/your/mcp/packages/workrail/dist/mcp-server.js"
        ]
      }
    }
  }
}
```

---

## 📄 License

MIT – see [LICENSE](LICENSE).
