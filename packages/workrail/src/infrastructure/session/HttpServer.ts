import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServerType } from 'http';
import path from 'path';
import { SessionManager } from './SessionManager.js';
import cors from 'cors';
import open from 'open';

export interface ServerConfig {
  port?: number;
  autoOpen?: boolean;
}

/**
 * HttpServer serves the dashboard UI and provides API endpoints for session data.
 * 
 * Routes:
 * - GET / -> Dashboard home page
 * - GET /web/* -> Static dashboard assets
 * - GET /api/sessions -> List all sessions
 * - GET /api/sessions/:workflow/:id -> Get specific session
 * - GET /api/current-project -> Get current project info
 * - GET /api/projects -> List all projects
 * 
 * Features:
 * - Auto-increments port if 3456 is busy
 * - ETag support for efficient polling
 * - CORS enabled for local development
 */
export class HttpServer {
  private app: Application;
  private server: HttpServerType | null = null;
  private port: number;
  private baseUrl: string = '';
  
  constructor(
    private sessionManager: SessionManager,
    private config: ServerConfig = {}
  ) {
    this.port = config.port || 3456;
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
    this.app.use('/web', express.static(webDir));
    
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
    
    // API: List all sessions for current project
    this.app.get('/api/sessions', async (req: Request, res: Response) => {
      try {
        const sessions = await this.sessionManager.listAllSessions();
        res.json({
          success: true,
          count: sessions.length,
          sessions: sessions.map(s => ({
            id: s.id,
            workflowId: s.workflowId,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            url: `/api/sessions/${s.workflowId}/${s.id}`
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
    
    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
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
   * Tries port 3456, increments if busy
   */
  async start(): Promise<string> {
    // Try ports 3456-3499
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
        
        // Print banner
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
    
    throw new Error('No available ports in range 3456-3499');
  }
  
  /**
   * Print startup banner
   */
  private printBanner(): void {
    const line = '═'.repeat(60);
    console.error(`\n${line}`);
    console.error(`🔧 Workrail MCP Server Started`);
    console.error(line);
    console.error(`📊 Dashboard: ${this.baseUrl}`);
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

