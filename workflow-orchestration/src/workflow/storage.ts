// Re-export new modular storage pieces and compose them to keep backward compatibility

import { FileWorkflowStorage, createDefaultFileWorkflowStorage } from './file-workflow-storage';
import { SchemaValidatingWorkflowStorage } from './schema-validating-workflow-storage';
import { CachingWorkflowStorage } from './caching-workflow-storage';
import { Workflow, WorkflowSummary } from '../types/mcp-types';

// -----------------------------------------------------------------------------
// Default composition mimicking previous behaviour
// -----------------------------------------------------------------------------

const BASE_STORAGE = createDefaultFileWorkflowStorage();
const VALIDATING_STORAGE = new SchemaValidatingWorkflowStorage(BASE_STORAGE);
const CACHE_TTL = Number(process.env['CACHE_TTL'] ?? 300_000); // 5 minutes
const CACHED_STORAGE = new CachingWorkflowStorage(VALIDATING_STORAGE, CACHE_TTL);

// Export the composed instance with the same name as before to avoid refactor ripple
export const fileWorkflowStorage: CachingWorkflowStorage = CACHED_STORAGE;

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