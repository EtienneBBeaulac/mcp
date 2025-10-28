import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServerType } from 'http';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { SessionManager } from './SessionManager.js';
import cors from 'cors';
import open from 'open';

export interface ServerConfig {
  port?: number;
  autoOpen?: boolean;
  disableUnifiedDashboard?: boolean; // Opt-out of unified dashboard
}

interface DashboardLock {
  pid: number;
  port: number;
  startedAt: string;
  projectId: string;
  projectPath: string;
}

/**
 * HttpServer serves the dashboard UI and provides API endpoints for session data.
 * 
 * Routes:
 * - GET / -> Dashboard home page
 * - GET /web/* -> Static dashboard assets
 * - GET /api/sessions -> List all sessions (unified: all projects)
 * - GET /api/sessions/:workflow/:id -> Get specific session
 * - GET /api/current-project -> Get current project info
 * - GET /api/projects -> List all projects
 * 
 * Features:
 * - Unified dashboard (primary/secondary pattern)
 * - First instance becomes primary on port 3456
 * - Subsequent instances skip HTTP server
 * - Auto-recovery from crashed primary
 * - Falls back to legacy mode if needed
 * - ETag support for efficient polling
 * - CORS enabled for local development
 */
export class HttpServer {
  private app: Application;
  private server: HttpServerType | null = null;
  private port: number;
  private baseUrl: string = '';
  private isPrimary: boolean = false;
  private lockFile: string;
  
  constructor(
    private sessionManager: SessionManager,
    private config: ServerConfig = {}
  ) {
    this.port = config.port || 3456;
    this.lockFile = path.join(os.homedir(), '.workrail', 'dashboard.lock');
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS for local development
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'If-None-Match']
    }));
    
    // ETag support for efficient polling
    this.app.set('etag', 'strong');
    
    // JSON parsing
    this.app.use(express.json());
    
    // Logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.error(`[HTTP] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }
  
  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Serve static dashboard UI from web directory
    const webDir = path.join(__dirname, '../../../web');
    
    // Serve all static files from web root
    this.app.use(express.static(webDir));
    
    // Dashboard home page
    this.app.get('/', async (req: Request, res: Response) => {
      try {
        const indexPath = path.join(webDir, 'index.html');
        res.sendFile(indexPath);
      } catch (error) {
        res.status(500).json({
          error: 'Dashboard UI not found',
          message: 'The dashboard web files are not yet built. This is expected during development.',
          details: 'Web files will be available in a future step.'
        });
      }
    });
    
    // API: List all sessions (unified: all projects when primary, current project otherwise)
    this.app.get('/api/sessions', async (req: Request, res: Response) => {
      try {
        // If primary, return sessions from all projects
        // If secondary/legacy, return only current project sessions
        const sessions = this.isPrimary
          ? await this.sessionManager.listAllProjectsSessions()
          : await this.sessionManager.listAllSessions();
          
        res.json({
          success: true,
          count: sessions.length,
          unified: this.isPrimary, // Indicate if this is unified view
          sessions: sessions.map(s => ({
            id: s.id,
            workflowId: s.workflowId,
            projectId: s.projectId,
            projectPath: s.projectPath,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            url: `/api/sessions/${s.workflowId}/${s.id}`,
            // Include dashboard summary for preview cards
            data: {
              dashboard: s.data?.dashboard || {}
            }
          }))
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to list sessions',
          message: error.message
        });
      }
    });
    
    // API: Get specific session
    this.app.get('/api/sessions/:workflow/:id', async (req: Request, res: Response) => {
      try {
        const { workflow, id } = req.params;
        const session = await this.sessionManager.getSession(workflow, id);
        
        if (!session) {
          return res.status(404).json({
            success: false,
            error: 'Session not found',
            workflowId: workflow,
            sessionId: id
          });
        }
        
        res.json({
          success: true,
          session
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to get session',
          message: error.message
        });
      }
    });
    
    // API: Get current project info
    this.app.get('/api/current-project', async (req: Request, res: Response) => {
      try {
        const project = await this.sessionManager.getCurrentProject();
        res.json({
          success: true,
          project
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to get project info',
          message: error.message
        });
      }
    });
    
    // API: List all projects
    this.app.get('/api/projects', async (req: Request, res: Response) => {
      try {
        const projects = await this.sessionManager.listProjects();
        res.json({
          success: true,
          count: projects.length,
          projects
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: 'Failed to list projects',
          message: error.message
        });
      }
    });
    
    // SSE: Stream session updates in real-time
    this.app.get('/api/sessions/:workflow/:id/stream', async (req: Request, res: Response) => {
      const { workflow, id } = req.params;
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', workflowId: workflow, sessionId: id })}\n\n`);
      
      // Send current session state immediately
      try {
        const session = await this.sessionManager.getSession(workflow, id);
        if (session) {
          res.write(`data: ${JSON.stringify({ type: 'update', session })}\n\n`);
        }
      } catch (error) {
        // Session might not exist yet
      }
      
      // Listen for session updates
      const onUpdate = (event: { workflowId: string; sessionId: string; session: any }) => {
        if (event.workflowId === workflow && event.sessionId === id) {
          // Send update to client
          res.write(`data: ${JSON.stringify({ type: 'update', session: event.session })}\n\n`);
        }
      };
      
      this.sessionManager.on('session:updated', onUpdate);
      
      // Start watching this session
      this.sessionManager.watchSession(workflow, id);
      
      // Send keepalive every 30 seconds
      const keepalive = setInterval(() => {
        res.write(`:keepalive\n\n`);
      }, 30000);
      
      // Cleanup on client disconnect
      req.on('close', () => {
        this.sessionManager.off('session:updated', onUpdate);
        clearInterval(keepalive);
        res.end();
      });
    });
    
    // Delete a single session
    this.app.delete('/api/sessions/:workflow/:id', async (req: Request, res: Response) => {
      try {
        const { workflow, id } = req.params;
        
        await this.sessionManager.deleteSession(workflow, id);
        
        res.json({
          success: true,
          message: `Session ${workflow}/${id} deleted successfully`
        });
      } catch (error: any) {
        console.error('[HttpServer] Delete session error:', error);
        res.status(error.message?.includes('not found') ? 404 : 500).json({
          success: false,
          error: error.message || 'Failed to delete session'
        });
      }
    });
    
    // Bulk delete sessions
    this.app.post('/api/sessions/bulk-delete', async (req: Request, res: Response) => {
      try {
        const { sessions } = req.body;
        
        if (!Array.isArray(sessions)) {
          return res.status(400).json({
            success: false,
            error: 'Body must contain "sessions" array'
          });
        }
        
        await this.sessionManager.deleteSessions(sessions);
        
        res.json({
          success: true,
          message: `Deleted ${sessions.length} session(s)`,
          count: sessions.length
        });
      } catch (error: any) {
        console.error('[HttpServer] Bulk delete error:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete sessions'
        });
      }
    });
    
    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        isPrimary: this.isPrimary,
        pid: process.pid,
        port: this.port
      });
    });
    
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        path: req.path
      });
    });
  }
  
  /**
   * Start the HTTP server
   * Uses unified dashboard pattern (primary/secondary) unless disabled
   */
  async start(): Promise<string | null> {
    // Check if unified dashboard is disabled
    if (this.config.disableUnifiedDashboard || process.env.WORKRAIL_DISABLE_UNIFIED_DASHBOARD === '1') {
      console.error('[Dashboard] Unified dashboard disabled, using legacy mode');
      return await this.startLegacyMode();
    }
    
    // Try to become primary
    if (await this.tryBecomePrimary()) {
      try {
        await this.startAsPrimary();
        return this.baseUrl;
      } catch (error: any) {
        if (error.code === 'EADDRINUSE') {
          // Port busy even though we have lock - cleanup and fall back
          console.error('[Dashboard] Port 3456 busy despite lock, falling back to legacy mode');
          await fs.unlink(this.lockFile).catch(() => {});
          return await this.startLegacyMode();
        }
        throw error;
      }
    } else {
      // Secondary mode - dashboard already running
      console.error('[Dashboard] ✅ Unified dashboard at http://localhost:3456');
      return null;
    }
  }
  
  /**
   * Try to become the primary dashboard
   */
  private async tryBecomePrimary(): Promise<boolean> {
    try {
      // Ensure .workrail directory exists
      await fs.mkdir(path.dirname(this.lockFile), { recursive: true });
      
      // Try to create lock file atomically
      const lockData: DashboardLock = {
        pid: process.pid,
        port: 3456,
        startedAt: new Date().toISOString(),
        projectId: this.sessionManager.getProjectId(),
        projectPath: this.sessionManager.getProjectPath()
      };
      
      await fs.writeFile(this.lockFile, JSON.stringify(lockData, null, 2), { flag: 'wx' });
      
      // Success! We are primary
      console.error('[Dashboard] Primary elected');
      this.isPrimary = true;
      this.setupPrimaryCleanup();
      return true;
      
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        // Lock exists, check if it's stale
        return await this.reclaimStaleLock();
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        // Permission denied
        console.error('[Dashboard] Cannot write lock file (permission denied)');
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Check if existing lock is stale and reclaim if possible
   */
  private async reclaimStaleLock(): Promise<boolean> {
    try {
      const lockContent = await fs.readFile(this.lockFile, 'utf-8');
      const lockData: DashboardLock = JSON.parse(lockContent);
      
      // Validate lock structure
      if (!lockData.pid || !lockData.port || !lockData.startedAt) {
        console.error('[Dashboard] Invalid lock file, reclaiming');
        await fs.unlink(this.lockFile);
        return await this.tryBecomePrimary();
      }
      
      // Check if process exists
      let processExists = false;
      try {
        process.kill(lockData.pid, 0); // Signal 0 = check existence
        processExists = true;
      } catch {
        processExists = false;
      }
      
      if (!processExists) {
        // Process is dead, reclaim lock
        console.error(`[Dashboard] Stale lock detected (PID ${lockData.pid} dead), reclaiming`);
        await fs.unlink(this.lockFile);
        return await this.tryBecomePrimary();
      }
      
      // Process exists, check if it's actually serving
      const isHealthy = await this.checkHealth(lockData.port);
      
      if (!isHealthy) {
        // Process exists but not responding
        console.error(`[Dashboard] Primary (PID ${lockData.pid}) not responding, reclaiming`);
        
        // Try to kill it gracefully
        try {
          process.kill(lockData.pid, 'SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        } catch {}
        
        await fs.unlink(this.lockFile);
        return await this.tryBecomePrimary();
      }
      
      // Valid primary exists
      return false;
      
    } catch (error: any) {
      // Corrupt lock file or parse error
      console.error('[Dashboard] Corrupted lock file, removing');
      await fs.unlink(this.lockFile).catch(() => {});
      return await this.tryBecomePrimary();
    }
  }
  
  /**
   * Check if a server is healthy on given port
   */
  private async checkHealth(port: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const response = await fetch(`http://localhost:${port}/api/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.status === 'healthy' && data.isPrimary !== undefined;
      
    } catch {
      return false;
    }
  }
  
  /**
   * Setup cleanup handlers for primary
   */
  private setupPrimaryCleanup(): void {
    const cleanup = async () => {
      if (this.isPrimary) {
        console.error('[Dashboard] Primary shutting down, releasing lock');
        await fs.unlink(this.lockFile).catch(() => {});
        this.isPrimary = false;
      }
    };
    
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
  }
  
  /**
   * Start as primary dashboard
   */
  private async startAsPrimary(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server = createServer(this.app);
      
      this.server.on('error', (error: any) => {
        reject(error);
      });
      
      this.server.listen(3456, () => {
        this.port = 3456;
        this.baseUrl = 'http://localhost:3456';
        this.printBanner();
        resolve();
      });
    });
  }
  
  /**
   * Legacy mode: auto-increment ports 3457-3499
   */
  private async startLegacyMode(): Promise<string> {
    this.port = 3457; // Start from 3457 in legacy mode
    
    while (this.port < 3500) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.server = createServer(this.app);
          
          this.server.on('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
              reject(new Error('Port in use'));
            } else {
              reject(error);
            }
          });
          
          this.server.listen(this.port, () => {
            resolve();
          });
        });
        
        this.baseUrl = `http://localhost:${this.port}`;
        console.error(`[Dashboard] Started in legacy mode on port ${this.port}`);
        this.printBanner();
        return this.baseUrl;
        
      } catch (error: any) {
        if (error.message === 'Port in use') {
          this.port++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('No available ports in range 3457-3499');
  }
  
  /**
   * Print startup banner
   */
  private printBanner(): void {
    const line = '═'.repeat(60);
    console.error(`\n${line}`);
    console.error(`🔧 Workrail MCP Server Started`);
    console.error(line);
    console.error(`📊 Dashboard: ${this.baseUrl} ${this.isPrimary ? '(PRIMARY - All Projects)' : '(Legacy Mode)'}`);
    console.error(`💾 Sessions:  ${this.sessionManager.getSessionsRoot()}`);
    console.error(`🏗️  Project:   ${this.sessionManager.getProjectId()}`);
    console.error(line);
    console.error();
  }
  
  /**
   * Open dashboard in browser
   */
  async openDashboard(sessionId?: string): Promise<string> {
    let url = this.baseUrl;
    
    if (sessionId) {
      url += `?session=${sessionId}`;
    }
    
    if (this.config.autoOpen !== false) {
      try {
        await open(url);
        console.error(`🌐 Opened dashboard: ${url}`);
      } catch (error) {
        console.error(`🌐 Dashboard URL: ${url} (auto-open failed, please open manually)`);
      }
    }
    
    return url;
  }
  
  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    // Stop all file watchers
    this.sessionManager.unwatchAll();
    
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.error('HTTP server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
  
  /**
   * Get the current port
   */
  getPort(): number {
    return this.port;
  }
}

