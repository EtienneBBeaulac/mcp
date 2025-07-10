import fs from 'fs';
import path from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import { Workflow, WorkflowSummary } from '../types/mcp-types';
import { IWorkflowStorage } from '../types/storage';

// =============================================================================
// FILE-BASED WORKFLOW STORAGE – DEFAULT BACKEND
// =============================================================================

const WORKFLOW_DIR = path.resolve(__dirname, '../../spec/examples'); // TODO: Make configurable
const WORKFLOW_SCHEMA_PATH = path.resolve(__dirname, '../../spec/workflow.schema.json');

/**
 * Lazy-init JSON-Schema validator for workflow files.
 */
let validator: ValidateFunction | null = null;
function getValidator(): ValidateFunction {
  if (!validator) {
    const schema = JSON.parse(fs.readFileSync(WORKFLOW_SCHEMA_PATH, 'utf-8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validator = ajv.compile(schema);
  }
  return validator!;
}

/**
 * File-system implementation of {@link IWorkflowStorage}.
 * Reads workflow JSON files from the local examples/spec directory.
 */
export class FileWorkflowStorage implements IWorkflowStorage {
  /** Load and return all valid workflows found in WORKFLOW_DIR. */
  public loadAllWorkflows(): Workflow[] {
    const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.json'));
    const validate = getValidator();
    const workflows: Workflow[] = [];

    for (const file of files) {
      const filePath = path.join(WORKFLOW_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (validate(data)) {
        workflows.push(data as Workflow);
      } else {
        // TODO: Replace with proper logger
        // console.warn(`Invalid workflow skipped: ${file}`);
      }
    }
    return workflows;
  }

  /** Retrieve a single workflow by its ID. */
  public getWorkflowById(id: string): Workflow | null {
    const workflows = this.loadAllWorkflows();
    return workflows.find((wf) => wf.id === id) || null;
  }

  /** Return lightweight summaries of all workflows. */
  public listWorkflowSummaries(): WorkflowSummary[] {
    return this.loadAllWorkflows().map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: 'default', // TODO: Derive from workflow metadata when available
      version: '1.0.0', // TODO: Derive from workflow metadata when available
    }));
  }
}

// -----------------------------------------------------------------------------
// DEFAULT STORAGE INSTANCE & BACKWARD-COMPATIBILITY HELPERS
// -----------------------------------------------------------------------------

/**
 * Singleton instance used by the current codebase.
 * Other storage implementations can be swapped in future via DI or factory.
 */
export const fileWorkflowStorage = new FileWorkflowStorage();

// Legacy function exports (kept to minimise refactor scope). Internally they
// delegate to {@link fileWorkflowStorage}. These can be deprecated in a later
// cleanup once all consumers migrate to the interface directly.
export const loadAllWorkflows = (): Workflow[] => fileWorkflowStorage.loadAllWorkflows();
export const getWorkflowById = (id: string): Workflow | null => fileWorkflowStorage.getWorkflowById(id);
export const listWorkflowSummaries = (): WorkflowSummary[] => fileWorkflowStorage.listWorkflowSummaries(); 