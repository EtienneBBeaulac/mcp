# Workflow Orchestration Server (MCP-Compatible)

> **Reliable, test-driven workflow execution for AI coding assistants – powered by Clean Architecture**

[![Build](https://img.shields.io/github/actions/workflow/status/yourusername/workflow-orchestration/ci.yml?branch=main)]()
[![Version](https://img.shields.io/badge/version-1.2.0-blue)]()
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

---

## 🚀 Overview

Large language models are phenomenal at generating code, yet they often hallucinate, lose context, or perform unsafe operations.  
This server provides **structured, step-by-step workflows** (defined as JSON documents) that guide an AI assistant through safe, repeatable tasks.  
It follows [Model Context Protocol (MCP)](https://modelcontextprotocol.org) conventions and exposes a **JSON-RPC 2.0** interface on `stdin/stdout`.

The codebase now implements the full MVP described in the original specification, refactored with Clean Architecture for long-term maintainability.

---

## ✨ Key Features

* **Clean Architecture** – clear separation of **Domain → Application → Infrastructure** layers.
* **MCP Protocol Support** – Full MCP SDK integration with proper tool definitions and stdio transport.
* **Workflow Orchestration Tools** – 4 core tools for workflow management:
  - `workflow_list` - List all available workflows
  - `workflow_get` - Get detailed workflow information  
  - `workflow_next` - Get the next step in a workflow
  - `workflow_validate` - Advanced validation of step outputs with schema, context-aware, and composition rules
* **Dependency Injection** – pluggable components are wired by `src/container.ts` (Inversify-style, no runtime reflection).
* **Async, Secure Storage** – interchangeable back-ends: in-memory (default for tests) and file-based storage with path-traversal safeguards.
* **Advanced ValidationEngine** – Three-tier validation system with JSON Schema validation (AJV), Context-Aware Validation (conditional rules), and Logical Composition (and/or/not operators) for comprehensive step output quality assurance.
* **Typed Error Mapping** – domain errors (`WorkflowNotFoundError`, `ValidationError`, …) automatically translate to proper JSON-RPC codes.
* **CLI Validation** – `validate` command for testing workflow files locally with comprehensive error reporting.
* **Comprehensive Test Coverage** – 81 tests passing, 7 failing (performance optimizations in progress), 88 total tests covering storage, validation, error mapping, CLI, and server logic.

---

## ⚡ Quick Start

### Prerequisites
* Node 18+
* `npm install`

### Development mode
```bash
npm run dev
```
The MCP server listens for JSON-RPC requests on **stdin/stdout**.

### Production build
```bash
npm run build
node dist/mcp-server.js
```

### Workflow validation (CLI utility)
```bash
npx ts-node src/cli.ts validate <workflow-file.json>
```

### Docker
```bash
docker-compose up
```

---

## 🔧 Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### npx (once published to npm)

```json
{
  "mcpServers": {
    "workflow-orchestration": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-workflow-orchestration"
      ]
    }
  }
}
```

#### Local development

```json
{
  "mcpServers": {
    "workflow-orchestration": {
      "command": "node",
      "args": [
        "/path/to/your/workflow-orchestration/dist/mcp-server.js"
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
      "workflow-orchestration": {
        "command": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-workflow-orchestration"
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
      "workflow-orchestration": {
        "command": "node",
        "args": [
          "/path/to/your/workflow-orchestration/dist/mcp-server.js"
        ]
      }
    }
  }
}
```

---

## 🗂️ Project Structure (post-refactor)

```
workflow-orchestration/
  ├─ src/
  │   ├─ domain/               # Pure entities & errors (no dependencies)
  │   ├─ application/          # Use-cases, services, ValidationEngine (depends on domain)
  │   ├─ infrastructure/
  │   │   ├─ rpc/              # JSON-RPC server adapter
  │   │   └─ storage/          # File, in-memory, caching, schema-validating adapters
  │   ├─ mcp-server.ts         # MCP server implementation (main entry point)
  │   ├─ cli.ts                # CLI utility for workflow validation
  │   ├─ container.ts          # DI registrations
  │   └─ index.ts              # Library entrypoint (exports container)
  ├─ tests/                    # Jest test suites (unit & integration)
  └─ docs/                     # Guides, reference, advanced topics
```

### Layered flow
```
Client (AI Agent)
   ▼  MCP Protocol (stdin/stdout)
MCP Server       ── mcp-server.ts (MCP SDK adapter)
   ▼  calls
Application      ── use-cases (pure biz logic)
   ▼  operates on
Domain           ── entities & value objects
```

---

## 🛠️ Environment Variables

| Env Var | Default | Description |
|---------|---------|-------------|
| `WORKFLOW_DIR` | `spec/examples` | Path where workflow JSON files are loaded (file storage) |
| `CACHE_TTL` | `300000` | Cache TTL in ms for `CachingWorkflowStorage` |
| `PORT` | _n/a_ | Not used (stdin/stdout transport) |

Change them before starting the server, e.g. `export WORKFLOW_DIR=/opt/workflows`.

---

## 🧪 Running Tests

```bash
npm test
```
Current status: 81 tests passing, 7 failing (performance optimizations in progress), 88 total tests.

---

## 📚 Documentation Status

| Component | Status | Updated |
|-----------|--------|---------|
| Root README | ✅ Complete | 2024-07-10 |
| Implementation guides | 🔄 In Progress | 2024-07-10 |
| Migration guide 1.2 | 🔄 In Progress | 2024-07-10 |
| Code snippet refresh | 🔄 In Progress | 2024-07-10 |

---

## 🤝 Contributing

1. **Fork & PR** – small, focused pull requests please.
2. **Follow the Architecture** – domain logic must remain framework-free; side effects live in infrastructure.
3. **Add Tests** – no code is accepted without unit tests.
4. **Run `npm run lint:fix`** before pushing.

See `docs/advanced/contributing.md` for full details.

---

## 📄 License

MIT – see [LICENSE](LICENSE).
