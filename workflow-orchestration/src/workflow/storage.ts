// Re-export new modular storage pieces and compose them to keep backward compatibility

import { FileWorkflowStorage, createDefaultFileWorkflowStorage } from './file-workflow-storage';
import { SchemaValidatingWorkflowStorage } from './schema-validating-workflow-storage';
import { CachingWorkflowStorage } from './caching-workflow-storage';
import { Workflow, WorkflowSummary } from '../types/mcp-types';

// -----------------------------------------------------------------------------
// Default composition helper – now exposed as a factory for DI friendliness
// -----------------------------------------------------------------------------

/**
 * Create the default, production-grade storage stack consisting of:
 *   1. File-system backed storage
 *   2. JSON-Schema validation decorator
 *   3. In-memory TTL cache decorator
 *
 * The function is intentionally side-effect-free – each invocation returns a
 * brand-new, fully-composed instance so that callers can choose whether to
 * share or isolate storage state.
 */
export function createDefaultWorkflowStorage(): CachingWorkflowStorage {
  const baseStorage = createDefaultFileWorkflowStorage();
  const validatingStorage = new SchemaValidatingWorkflowStorage(baseStorage);
  const cacheTtlMs = Number(process.env['CACHE_TTL'] ?? 300_000); // 5 minutes default
  return new CachingWorkflowStorage(validatingStorage, cacheTtlMs);
}

// -----------------------------------------------------------------------------
// Legacy singleton – retained temporarily for backward compatibility. New
// code should prefer `createDefaultWorkflowStorage()` and inject the resulting
// instance where needed.
// -----------------------------------------------------------------------------

export const fileWorkflowStorage: CachingWorkflowStorage = createDefaultWorkflowStorage();

// -----------------------------------------------------------------------------
// Legacy helper functions – now delegate to composed storage
// -----------------------------------------------------------------------------

export const loadAllWorkflows = (): Workflow[] => fileWorkflowStorage.loadAllWorkflows();
export const getWorkflowById = (id: string): Workflow | null => fileWorkflowStorage.getWorkflowById(id);
export const listWorkflowSummaries = (): WorkflowSummary[] => fileWorkflowStorage.listWorkflowSummaries();

// Re-export classes for external usage if needed
export {
  FileWorkflowStorage,
  SchemaValidatingWorkflowStorage,
  CachingWorkflowStorage
}; 