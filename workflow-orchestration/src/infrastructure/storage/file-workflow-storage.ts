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

interface WorkflowIndexEntry {
  id: string;
  filename: string;
  summary: WorkflowSummary;
  lastModified: number;
}

interface FileWorkflowStorageOptions {
  /** Reject files larger than this size (bytes). Default 1_000_000 */
  maxFileSizeBytes?: number;
  /** Cache entry TTL in milliseconds. 0 to disable. Default 5000 */
  cacheTTLms?: number;
  /** Maximum cached workflows before evicting LRU. Default 100 */
  cacheSize?: number;
  /** Index cache TTL in milliseconds. Default 30000 (30 seconds) */
  indexCacheTTLms?: number;
}

/**
 * Optimized file-system based workflow storage with intelligent caching.
 * Uses an index cache to avoid repeatedly scanning directories and 
 * reading files unnecessarily.
 */
export class FileWorkflowStorage implements IWorkflowStorage {
  private readonly baseDirReal: string;
  private readonly maxFileSize: number;
  private readonly cacheTTL: number;
  private readonly cacheLimit: number;
  private readonly indexCacheTTL: number;
  private readonly cache = new Map<string, CacheEntry>();
  
  // Index cache to avoid expensive directory scans
  private workflowIndex: Map<string, WorkflowIndexEntry> | null = null;
  private indexExpires: number = 0;

  constructor(directory: string, options: FileWorkflowStorageOptions = {}) {
    this.baseDirReal = path.resolve(directory);
    this.maxFileSize = options.maxFileSizeBytes ?? 1_000_000; // 1 MB default
    this.cacheTTL = options.cacheTTLms ?? 5000;
    this.cacheLimit = options.cacheSize ?? 100;
    this.indexCacheTTL = options.indexCacheTTLms ?? 30000; // 30 seconds
  }

  /**
   * Build or refresh the workflow index by scanning the directory once
   */
  private async buildWorkflowIndex(): Promise<Map<string, WorkflowIndexEntry>> {
    const dirEntries = await fs.readdir(this.baseDirReal);
    const jsonFiles = dirEntries.filter((f) => f.endsWith('.json'));
    const index = new Map<string, WorkflowIndexEntry>();

    for (const file of jsonFiles) {
      const filePathRaw = path.resolve(this.baseDirReal, file);
      assertWithinBase(filePathRaw, this.baseDirReal);

      try {
        const stats = statSync(filePathRaw);
        if (stats.size > this.maxFileSize) {
          console.warn(`[FileWorkflowStorage] Skipping oversized file: ${file}`);
          continue;
        }

        // Read just enough to get the workflow ID and summary info
        const raw = await fs.readFile(filePathRaw, 'utf-8');
        const data = JSON.parse(raw) as Workflow;
        
        if (!data.id) {
          console.warn(`[FileWorkflowStorage] Skipping file without id: ${file}`);
          continue;
        }

        const entry: WorkflowIndexEntry = {
          id: data.id,
          filename: file,
          lastModified: stats.mtimeMs,
          summary: {
            id: data.id,
            name: data.name,
            description: data.description,
            category: 'default',
            version: data.version
          }
        };

        index.set(data.id, entry);
      } catch (err) {
        console.warn(`[FileWorkflowStorage] Skipping invalid file: ${file}`, err);
        continue;
      }
    }

    return index;
  }

  /**
   * Get the workflow index, building it if necessary
   */
  private async getWorkflowIndex(): Promise<Map<string, WorkflowIndexEntry>> {
    const now = Date.now();
    
    if (this.workflowIndex && this.indexExpires > now) {
      return this.workflowIndex;
    }

    // Rebuild index
    this.workflowIndex = await this.buildWorkflowIndex();
    this.indexExpires = now + this.indexCacheTTL;
    
    return this.workflowIndex;
  }

  /**
   * Load a specific workflow from file
   */
  private async loadWorkflowFromFile(filename: string): Promise<Workflow | null> {
    const filePath = path.resolve(this.baseDirReal, filename);
    assertWithinBase(filePath, this.baseDirReal);

    try {
      const stats = statSync(filePath);
      if (stats.size > this.maxFileSize) {
        throw new SecurityError('Workflow file exceeds size limit', 'file-size');
      }

      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw) as Workflow;
      return data;
    } catch (err) {
      console.warn(`[FileWorkflowStorage] Failed to load workflow from ${filename}:`, err);
      return null;
    }
  }

  /**
   * Load *all* JSON files from the configured directory.
   * NOTE: This method is expensive and should be avoided when possible.
   * Use getWorkflowIndex() + loadWorkflowFromFile() for better performance.
   */
  public async loadAllWorkflows(): Promise<Workflow[]> {
    const index = await this.getWorkflowIndex();
    const workflows: Workflow[] = [];

    // Load workflows in parallel for better performance
    const loadPromises = Array.from(index.values()).map(async (entry) => {
      const workflow = await this.loadWorkflowFromFile(entry.filename);
      if (workflow) {
        workflows.push(workflow);
      }
    });

    await Promise.all(loadPromises);
    return workflows;
  }

  public async getWorkflowById(id: string): Promise<Workflow | null> {
    const safeId = sanitizeId(id);

    // Try cache first
    const cached = this.cache.get(safeId);
    if (cached && cached.expires > Date.now()) {
      return cached.workflow;
    }

    // Check index for the workflow
    const index = await this.getWorkflowIndex();
    const indexEntry = index.get(safeId);
    
    if (!indexEntry) {
      return null; // Workflow doesn't exist
    }

    // Load the specific workflow file
    const workflow = await this.loadWorkflowFromFile(indexEntry.filename);
    
    if (!workflow) {
      return null;
    }

    // Verify ID matches (security check)
    if (workflow.id !== safeId) {
      throw new InvalidWorkflowError(safeId, 'ID mismatch between index and workflow.id');
    }

    // Cache the result
    if (this.cacheTTL > 0) {
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
    // Use the index to get summaries without loading full workflows
    const index = await this.getWorkflowIndex();
    return Array.from(index.values()).map(entry => entry.summary);
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
  
  // Use optimized settings for better performance
  return new FileWorkflowStorage(directory, {
    cacheTTLms: 10000,    // 10 second cache for individual workflows
    cacheSize: 200,       // Larger cache
    indexCacheTTLms: 60000, // 1 minute index cache
  });
} 