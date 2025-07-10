/// <reference types="node" />

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import readline from 'readline';
import path from 'path';

type Pending = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
};

export class RpcClient {
  private proc: ChildProcessWithoutNullStreams;
  private rl: readline.Interface;
  private nextId = 1;
  private pending = new Map<string | number, Pending>();

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
      pending.resolve(msg);
      this.pending.delete(id);
    }
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = this.nextId++;
    const request = { jsonrpc: '2.0', id, method, params };
    const payload = JSON.stringify(request) + '\n';
    const promise = new Promise<any>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // maybe add timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout for id ${id}`));
        }
      }, 5000);
    });
    this.proc.stdin.write(payload);
    return promise;
  }

  sendRaw(rawLine: string): void {
    this.proc.stdin.write(rawLine + '\n');
  }

  async close(): Promise<void> {
    this.rl.close();
    this.proc.kill();
  }
} 