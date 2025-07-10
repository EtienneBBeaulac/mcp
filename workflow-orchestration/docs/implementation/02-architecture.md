# Architecture Guide

> 🏗️ **System Architecture & Design Decisions – Clean Architecture Edition (v1.2)**

[![Build](https://img.shields.io/github/actions/workflow/status/yourusername/workflow-orchestration/ci.yml?branch=main)]()
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Component Roles](#component-roles)
4. [Data Flow](#data-flow)
5. [Key Technical Decisions](#key-technical-decisions)
6. [Scalability & Monitoring](#scalability--monitoring)
7. [Migration Paths](#migration-paths)
8. [References](#references)

---

## System Overview

The MVP is fully implemented using **Clean Architecture**.  Responsibilities are split into **Domain**, **Application**, and **Infrastructure** layers wired together by a lightweight **dependency-injection container**.

```
┌───────────┐   JSON-RPC    ┌───────────────┐  Uses  ┌─────────────┐
│ AI Agent  │ ───────────▶ │  RPC Adapter   │ ─────▶ │  Use Cases  │
└───────────┘    stdin      │  (server.ts)  │        └─────┬──────┘
                     ▼      └───────────────┘              │DTOs
                  stdout                  calls            ▼
                                     ┌───────────────┐  pure logic
                                     │   Domain      │◀───────────
                                     └───────────────┘  Entities
```

---

## Architecture Layers

| Layer | Folder | Responsibilities | Depends On |
|-------|--------|------------------|------------|
| Domain | `src/domain` | Pure entities & error classes | – |
| Application | `src/application` | Use-cases, services, validation | Domain |
| Infrastructure | `src/infrastructure` | Adapters (RPC, storage, caching) | Application / Domain |

Cross-cutting concerns (logging, DI) live at the root.

---

## Component Roles

### RPC Server (Infrastructure)
* File: `src/infrastructure/rpc/server.ts`
* Exposes JSON-RPC 2.0 over **stdin/stdout**.
* Delegates each method (`workflow_list`, `workflow_get`, `workflow_next`, `workflow_validate`) to the corresponding **use-case**.
* Applies request-schema validation middleware and maps thrown domain errors to JSON-RPC error objects.

### Use-Cases (Application)
* Folder: `src/application/use-cases/`
* Pure functions with no side-effects.
* Injected with an `IWorkflowStorage` implementation and executed by the server.

### Validation Module (Application)
* Centralised `src/application/validation.ts` with **Ajv** JSON-schema compiler.
* Ensures both incoming RPC params and workflow documents adhere to spec.

### Storage Adapters (Infrastructure)
* Folder: `src/infrastructure/storage/`
* Implement the async `IWorkflowStorage` interface.
  * `FileWorkflowStorage` – reads workflow JSON files.
  * `InMemoryWorkflowStorage` – used in tests.
  * `SchemaValidatingWorkflowStorage` – wraps another storage, performing workflow-schema validation.
  * `CachingWorkflowStorage` – TTL cache wrapper.
* Adapters are composed via the DI container, yielding a single façade to the application layer.

### Dependency Injection Container
* File: `src/container.ts`
* Registers storage stack, error handler, and RPC server for production and for tests.

---

## Data Flow

1. **Request** – Agent sends JSON-RPC over stdin.
2. **RPC Layer** parses & validates parameters (Ajv).
3. **Use-Case** executes core logic, querying storage via injected adapter.
4. **Domain Error**? → mapped to JSON-RPC error.
5. **Response** emitted on stdout.

---

## Key Technical Decisions

* **Clean Architecture** chosen to isolate domain logic from transport/storage concerns and ease future adapter swaps (e.g., WebSocket transport).
* **TypeScript** with strict null-checks enabled.
* **Ajv** for high-performance JSON-schema validation (both RPC params & workflow documents).
* **Async I/O Only** – storage interface returns `Promise` to support remote stores later.
* **Thin Adapters** – server & storage wrappers are intentionally small; majority of logic resides in use-cases.

---

## Scalability & Monitoring

* **Horizontal Scaling** – Multiple server instances can run behind a queue; stdin transport can be swapped for HTTP without touching domain code.
* **Caching** – `CachingWorkflowStorage` reduces disk access; switch to Redis in distributed setups.
* **Observability** – Structured logging via the error handler + TODO: OTEL traces.

---

## Migration Paths

| From… | To (v1.2) | Migration Notes |
|-------|-----------|-----------------|
| `src/core/server.ts` JSON-RPC wrapper | `src/infrastructure/rpc/server.ts` | Now a pure adapter, delegates to use-cases. |
| Modules in `src/tools/` | Removed | Logic moved to application use-cases. |
| `src/workflow/*.ts` storage impls | `src/infrastructure/storage/*` | Names unchanged; import paths updated. |
| Ad-hoc validation utilities | `src/application/validation.ts` | Single point of truth; uses Ajv. |

---

## References

* [Getting Started Guide](01-getting-started.md)
* [Development Phases](03-development-phases.md)
* [API Specification](../../spec/mcp-api-v1.0.md)
* [Workflow Schema](../../spec/workflow.schema.json) 