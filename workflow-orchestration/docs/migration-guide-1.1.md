# Migration Guide → v1.1.0

_The 1.1 release introduces storage abstraction, caching, stronger error typing, and enforced naming rules._  Most users will see **no breaking changes**, but maintainers should review the notes below.

---

## 1. Storage Abstraction

| Old Usage                             | Status        | Replacement                             |
|---------------------------------------|---------------|-----------------------------------------|
| `import { getWorkflowById } ...`      | **Deprecated**| Use `fileWorkflowStorage.getWorkflowById()` or inject `IWorkflowStorage` |
| `listWorkflowSummaries()` helpers     | **Deprecated**| Same as above                           |

**Action:** Existing code continues to work, but please migrate to the interface on next touch.

## 2. Workflow Caching

`FileWorkflowStorage` now caches loaded workflows for `CACHE_TTL` milliseconds (default 5 min).  To adjust:

```bash
export CACHE_TTL=60000   # 1 minute
```

Setting `CACHE_TTL=0` disables caching.

## 3. Error Handling

Tool handlers now throw typed errors (`WorkflowNotFoundError`, `StepNotFoundError`).  If you catch errors downstream, prefer `instanceof MCPError` checks.

## 4. Naming Convention Enforcement

ESLint now enforces naming rules via `@typescript-eslint/naming-convention`.

```bash
npm install         # automatically fetches @typescript-eslint packages
npm run lint        # to view any violations
```

If you have local scripts that lint, ensure they run with updated config.

## 5. Roll-Back Instructions

Should you need to revert to the pre-1.1 code:

```bash
git checkout <last-pre-1.1-tag-or-commit>
```

No data migrations were performed; workflow JSON files remain untouched.

## 6. Future Work

* Legacy helper exports will be removed in **v2.0** – begin migration now.
* Cache hit/miss metrics will be surfaced via a logging plugin in a future release. 