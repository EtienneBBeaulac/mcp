# Architecture Guide

> 🏗️ **System Architecture & Design Decisions for the Workflow Orchestration System (MVP Implementation Complete)**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![Spec Version](https://img.shields.io/badge/spec-1.0.0-blue.svg)](specs/)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Component Roles](#component-roles)
4. [Data Flow](#data-flow)
5. [Technical Decisions](#technical-decisions)
6. [Scalability & Monitoring](#scalability--monitoring)
7. [Migration Paths](#migration-paths)
8. [References](#references)

---

## System Overview

The Workflow Orchestration System is now fully implemented as described below. The architecture and patterns outlined here are realized in the codebase, and the MVP is tested and ready for onboarding and extension.

**High-Level Architecture:**

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│    User     │────▶│   AI Agent      │────▶│ workflowlookup│
│             │     │ (Claude, etc)   │     │  MCP Server  │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │                        │
                            │◀───────────────────────┘
                            │   Structured Guidance
```

---

## Architecture Patterns

### Modular Tool Architecture
- Each MCP tool is a separate module in `src/tools/` with a consistent interface.
- Enables clear separation of concerns, easy testing, and extensibility.

### Plugin-Based Validation System
- Validation rules are implemented as plugins for extensibility.
- Allows runtime loading and easy addition of new validation types.

### Simplified State Management
- Workflow state is managed in-memory for MVP, with persistence added in later phases.
- Supports session recovery, progress tracking, and distributed deployments.

---

## Component Roles

### MCP Server
- Handles JSON-RPC 2.0 communication in `src/core/server.ts`.
- Registers and manages all MCP tools.
- Coordinates workflow execution and validation.

### Workflow Engine
- Provides step-by-step guidance based on workflow state.
- Implements the prep/implement/verify pattern for each step.

### Validation System
- Validates workflows and step outputs using plugin-based rules in `src/workflow/validation.ts`.
- Ensures workflows conform to schema and best practices.

### State Manager
- Tracks workflow execution state.
- Supports in-memory and persistent storage backends.

### Workflow Storage
- Manages workflow definitions and metadata in `src/workflow/storage.ts`.
- Supports file-based storage for simplicity, with future database support.

### Orchestration Engine
- Manages workflow execution, state transitions, and guidance generation.
- Supports non-linear and adaptive workflows in advanced phases.

---

## Data Flow

### Request Flow
1. User requests a task via the agent.
2. Agent identifies and retrieves the appropriate workflow from the MCP server.
3. Agent executes workflow steps, requesting guidance and validation as needed.
4. MCP server manages state and provides structured guidance until workflow completion.

### State Management Flow
1. State is initialized on first request.
2. State is updated after each step.
3. State is persisted or cleaned up as needed.

### Error Handling Flow
1. Errors are detected and classified by the MCP server.
2. Appropriate error responses and recovery suggestions are provided.
3. Errors are logged for monitoring and debugging.

---

## Technical Decisions

- **JSON-RPC 2.0 Protocol:** Chosen for standardization, language-agnostic support, and robust error handling.
- **File-Based Workflow Storage:** Used for simplicity and version control; future migration to database possible.
- **Plugin-Based Validation:** Enables extensibility and separation of concerns.
- **Stateful Orchestration:** Maintains workflow state for long-running and complex workflows.

---

## Scalability & Monitoring

### Scalability
- **Horizontal Scaling:** Stateless MCP server design, shared storage, and load balancing.
- **Caching:** In-memory caching of workflows and state for performance.
- **Async Processing:** Use of asynchronous operations throughout.

### Monitoring & Observability
- **Request Metrics:** Track request volume and latency.
- **Error Rates:** Monitor and classify errors.
- **Resource Usage:** Track memory and CPU usage.
- **Workflow Usage:** Monitor workflow popularity and performance.

---

## Migration Paths

- **State Management:**
  - Start with in-memory state for MVP.
  - Add file-based or database persistence in later phases.
- **Workflow Storage:**
  - Begin with file-based storage.
  - Migrate to database or distributed storage as needed.
- **Validation Rules:**
  - Start with basic rules (file exists, code compiles).
  - Add advanced and custom rules in later phases.

---

## References

- [System Overview](../workflow-orchestration-mcp-overview.md)
- [Development Phases](03-development-phases.md)
- [Testing Strategy](04-testing-strategy.md)
- [Security Guide](05-security-guide.md)
- [API Specification](../spec/mcp-api-v1.0.md)
- [Workflow Schema](../spec/workflow.schema.json)

**Note:** The MVP implementation is complete and tested. For concrete examples, see the codebase in `src/` and the test suite in `tests/`. 