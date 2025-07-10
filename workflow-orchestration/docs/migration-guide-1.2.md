# Migration Guide – v1.2

> 🛠️ **Upgrade from pre-refactor (≤ v1.1) to Clean Architecture release v1.2**

This guide walks you through updating your code, scripts, and workflows to work with the new folder structure, dependency-injection container, and validation pipeline introduced in version **1.2.0**.

---

## Who should read this?
* You have an existing integration that imported server modules directly from `src/core/` or storage from `src/workflow/`.
* You rely on helper scripts in `src/tools/*`.
* You authored workflows that previously bypassed schema validation.

If you’re installing the project for the first time, follow the [Getting Started Guide](implementation/01-getting-started.md) instead.

---

## 1. Replace Import Paths

Old path examples:
```ts
import { Server } from "./src/core/server";
import { FileWorkflowStorage } from "./src/workflow/file-workflow-storage";
```

New paths:
```ts
import { server } from "./src/infrastructure/rpc/server";
import { FileWorkflowStorage } from "./src/infrastructure/storage/file-workflow-storage";
```

Quick mapping table:
| Old Path | New Path |
|----------|----------|
| `src/core/server.ts` | `src/infrastructure/rpc/server.ts` |
| `src/workflow/*.ts` | `src/infrastructure/storage/*` |
| `src/services/workflow-service.ts` | `src/application/services/workflow-service.ts` |
| `src/tools/*` | **removed** – logic now in use-cases |

Tip: search & replace `src/core/` → `src/infrastructure/rpc/` and `src/workflow/` → `src/infrastructure/storage/`.

---

## 2. Initialize the DI Container

Instead of instantiating classes manually, import the ready-made container:
```ts
import { container } from "./src/container";
const server = container.resolve("rpcServer");
```
The container wires storage adapters (cache → schema-validate → file) and the error handler automatically.

---

## 3. Update Build / Start Scripts

CLI entry point remains the same (`src/cli.ts`) but lives on new imports. Re-build:
```bash
npm install
npm run build   # or npx ts-node src/cli.ts start
```
Docker users: rebuild images (`docker-compose build`).

---

## 4. Migrate Workflows (JSON)

Workflows are still valid Draft-7 JSON Schema, but **1.2 adds stricter validation**.

Checklist:
1. **Unique step IDs** – duplicates now fail validation.
2. **Required fields** – `id`, `name`, `steps[]` are mandatory.
3. **No additional properties** – unknown fields cause errors.

Validate locally:
```bash
npx ts-node src/cli.ts validate /path/to/workflow.json
```

---

## 5. Remove Deprecated Tool Scripts

`src/tools/workflow_get.ts` and friends have been deleted. If your automation calls them directly, switch to JSON-RPC requests against the server or import the equivalent **use-case functions**:
```ts
import { getWorkflow } from "./src/application/use-cases/get-workflow";
```

---

## 6. Update Tests

* Switch to `InMemoryWorkflowStorage` for unit tests.
* Use the DI container to resolve use-cases with mocked storage.
* Ensure Jest config targets `<rootDir>/src` and `<rootDir>/tests` (already bundled).

---

## 7. Environment Variable Changes

| Var | Status | Notes |
|-----|--------|-------|
| `WORKFLOW_DIR` | **unchanged** | Location of workflow JSON files. |
| `CACHE_TTL` | **unchanged** | TTL for in-memory cache. |
| **NEW** `STORAGE_BACKEND` | optional | Future: choose `file`, `redis`, etc. (ignored in v1.2) |

---

## 8. Verify

1. `npm test` – all suites should pass.
2. Run a sample RPC call:
   ```bash
   echo '{"jsonrpc":"2.0","method":"workflow_list","id":1}' | node dist/cli.js start
   ```
3. Fix any validation errors reported.

---

## 9. Troubleshooting

| Symptom | Resolution |
|---------|------------|
| `MODULE_NOT_FOUND` for `src/tools/...` | Remove legacy imports; use use-case or RPC call. |
| JSON-RPC `-32004` ValidationError | Check workflow file or request parameters against schema. |
| Cache not updating after file change | Set `CACHE_TTL=0` during development or restart the server. |

---

## 10. Further Reading
* [Architecture Guide](implementation/02-architecture.md)
* [Getting Started](implementation/01-getting-started.md)
* [Testing Strategy](implementation/04-testing-strategy.md)

---

Happy upgrading! 🎉 