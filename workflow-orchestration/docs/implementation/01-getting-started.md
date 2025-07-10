# Getting Started Guide

> 🚀 **How to Run, Explore, and Contribute to the Workflow Orchestration Server (v1.2)**

[![Build](https://img.shields.io/github/actions/workflow/status/yourusername/workflow-orchestration/ci.yml?branch=main)]()
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

**Current Version:** `1.2.0` – MVP **fully implemented & tested** ✅

| Area | Status |
|------|--------|
| JSON-RPC API (`workflow_list`, `get`, `next`, `validate`) | **Done** |
| Clean Architecture refactor (Domain / Application / Infrastructure) | **Done** |
| Async storage adapters (file, in-memory, cache, schema-validating) | **Done** |
| Centralised request & workflow validation (Ajv) | **Done** |
| Typed error mapping & logging | **Done** |
| Jest test suite (17 tests) | **Passing** |
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
All suites must pass before a PR is merged.

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