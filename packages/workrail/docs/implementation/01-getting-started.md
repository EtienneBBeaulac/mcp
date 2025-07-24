# Getting Started Guide

> 🚀 **A developer's guide to setting up and running the system locally**

[![Build](https://img.shields.io/github/actions/workflow/status/EtienneBBeaulac/mcp/ci.yml?branch=main)]()
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [Project Status](#project-status)
2. [System Vision & Key Concepts](#system-vision--key-concepts)
3. [Running the Server](#running-the-server)
4. [Exploring the Codebase](#exploring-the-codebase)
5. [Contributing](#contributing)
6. [References & Next Steps](#references--next-steps)

---

## Project Status

**Current Version:** `0.0.1-alpha` – **MVP Development & Alpha Testing** ✅

| Area | Status |
|------|--------|
| JSON-RPC API (`workflow_list`, `get`, `next`, `validate`, `workflow_validate_json`) | **Done** |
| Clean Architecture refactor (Domain / Application / Infrastructure) | **Done** |
| Async storage adapters (file, in-memory, cache, schema-validating) | **Done** |
| Centralised request & workflow validation (Ajv) | **Done** |
| Typed error mapping & logging | **Done** |
| CLI validation command | **Done** |
| Version field reconciliation | **Done** |
| Jest test suite (81 passing, 7 failing, 88 total) | **Comprehensive** |
| Documentation refresh | *In progress* |

---

## System Vision & Key Concepts

The Workflow Orchestration Server guides AI coding assistants through reliable, repeatable steps defined in JSON workflows.  
It enforces best-practice patterns (prepare → implement → verify) and integrates with any MCP-compatible agent.

**Workflow snippet**
```json
{
  "id": "hello-world",
  "name": "Hello World Tutorial",
  "version": "0.0.1",
  "steps": [
    { "id": "prep", "prompt": "Create a hello world file", "requireConfirmation": true },
    { "id": "verify", "prompt": "Print contents of the file" }
  ]
}
```

---

## Running the Server

### Prerequisites
* Node 18+
* `npm install`

### Development
```bash
npx ts-node src/cli.ts start  # listens on stdin/stdout
```

### Workflow Validation

#### CLI Validation
```bash
npx ts-node src/cli.ts validate <workflow-file.json>  # validate workflow files
```

#### MCP Tool Validation
The server also provides direct JSON validation through the MCP protocol:
```bash
# Example: Validate workflow JSON directly via MCP tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"workflow_validate_json","arguments":{"workflowJson":"{\"id\":\"test\",\"name\":\"Test Workflow\",\"steps\":[]}"}}}' | node dist/mcp-server.js
```

Use `workflow_validate_json` when:
- Creating workflows programmatically
- Building workflow editors or management tools
- Integrating validation into CI/CD pipelines
- Providing real-time validation feedback

### Production
```bash
npm run build && node dist/cli.js start
```

### Docker
```bash
docker-compose up
```

Environment variables:
| Var | Default | Description |
|-----|---------|-------------|
| `WORKFLOW_DIR` | `spec/examples` | Folder containing workflow JSON files |
| `CACHE_TTL` | `300000` | TTL (ms) for CachingWorkflowStorage |

---

## Exploring the Codebase

Folder map:
```
src/
  domain/               # Entities & errors (pure)
  application/          # Use-cases, services, validation
  infrastructure/
    rpc/                # JSON-RPC adapter
    storage/            # File, in-memory, cache, schema-validating
  container.ts          # DI registrations
  index.ts              # Library exports
```

Run tests:
```bash
npm test
```
Current status: 81 tests passing, 7 failing (performance optimizations in progress), 88 total tests.

---

## Contributing

1. **Fork & branch** – use conventional commit messages.
2. **Follow the layers** – keep domain pure, put side-effects in infrastructure.
3. **Add tests** – new code must include unit tests.
4. **Run lint & tests** before pushing.

See `docs/advanced/contributing.md` for guidelines.

---

## References & Next Steps

* [Architecture Guide](02-architecture.md) – in-depth design.
* [API Spec](../../spec/mcp-api-v1.0.md) – JSON-RPC contract.
* [Workflow Schema](../../spec/workflow.schema.json) – authoring workflows.
* [Development Phases](03-development-phases.md) – roadmap.

Immediate doc work:
* Finish architecture & migration guides.
* Update code snippets across docs. 