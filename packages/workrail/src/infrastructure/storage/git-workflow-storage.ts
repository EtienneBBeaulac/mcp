import { IWorkflowStorage } from '../../types/storage';
import { Workflow, WorkflowSummary } from '../../types/mcp-types';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { 
  sanitizeId, 
  assertWithinBase, 
  validateFileSize,
  validateSecurityOptions
} from '../../utils/storage-security';
import { StorageError, InvalidWorkflowError, SecurityError } from '../../core/error-handler';

const execAsync = promisify(exec);

export interface GitWorkflowConfig {
  repositoryUrl: string;
  branch?: string;
  localPath?: string;
  syncInterval?: number; // minutes
  authToken?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

export interface ValidatedGitWorkflowConfig extends Required<GitWorkflowConfig> {
  maxFileSize: number;
  maxFiles: number;
}

/**
 * Git-based workflow storage that clones/pulls workflows from a Git repository
 * Perfect for community-driven workflow contributions via GitHub/GitLab
 * 
 * Security features:
 * - Git command injection protection
 * - Path traversal prevention  
 * - File size limits
 * - Repository URL validation
 */
export class GitWorkflowStorage implements IWorkflowStorage {
  private readonly config: ValidatedGitWorkflowConfig;
  private readonly localPath: string;
  private lastSync: number = 0;
  private isCloning: boolean = false;

  constructor(config: GitWorkflowConfig) {
    this.config = this.validateAndNormalizeConfig(config);
    this.localPath = this.config.localPath;
  }

  private validateAndNormalizeConfig(config: GitWorkflowConfig): ValidatedGitWorkflowConfig {
    if (!config.repositoryUrl?.trim()) {
      throw new StorageError('Repository URL is required for Git workflow storage');
    }

    // Validate repository URL format and security
    if (!this.isValidGitUrl(config.repositoryUrl)) {
      throw new SecurityError('Invalid or potentially unsafe repository URL');
    }

    const securityOptions = validateSecurityOptions({
      maxFileSizeBytes: config.maxFileSize || 1024 * 1024 // 1MB default
    });

    const localPath = config.localPath || 
      path.join(process.cwd(), '.workrail-cache', 'community-workflows');
    
    // Ensure local path is within safe boundaries
    try {
      assertWithinBase(localPath, process.cwd());
    } catch (error) {
      throw new SecurityError(`Local path outside safe boundaries: ${(error as Error).message}`);
    }

    return {
      repositoryUrl: config.repositoryUrl.trim(),
      branch: this.sanitizeGitRef(config.branch || 'main'),
      localPath,
      syncInterval: Math.max(1, config.syncInterval || 60), // minimum 1 minute
      authToken: config.authToken || '',
      maxFileSize: securityOptions.maxFileSizeBytes,
      maxFiles: config.maxFiles || 100 // default 100 files
    };
  }

  private isValidGitUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Allow common Git hosting services
      const allowedHosts = [
        'github.com', 'gitlab.com', 'bitbucket.org',
        'dev.azure.com', 'sourceforge.net'
      ];
      
      return allowedHosts.some(host => 
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
      ) && (parsed.protocol === 'https:' || parsed.protocol === 'git:');
    } catch {
      return false;
    }
  }

  private sanitizeGitRef(ref: string): string {
    // Prevent Git injection by allowing only safe characters
    if (!/^[a-zA-Z0-9/_.-]+$/.test(ref)) {
      throw new SecurityError('Git reference contains unsafe characters');
    }
    return ref;
  }

  async loadAllWorkflows(): Promise<Workflow[]> {
    try {
      await this.ensureRepository();
      
      const workflowsPath = path.join(this.localPath, 'workflows');
      if (!existsSync(workflowsPath)) {
        return [];
      }

      const files = await fs.readdir(workflowsPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      if (jsonFiles.length > this.config.maxFiles) {
        throw new StorageError(
          `Too many workflow files (${jsonFiles.length}), maximum allowed: ${this.config.maxFiles}`
        );
      }
      
      const workflows: Workflow[] = [];
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(workflowsPath, file);
          
          // Security: Ensure file is within expected directory
          assertWithinBase(filePath, workflowsPath);
          
                     // Validate file size
           const stats = await fs.stat(filePath);
           validateFileSize(stats.size, this.config.maxFileSize, file);
           
           const content = await fs.readFile(filePath, 'utf-8');
           const workflow = JSON.parse(content) as Workflow;
           
           // Validate workflow ID matches filename (security)
           const expectedFilename = `${sanitizeId(workflow.id)}.json`;
           if (file !== expectedFilename) {
             throw new InvalidWorkflowError(
               workflow.id,
               `Workflow ID '${workflow.id}' doesn't match filename '${file}'`
             );
           }
           
           workflows.push(workflow);
         } catch (error) {
           if (error instanceof SecurityError || error instanceof InvalidWorkflowError) {
             throw error;
           }
           throw new StorageError(`Failed to load workflow from ${file}: ${(error as Error).message}`);
         }
       }
       
       return workflows;
     } catch (error) {
       if (error instanceof StorageError || error instanceof SecurityError || error instanceof InvalidWorkflowError) {
         throw error;
       }
       throw new StorageError(`Failed to load workflows from Git repository: ${(error as Error).message}`);
    }
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    const sanitizedId = sanitizeId(id);
    const workflows = await this.loadAllWorkflows();
    return workflows.find(w => w.id === sanitizedId) || null;
  }

  async listWorkflowSummaries(): Promise<WorkflowSummary[]> {
    const workflows = await this.loadAllWorkflows();
    return workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      category: 'community',
      version: workflow.version
    }));
  }

  async save(workflow: Workflow): Promise<void> {
    try {
      // Validate workflow ID
      const sanitizedId = sanitizeId(workflow.id);
      if (workflow.id !== sanitizedId) {
        throw new InvalidWorkflowError(workflow.id, `Invalid workflow ID: ${workflow.id}`);
      }

      await this.ensureRepository();
      
      const workflowsPath = path.join(this.localPath, 'workflows');
      await fs.mkdir(workflowsPath, { recursive: true });
      
      const filename = `${sanitizedId}.json`;
      const filePath = path.join(workflowsPath, filename);
      
      // Security: Ensure we're writing within expected directory
      assertWithinBase(filePath, workflowsPath);
      
      const content = JSON.stringify(workflow, null, 2);
      
             // Validate content size
       validateFileSize(Buffer.byteLength(content, 'utf-8'), this.config.maxFileSize, workflow.id);
       
       await fs.writeFile(filePath, content);
       
       // Git commit and push
       await this.gitCommitAndPush(workflow);
     } catch (error) {
       if (error instanceof SecurityError || error instanceof InvalidWorkflowError) {
         throw error;
       }
       throw new StorageError(`Failed to save workflow to Git repository: ${(error as Error).message}`);
    }
  }

  private async ensureRepository(): Promise<void> {
    if (this.isCloning) {
      // Wait for clone to complete
      let attempts = 0;
      const maxAttempts = 60; // 1 minute max wait
      
      while (this.isCloning && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (this.isCloning) {
        throw new StorageError('Repository clone operation timed out');
      }
      return;
    }

    const shouldSync = !existsSync(this.localPath) || 
      (Date.now() - this.lastSync) > (this.config.syncInterval * 60 * 1000);
    
    if (!shouldSync) {
      return;
    }

    this.isCloning = true;
    
    try {
      if (!existsSync(this.localPath)) {
        await this.cloneRepository();
      } else {
        await this.pullRepository();
      }
      
      this.lastSync = Date.now();
    } catch (error) {
      throw new StorageError(`Failed to ensure Git repository: ${(error as Error).message}`);
    } finally {
      this.isCloning = false;
    }
  }

  private async cloneRepository(): Promise<void> {
    const parentDir = path.dirname(this.localPath);
    await fs.mkdir(parentDir, { recursive: true });
    
    // Security: Escape shell arguments to prevent injection
    const escapedUrl = this.config.authToken 
      ? this.config.repositoryUrl.replace('https://', `https://${this.escapeShellArg(this.config.authToken)}@`)
      : this.config.repositoryUrl;
    
    const escapedBranch = this.escapeShellArg(this.config.branch);
    const escapedPath = this.escapeShellArg(this.localPath);
    
    const command = `git clone --branch ${escapedBranch} --depth 1 ${this.escapeShellArg(escapedUrl)} ${escapedPath}`;
    
    try {
      await execAsync(command, { timeout: 60000 }); // 1 minute timeout
    } catch (error) {
      throw new StorageError(`Failed to clone workflow repository: ${(error as Error).message}`);
    }
  }

  private async pullRepository(): Promise<void> {
    const escapedPath = this.escapeShellArg(this.localPath);
    const escapedBranch = this.escapeShellArg(this.config.branch);
    
    const command = `cd ${escapedPath} && git pull origin ${escapedBranch}`;
    
    try {
      await execAsync(command, { timeout: 30000 }); // 30 second timeout
    } catch (error) {
      // Don't throw on pull failure - use cached version
      // This is intentional behavior for offline scenarios
    }
  }

  private async gitCommitAndPush(workflow: Workflow): Promise<void> {
    const escapedPath = this.escapeShellArg(this.localPath);
    const escapedFilename = this.escapeShellArg(`workflows/${workflow.id}.json`);
    const escapedMessage = this.escapeShellArg(`Add/update workflow: ${workflow.name}`);
    const escapedBranch = this.escapeShellArg(this.config.branch);
    
    const commands = [
      `cd ${escapedPath}`,
      `git add ${escapedFilename}`,
      `git commit -m ${escapedMessage}`,
      `git push origin ${escapedBranch}`
    ];
    
    const command = commands.join(' && ');
    
    try {
      await execAsync(command, { timeout: 60000 }); // 1 minute timeout
    } catch (error) {
      throw new StorageError(`Failed to push workflow to repository: ${(error as Error).message}`);
    }
  }

  private escapeShellArg(arg: string): string {
    // Escape shell arguments to prevent injection attacks
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  }
}

/**
 * Example usage and configuration
 */
export const COMMUNITY_WORKFLOW_REPOS = {
  // Official community repository
  official: {
    repositoryUrl: 'https://github.com/your-org/workrail-community-workflows.git',
    branch: 'main',
    syncInterval: 60, // 1 hour
    maxFileSize: 1024 * 1024, // 1MB
    maxFiles: 100
  },
  
  // User's personal workflow repository
  personal: {
    repositoryUrl: 'https://github.com/username/my-workflows.git',
    branch: 'main',
    syncInterval: 30, // 30 minutes
    authToken: process.env['GITHUB_TOKEN'],
    maxFileSize: 1024 * 1024, // 1MB
    maxFiles: 50
  }
}; 