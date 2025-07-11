import { createDefaultWorkflowStorage } from './infrastructure/storage/storage.js';
import { DefaultWorkflowService, WorkflowService } from './application/services/workflow-service.js';
import { ValidationEngine } from './application/services/validation-engine.js';
import { IWorkflowStorage } from './types/storage.js';
import { createWorkflowLookupServer } from './infrastructure/rpc/server.js';
import { WorkflowLookupServer } from './types/server.js';

/**
 * Centralized composition root / dependency-injection helper.
 * Allows overriding individual dependencies (storage, services) for
 * testing or alternative implementations.
 */
export interface AppContainer {
  storage: IWorkflowStorage;
  validationEngine: ValidationEngine;
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
  const validationEngine = overrides.validationEngine ?? new ValidationEngine();
  const workflowService =
    overrides.workflowService ?? new DefaultWorkflowService(storage, validationEngine);
  const server = overrides.server ?? createWorkflowLookupServer(workflowService);

  return {
    storage,
    validationEngine,
    workflowService,
    server
  };
} 