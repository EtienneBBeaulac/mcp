# Testing Strategy Guide

> 🧪 **Quality & Testing Strategy – Updated for v1.2 (Clean Architecture implementation)**

[![Build](https://img.shields.io/github/actions/workflow/status/yourusername/workflow-orchestration/ci.yml?branch=main)]()
[![Coverage](https://img.shields.io/badge/coverage-90%25-green)]()
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Pyramid](#testing-pyramid)
3. [Current Coverage](#current-coverage)
4. [Testing Requirements](#testing-requirements)
5. [Approaches & Tooling](#approaches--tooling)
6. [Quality Gates](#quality-gates)

---

## Testing Philosophy

Our goal is to guarantee **high confidence with fast feedback**.  Tests must be deterministic, isolated, and easy to maintain.

Core principles:
1. **Test-Driven Development (TDD)** where practical.
2. **Focus on Pure Logic** – Domain & Application layers are unit-tested in isolation.
3. **Contract Tests** – RPC layer has schema-driven tests ensuring parameter validation & error mapping.
4. **No Sleep()** – async code is awaited, not timed.
5. **100% Reliability** – flaky tests are fixed or removed immediately.

---

## Testing Pyramid

```
    ┌─────────────┐
    │   E2E Tests │  ← Minimal happy-path CLI / Docker checks
    └─────────────┘
    ┌─────────────┐
    │Integration  │  ← RPC ↔ use-cases ↔ storage
    │   Tests     │
    └─────────────┘
    ┌─────────────┐
    │  Unit Tests │  ← Pure functions (use-cases, validation, errors)
    └─────────────┘
```

Target distribution: **60% unit / 30% integration / 10% E2E**.

---

## Current Coverage

| Suite | Passes | Notes |
|-------|--------|-------|
| Unit (17) | ✅ | covers use-cases, storage adapters, validation, error mapping |
| Integration (server) | ✅ | JSON-RPC requests through stdin/stdout mocked in tests |
| E2E (Docker) | ⏳ | planned for v1.3 |

`npm test` executes all Jest suites in <5 s locally.

---

## Testing Requirements

### Unit
* Business rules in Application layer.
* Domain error classes & mapping.
* Validation schemas (positive & negative cases).

### Integration
* RPC server end-to-end through use-cases.
* Storage composition (cache + schema validate + file).

### E2E (upcoming)
* Docker-compose spin-up, run a full workflow via CLI script.

### Security & Performance
* Path-traversal checks in FileStorage.
* Response time assertion (<200 ms) per RPC call.

---

## Approaches & Tooling

| Area | Tooling |
|------|---------|
| Test runner | **Jest** (ts-jest) |
| Coverage | `--coverage` produces lcov & badge update CI |
| Fast mocks | **jest.mock** for DI container overrides |
| Static analysis | **ESLint**, **TypeScript strict** |
| CI pipeline | GitHub Actions (`ci.yml`) – lint, test, coverage gate |

---

## Quality Gates

1. **Lint Passes** – `npm run lint` must return 0.
2. **Tests Pass** – `npm test` no failures.
3. **Coverage ≥ 90%** – enforced in jest config & CI badge.
4. **No TODO’s** – eslint rule `no-warning-comments` for production code.

These gates block merges via required GitHub checks. 