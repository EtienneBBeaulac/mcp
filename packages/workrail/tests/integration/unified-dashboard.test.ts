/**
 * Integration Tests: Unified Dashboard
 * 
 * Tests the primary/secondary pattern, lock file management,
 * and multi-instance scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HttpServer } from '../../src/infrastructure/session/HttpServer';
import { SessionManager } from '../../src/infrastructure/session/SessionManager';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Unified Dashboard - Primary/Secondary Pattern', () => {
  const lockFile = path.join(os.homedir(), '.workrail', 'dashboard.lock');
  let servers: HttpServer[] = [];
  
  beforeEach(async () => {
    // Clean up any existing lock file
    await fs.unlink(lockFile).catch(() => {});
    servers = [];
  });
  
  afterEach(async () => {
    // Stop all servers
    for (const server of servers) {
      await server.stop();
    }
    servers = [];
    
    // Clean up lock file
    await fs.unlink(lockFile).catch(() => {});
  });
  
  it('should elect first instance as primary', async () => {
    const sessionManager = new SessionManager();
    const server = new HttpServer(sessionManager);
    servers.push(server);
    
    const url = await server.start();
    
    expect(url).toBe('http://localhost:3456');
    expect(server.getPort()).toBe(3456);
    
    // Check lock file was created
    const lockExists = await fs.access(lockFile).then(() => true).catch(() => false);
    expect(lockExists).toBe(true);
    
    // Check lock file content
    const lockData = JSON.parse(await fs.readFile(lockFile, 'utf-8'));
    expect(lockData.port).toBe(3456);
    expect(lockData.pid).toBe(process.pid);
  });
  
  it('should make second instance secondary', async () => {
    // Start first instance (primary)
    const sessionManager1 = new SessionManager();
    const server1 = new HttpServer(sessionManager1);
    servers.push(server1);
    
    const url1 = await server1.start();
    expect(url1).toBe('http://localhost:3456');
    
    // Start second instance (should be secondary)
    const sessionManager2 = new SessionManager();
    const server2 = new HttpServer(sessionManager2);
    servers.push(server2);
    
    const url2 = await server2.start();
    expect(url2).toBeNull(); // Secondary doesn't start HTTP server
  });
  
  it('should reclaim stale lock from dead process', async () => {
    // Create a stale lock file with a non-existent PID
    const staleLock = {
      pid: 999999, // Invalid PID
      port: 3456,
      startedAt: new Date().toISOString(),
      projectId: 'test',
      projectPath: '/tmp/test'
    };
    
    await fs.mkdir(path.dirname(lockFile), { recursive: true });
    await fs.writeFile(lockFile, JSON.stringify(staleLock));
    
    // Start new instance
    const sessionManager = new SessionManager();
    const server = new HttpServer(sessionManager);
    servers.push(server);
    
    const url = await server.start();
    
    // Should reclaim the lock and become primary
    expect(url).toBe('http://localhost:3456');
    
    // Check lock was updated
    const lockData = JSON.parse(await fs.readFile(lockFile, 'utf-8'));
    expect(lockData.pid).toBe(process.pid);
  });
  
  it('should fall back to legacy mode when port 3456 is occupied', async () => {
    // Create a valid lock for another process (simulate port conflict)
    const conflictLock = {
      pid: process.pid - 1, // Different PID
      port: 3456,
      startedAt: new Date().toISOString(),
      projectId: 'test',
      projectPath: '/tmp/test'
    };
    
    await fs.mkdir(path.dirname(lockFile), { recursive: true });
    await fs.writeFile(lockFile, JSON.stringify(conflictLock));
    
    // Mock a server already running on 3456 by disabling unified dashboard
    const sessionManager = new SessionManager();
    const server = new HttpServer(sessionManager, {
      disableUnifiedDashboard: true // Force legacy mode
    });
    servers.push(server);
    
    const url = await server.start();
    
    // Should fall back to port 3457
    expect(url).toBe('http://localhost:3457');
    expect(server.getPort()).toBe(3457);
  });
  
  it('should clean up lock file on graceful shutdown', async () => {
    const sessionManager = new SessionManager();
    const server = new HttpServer(sessionManager);
    servers.push(server);
    
    await server.start();
    
    // Verify lock exists
    const lockExists = await fs.access(lockFile).then(() => true).catch(() => false);
    expect(lockExists).toBe(true);
    
    // Stop server
    await server.stop();
    
    // Lock should be removed
    // Note: This might be async, so give it a moment
    await new Promise(resolve => setTimeout(resolve, 100));
    const lockAfterStop = await fs.access(lockFile).then(() => true).catch(() => false);
    expect(lockAfterStop).toBe(false);
  });
});

describe('Unified Dashboard - API Endpoints', () => {
  let server: HttpServer;
  let sessionManager: SessionManager;
  
  beforeEach(async () => {
    sessionManager = new SessionManager();
    server = new HttpServer(sessionManager);
    await server.start();
  });
  
  afterEach(async () => {
    await server.stop();
    const lockFile = path.join(os.homedir(), '.workrail', 'dashboard.lock');
    await fs.unlink(lockFile).catch(() => {});
  });
  
  it('should return unified flag in sessions API when primary', async () => {
    const response = await fetch('http://localhost:3456/api/sessions');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.unified).toBe(true); // Primary serves unified view
    expect(Array.isArray(data.sessions)).toBe(true);
  });
  
  it('should return isPrimary flag in health check', async () => {
    const response = await fetch('http://localhost:3456/api/health');
    const data = await response.json();
    
    expect(data.status).toBe('healthy');
    expect(data.isPrimary).toBe(true);
    expect(data.pid).toBe(process.pid);
    expect(data.port).toBe(3456);
  });
  
  it('should serve static dashboard files', async () => {
    const response = await fetch('http://localhost:3456/');
    const html = await response.text();
    
    expect(response.status).toBe(200);
    expect(html).toContain('Workrail Dashboard');
  });
});













