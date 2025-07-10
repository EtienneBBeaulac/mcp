import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { IWorkflowStorage } from '../../types/storage';
import { Workflow, WorkflowSummary } from '../../types/mcp-types';
import {
  InvalidWorkflowError,
  SecurityError
} from '../../core/error-handler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeId(id: string): string {
  if (id.includes('\u0000')) {
    throw new SecurityError('Null byte detected in identifier', 'sanitizeId');
  }

  const normalised = id.normalize('NFC');
  const valid = /^[a-zA-Z0-9_-]+$/.test(normalised);
  if (!valid) {
    throw new InvalidWorkflowError(id, 'Invalid characters in workflow id');
  }
  return normalised;
}

function assertWithinBase(resolvedPath: string, baseDir: string): void {
  if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== baseDir) {
    throw new SecurityError('Path escapes storage sandbox', 'file-access');
  }
}

interface CacheEntry {
  workflow: Workflow;
  expires: number;
}

interface FileWorkflowStorageOptions {
  /** Reject files larger than this size (bytes). Default 1_000_000 */
  maxFileSizeBytes?: number;
  /** Cache entry TTL in milliseconds. 0 to disable. Default 5000 */
  cacheTTLms?: number;
  /** Maximum cached workflows before evicting LRU. Default 100 */
  cacheSize?: number;
}

/**
 * Minimal file-system based workflow storage.  
 * Reads JSON files from a directory and returns workflow objects *as is* – it
 * deliberately performs **no** caching or schema validation to keep a single
 * responsibility: access to the data source.
 */
export class FileWorkflowStorage implements IWorkflowStorage {
  private readonly baseDirReal: string;
  private readonly maxFileSize: number;
  private readonly cacheTTL: number;
  private readonly cacheLimit: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(directory: string, options: FileWorkflowStorageOptions = {}) {
    this.baseDirReal = path.resolve(directory);
    this.maxFileSize = options.maxFileSizeBytes ?? 1_000_000; // 1 MB default
    this.cacheTTL = options.cacheTTLms ?? 5000;
    this.cacheLimit = options.cacheSize ?? 100;
  }

  /**
   * Load *all* JSON files from the configured directory.
   */
  public async loadAllWorkflows(): Promise<Workflow[]> {
    const dirEntries = await fs.readdir(this.baseDirReal);
    const jsonFiles = dirEntries.filter((f) => f.endsWith('.json'));
    const workflows: Workflow[] = [];

    for (const file of jsonFiles) {
      const filePathRaw = path.resolve(this.baseDirReal, file);
      assertWithinBase(filePathRaw, this.baseDirReal);

      // Size guard
      try {
        const { size } = statSync(filePathRaw);
        if (size > this.maxFileSize) {
          throw new SecurityError('Workflow file exceeds size limit', 'file-size');
        }

        const raw = await fs.readFile(filePathRaw, 'utf-8');
        const data = JSON.parse(raw) as Workflow;
        workflows.push(data);
      } catch (err) {
        console.warn(`[FileWorkflowStorage] Skipping invalid or oversized file: ${file}`, err);
        continue;
      }
    }

    return workflows;
  }

  public async getWorkflowById(id: string): Promise<Workflow | null> {
    const safeId = sanitizeId(id);

    // Try cache first
    const cached = this.cache.get(safeId);
    if (cached && cached.expires > Date.now()) {
      return cached.workflow;
    }

    // Attempt direct file read <id>.json
    const directPath = path.resolve(this.baseDirReal, `${safeId}.json`);

    let workflow: Workflow | null = null;
    try {
      assertWithinBase(directPath, this.baseDirReal);
      if (existsSync(directPath)) {
        const { size } = statSync(directPath);
        if (size > this.maxFileSize) {
          throw new SecurityError('Workflow file exceeds size limit', 'file-size');
        }
        const raw = await fs.readFile(directPath, 'utf-8');
        const data = JSON.parse(raw) as Workflow;
        if (data.id !== safeId) {
          throw new InvalidWorkflowError(safeId, 'ID mismatch between filename and workflow.id');
        }
        workflow = data;
      }
    } catch (err) {
      console.warn(`[FileWorkflowStorage] Direct file read failed for ${safeId}:`, err);
    }

    // Fallback to directory scan (legacy) if direct read missing
    if (!workflow) {
      const workflows = await this.loadAllWorkflows();
      workflow = workflows.find((wf) => wf.id === safeId) || null;
    }

    // Cache result (null not cached)
    if (workflow && this.cacheTTL > 0) {
      if (this.cache.size >= this.cacheLimit) {
        // Evict oldest (first inserted)
        const firstKey = this.cache.keys().next().value as string;
        this.cache.delete(firstKey);
      }
      this.cache.set(safeId, { workflow, expires: Date.now() + this.cacheTTL });
    }

    return workflow;
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