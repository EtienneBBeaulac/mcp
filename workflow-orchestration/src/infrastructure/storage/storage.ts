// Re-export new modular storage pieces and compose them to keep backward compatibility

import { FileWorkflowStorage, createDefaultFileWorkflowStorage } from './file-workflow-storage';
import { SchemaValidatingWorkflowStorage } from './schema-validating-workflow-storage';
import { CachingWorkflowStorage } from './caching-workflow-storage';
import { MultiDirectoryWorkflowStorage, createMultiDirectoryWorkflowStorage } from './multi-directory-workflow-storage';
// (intentionally left blank – no direct dependency on Workflow types here)

// -----------------------------------------------------------------------------
// Default composition helper – now exposed as a factory for DI friendliness
// -----------------------------------------------------------------------------

/**
 * Create the default, production-grade storage stack consisting of:
 *   1. Multi-directory workflow storage (bundled + user + project + custom)
 *   2. JSON-Schema validation decorator
 *   3. In-memory TTL cache decorator
 *
 * The function is intentionally side-effect-free – each invocation returns a
 * brand-new, fully-composed instance so that callers can choose whether to
 * share or isolate storage state.
 */
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createMultiDirectoryWorkflowStorage();
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  const cacheTtlMs = Number(process.env['CACHE_TTL'] ?? 300_000); // 5 minutes default
  return new CachingWorkflowStorage(validatingStorage, cacheTtlMs);
}

/**
 * Create the legacy single-directory storage (for backward compatibility)
 */
export function createLegacyWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createDefaultFileWorkflowStorage();
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  const cacheTtlMs = Number(process.env['CACHE_TTL'] ?? 300_000); // 5 minutes default
  return new CachingWorkflowStorage(validatingStorage, cacheTtlMs);
}

// Re-export classes for external usage if needed
export {
  FileWorkflowStorage,
  SchemaValidatingWorkflowStorage,
  CachingWorkflowStorage,
  MultiDirectoryWorkflowStorage,
  createMultiDirectoryWorkflowStorage
}; 