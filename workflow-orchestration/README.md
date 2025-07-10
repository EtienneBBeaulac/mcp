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
* **Dependency Injection** – pluggable components are wired by `src/container.ts` (Inversify-style, no runtime reflection).
* **Async, Secure Storage** – interchangeable back-ends: in-memory (default for tests) and file-based storage with path-traversal safeguards.
* **Centralised Validation** – JSON-schema validation for every RPC request + workflow schema validation.
* **Typed Error Mapping** – domain errors (`WorkflowNotFoundError`, `ValidationError`, …) automatically translate to proper JSON-RPC codes.
* **100 % Test Pass** – 17 focused Jest tests covering storage, validation, error mapping, and server logic.

---

## ⚡ Quick Start

### Prerequisites
* Node 18+
* `npm install`

### Development mode
```bash
npx ts-node src/cli.ts start
```
The server listens for JSON-RPC requests on **stdin/stdout**.

### Production build
```bash
npm run build
node dist/cli.js start
```

### Docker
```bash
docker-compose up
```

---

## 🗂️ Project Structure (post-refactor)

```
workflow-orchestration/
  ├─ src/
  │   ├─ domain/               # Pure entities & errors (no dependencies)
  │   ├─ application/          # Use-cases, services, validation (depends on domain)
  │   ├─ infrastructure/
  │   │   ├─ rpc/              # JSON-RPC server adapter
  │   │   └─ storage/          # File, in-memory, caching, schema-validating adapters
  │   ├─ container.ts          # DI registrations
  │   └─ index.ts              # Library entrypoint (exports container)
  ├─ tests/                    # Jest test suites (unit & integration)
  └─ docs/                     # Guides, reference, advanced topics
```

### Layered flow
```
Client (AI Agent)
   ▼  JSON-RPC (stdin/stdout)
Infrastructure  ── server.ts (adapter)
   ▼  calls
Application      ── use-cases (pure biz logic)
   ▼  operates on
Domain           ── entities & value objects
```

---

## 🔧 Configuration

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
All 17 suites must pass before any PR is merged.

---

## 📚 Documentation Tasks

We are updating the docs to match the refactor:
- Root README (this file) – ✅ done
- Implementation guides – _in progress_
- Migration guide 1.2 – _todo_
- Code snippet refresh – _todo_

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
