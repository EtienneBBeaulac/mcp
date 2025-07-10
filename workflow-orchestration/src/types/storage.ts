// =============================================================================
// WORKFLOW STORAGE INTERFACES
// =============================================================================

import { Workflow, WorkflowSummary } from './mcp-types';

/**
 * Generic interface for any workflow storage backend.
 * The default implementation uses the local filesystem, but additional
 * backends (e.g., in-memory, database, remote) can implement this contract.
 */
export interface IWorkflowStorage {
  /**
   * Load and return all workflows available in this storage backend.
   */
  loadAllWorkflows(): Workflow[];

  /**
   * Retrieve a single workflow by its unique identifier.
   * @param id The workflow `id` field.
   */
  getWorkflowById(id: string): Workflow | null;

  /**
   * Return lightweight summaries for all workflows (used by `workflow_list`).
   */
  listWorkflowSummaries(): WorkflowSummary[];
} 