/**
 * Unit Tests: Git Worktree Support
 * 
 * Tests that SessionManager correctly detects Git repository roots
 * and handles worktrees properly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/infrastructure/session/SessionManager';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Git Worktree Support', () => {
  let tempDir: string;
  let mainRepo: string;
  let worktree1: string;
  let worktree2: string;
  
  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = path.join(os.tmpdir(), `workrail-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    mainRepo = path.join(tempDir, 'main-repo');
    worktree1 = path.join(tempDir, 'worktree-feature');
    worktree2 = path.join(tempDir, 'worktree-hotfix');
    
    // Initialize main repository
    await fs.mkdir(mainRepo);
    execSync('git init', { cwd: mainRepo, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: mainRepo, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: mainRepo, stdio: 'ignore' });
    
    // Create initial commit
    await fs.writeFile(path.join(mainRepo, 'README.md'), '# Test');
    execSync('git add .', { cwd: mainRepo, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: mainRepo, stdio: 'ignore' });
    
    // Create worktrees
    execSync(`git worktree add ${worktree1} -b feature`, { cwd: mainRepo, stdio: 'ignore' });
    execSync(`git worktree add ${worktree2} -b hotfix`, { cwd: mainRepo, stdio: 'ignore' });
  });
  
  afterEach(async () => {
    // Clean up
    try {
      // Remove worktrees
      execSync('git worktree prune', { cwd: mainRepo, stdio: 'ignore' });
      
      // Remove temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  it('should use same project ID for main repo and worktrees', () => {
    const sm1 = new SessionManager(mainRepo);
    const sm2 = new SessionManager(worktree1);
    const sm3 = new SessionManager(worktree2);
    
    const projectId1 = sm1.getProjectId();
    const projectId2 = sm2.getProjectId();
    const projectId3 = sm3.getProjectId();
    
    // All should have the same project ID
    expect(projectId1).toBe(projectId2);
    expect(projectId2).toBe(projectId3);
  });
  
  it('should resolve all worktrees to main repo path', () => {
    const sm1 = new SessionManager(mainRepo);
    const sm2 = new SessionManager(worktree1);
    const sm3 = new SessionManager(worktree2);
    
    const path1 = sm1.getProjectPath();
    const path2 = sm2.getProjectPath();
    const path3 = sm3.getProjectPath();
    
    // All should resolve to main repo path
    expect(path1).toBe(mainRepo);
    expect(path2).toBe(mainRepo);
    expect(path3).toBe(mainRepo);
  });
  
  it('should handle non-Git directories gracefully', () => {
    const nonGitDir = path.join(tempDir, 'non-git');
    fs.mkdir(nonGitDir, { recursive: true });
    
    const sm = new SessionManager(nonGitDir);
    
    // Should use the directory path directly
    const projectPath = sm.getProjectPath();
    expect(projectPath).toBe(nonGitDir);
  });
  
  it('should generate deterministic project IDs', () => {
    const sm1 = new SessionManager(mainRepo);
    const sm2 = new SessionManager(mainRepo);
    
    // Same path should always generate same ID
    expect(sm1.getProjectId()).toBe(sm2.getProjectId());
  });
  
  it('should generate different project IDs for different repos', () => {
    const otherRepo = path.join(tempDir, 'other-repo');
    fs.mkdir(otherRepo, { recursive: true });
    
    const sm1 = new SessionManager(mainRepo);
    const sm2 = new SessionManager(otherRepo);
    
    // Different paths should generate different IDs
    expect(sm1.getProjectId()).not.toBe(sm2.getProjectId());
  });
});

describe('SessionManager - Project ID Generation', () => {
  it('should resolve relative paths to absolute', () => {
    const sm1 = new SessionManager('.');
    const sm2 = new SessionManager(process.cwd());
    
    // Both should resolve to the same absolute path
    expect(sm1.getProjectPath()).toBe(sm2.getProjectPath());
    expect(sm1.getProjectId()).toBe(sm2.getProjectId());
  });
  
  it('should normalize paths with trailing slashes', () => {
    const testPath = '/tmp/test-project';
    
    const sm1 = new SessionManager(testPath);
    const sm2 = new SessionManager(testPath + '/');
    
    // Should generate same project ID regardless of trailing slash
    expect(sm1.getProjectId()).toBe(sm2.getProjectId());
  });
  
  it('should generate 12-character hex project IDs', () => {
    const sm = new SessionManager('/tmp/test');
    const projectId = sm.getProjectId();
    
    expect(projectId).toMatch(/^[a-f0-9]{12}$/);
    expect(projectId.length).toBe(12);
  });
});













