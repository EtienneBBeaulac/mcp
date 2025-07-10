import { createDefaultWorkflowStorage } from './infrastructure/storage';
import { DefaultWorkflowService, WorkflowService } from './application/services/workflow-service';
import { IWorkflowStorage } from './types/storage';
import { createWorkflowLookupServer } from './infrastructure/rpc/server';
import { WorkflowLookupServer } from './types/server';

/**
 * Centralized composition root / dependency-injection helper.
 * Allows overriding individual dependencies (storage, services) for
 * testing or alternative implementations.
 */
export interface AppContainer {
  storage: IWorkflowStorage;
  workflowService: WorkflowService;
  server: WorkflowLookupServer;
}

/**
 * Build the application container.
 * @param overrides  Optionally replace core components, e.g. provide an
 *                   in-memory storage for tests.
 */
export function createAppContainer(overrides: Partial<AppContainer> = {}): AppContainer {
  const storage = overrides.storage ?? createDefaultWorkflowStorage();
  const workflowService =
    overrides.workflowService ?? new DefaultWorkflowService(storage);
  const server = overrides.server ?? createWorkflowLookupServer(workflowService);

  return {
    storage,
    workflowService,
    server
  };
} 