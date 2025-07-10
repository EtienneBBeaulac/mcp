import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { IWorkflowStorage } from '../../types/storage';
import { Workflow, WorkflowSummary } from '../../types/mcp-types';
import { InvalidWorkflowError } from '../../core/error-handler';

function sanitizeId(id: string): string {
  const valid = /^[a-zA-Z0-9_-]+$/.test(id);
  if (!valid) {
    throw new InvalidWorkflowError(id, 'Invalid characters in workflow id');
  }
  return id;
}

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
  public async loadAllWorkflows(): Promise<Workflow[]> {
    const dirEntries = await fs.readdir(this.directory);
    const jsonFiles = dirEntries.filter((f) => f.endsWith('.json'));
    const workflows: Workflow[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(this.directory, file);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(raw) as Workflow;
        workflows.push(data);
      } catch (err) {
        // Wrap JSON parse errors with InvalidWorkflowError but continue processing others.
        console.warn(`[FileWorkflowStorage] Skipping invalid workflow file: ${file}`, err);
        continue;
      }
    }

    return workflows;
  }

  public async getWorkflowById(id: string): Promise<Workflow | null> {
    sanitizeId(id);
    const workflows = await this.loadAllWorkflows();
    return workflows.find((wf) => wf.id === id) || null;
  }

  public async listWorkflowSummaries(): Promise<WorkflowSummary[]> {
    const workflows = await this.loadAllWorkflows();
    return workflows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: 'default',
      version: '1.0.0'
    }));
  }

  public async save(): Promise<void> {
    // No-op for now – file storage is read-only in this phase.
    return Promise.resolve();
  }
}

/**
 * Helper factory that resolves the workflow directory according to the
 * previous behaviour (env override → bundled examples).
 */
export function createDefaultFileWorkflowStorage(): FileWorkflowStorage {
  const DEFAULT_WORKFLOW_DIR = path.resolve(__dirname, '../../../spec/examples');
  const envPath = process.env['WORKFLOW_STORAGE_PATH'];
  const resolved = envPath ? path.resolve(envPath) : null;
  const directory = resolved && existsSync(resolved) ? resolved : DEFAULT_WORKFLOW_DIR;
  return new FileWorkflowStorage(directory);
} 