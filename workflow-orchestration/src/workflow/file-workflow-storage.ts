import fs from 'fs';
import path from 'path';
import { IWorkflowStorage } from '../types/storage';
import { Workflow, WorkflowSummary } from '../types/mcp-types';

/**
 * Minimal file-system based workflow storage.  
 * Reads JSON files from a directory and returns workflow objects *as is* – it
 * deliberately performs **no** caching or schema validation to keep a single
 * responsibility: access to the data source.
 */
export class FileWorkflowStorage implements IWorkflowStorage {
  constructor(private readonly directory: string) {}

  /**
   * Load *all* JSON files from the configured directory.
   */
  public loadAllWorkflows(): Workflow[] {
    const files = fs.readdirSync(this.directory).filter((f) => f.endsWith('.json'));
    const workflows: Workflow[] = [];
    for (const file of files) {
      const filePath = path.join(this.directory, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Workflow;
        workflows.push(data);
      } catch {
        // Ignore files that are not valid JSON – validation is handled elsewhere.
        continue;
      }
    }
    return workflows;
  }

  public getWorkflowById(id: string): Workflow | null {
    const workflows = this.loadAllWorkflows();
    return workflows.find((wf) => wf.id === id) || null;
  }

  public listWorkflowSummaries(): WorkflowSummary[] {
    return this.loadAllWorkflows().map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: 'default',
      version: '1.0.0'
    }));
  }
}

/**
 * Helper factory that resolves the workflow directory according to the
 * previous behaviour (env override → bundled examples).
 */
export function createDefaultFileWorkflowStorage(): FileWorkflowStorage {
  const DEFAULT_WORKFLOW_DIR = path.resolve(__dirname, '../../spec/examples');
  const envPath = process.env['WORKFLOW_STORAGE_PATH'];
  const resolved = envPath ? path.resolve(envPath) : null;
  const directory = resolved && fs.existsSync(resolved) ? resolved : DEFAULT_WORKFLOW_DIR;
  return new FileWorkflowStorage(directory);
} 