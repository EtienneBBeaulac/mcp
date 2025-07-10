/// <reference types="node" />

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import readline from 'readline';
import { trackResource, untrackResource } from '../setup';

type Pending = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
  timer: NodeJS.Timeout;
};

export class RpcClient {
  private proc: ChildProcessWithoutNullStreams;
  private rl: readline.Interface;
  private nextId = 1;
  private pending = new Map<string | number, Pending>();
  private closed = false;
  private cleanupFn: () => Promise<void>;

  constructor(scriptPath: string) {
    const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    this.proc = spawn(runner, ['ts-node', '--transpile-only', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'], // all piped to satisfy typings; stderr will pipe to main process stderr implicitly
      env: {
        ...process.env,
        NODE_ENV: 'integration'
      }
    });

    if (!this.proc.stdout) {
      throw new Error('Failed to access stdout of child process');
    }

    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.rl.on('line', (line) => this.handleLine(line));
    
    // Handle process errors
    this.proc.on('error', (error) => {
      console.error('RPC Client process error:', error);
      this.cleanup();
    });

    // Create cleanup function and track it
    this.cleanupFn = async () => {
      if (!this.closed) {
        await this.close();
      }
    };
    trackResource(this.cleanupFn);
  }

  private handleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) return; // skip log lines
    let msg: any;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return; // ignore non-JSON lines
    }
    const id = msg.id as number | string | null;
    if (id === null || typeof id === 'undefined') {
      // Notifications / parse errors – expose via event later if needed
      return;
    }
    const pending = this.pending.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(msg);
      this.pending.delete(id);
    }
  }

  async send(method: string, params: any = {}): Promise<any> {
    if (this.closed) {
      throw new Error('RPC Client is closed');
    }
    
    const id = this.nextId++;
    const request = { jsonrpc: '2.0', id, method, params };
    const payload = JSON.stringify(request) + '\n';
    
    const promise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout for id ${id}`));
        }
      }, 5000);
      
      this.pending.set(id, { resolve, reject, timer });
    });
    
    try {
      this.proc.stdin.write(payload);
    } catch (error) {
      const pending = this.pending.get(id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(id);
      }
      throw error;
    }
    
    return promise;
  }

  sendRaw(rawLine: string): void {
    if (this.closed) {
      throw new Error('RPC Client is closed');
    }
    this.proc.stdin.write(rawLine + '\n');
  }

  private cleanup(): void {
    // Clear timers and reject all pending requests
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`RPC Client closed, request ${id} cancelled`));
    }
    this.pending.clear();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    
    this.closed = true;
    
    // Cleanup pending requests and clear timers
    this.cleanup();
    
    // Close readline interface
    this.rl.close();
    
    // Send termination signal and wait for process to exit
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Force kill if process doesn't exit gracefully
        this.proc.kill('SIGKILL');
        reject(new Error('RPC Client process did not exit gracefully'));
      }, 3000);
      
      this.proc.on('exit', (code) => {
        clearTimeout(timeout);
        console.log(`RPC Client process exited with code ${code}`);
        resolve();
      });
      
      this.proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      // Send termination signal
      this.proc.kill('SIGTERM');
    }).finally(() => {
      // Untrack this resource
      untrackResource(this.cleanupFn);
    });
  }
} 